"""Tests for ``tracker.schema`` GraphQL API."""

import json
from datetime import date

import pytest

from tracker.models import Assessment, Employee, Skill


def _graphql(graphql_client, query: str, variables: dict | None = None):
    body: dict = {"query": query}
    if variables is not None:
        body["variables"] = variables
    return graphql_client.post(
        "/graphql/",
        data=json.dumps(body),
        content_type="application/json",
    )


@pytest.mark.django_db
def test_all_data_empty(graphql_client) -> None:
    r = _graphql(
        graphql_client,
        "{ allData { employees { id name } skills { id name } } }",
    )
    assert r.status_code == 200
    payload = r.json()
    assert "errors" not in payload
    data = payload["data"]["allData"]
    assert data["employees"] == []
    assert data["skills"] == []


@pytest.mark.django_db
def test_all_data_returns_records(graphql_client) -> None:
    emp = Employee.objects.create(name="Ada")
    skill = Skill.objects.create(name="GraphQL")
    Assessment.objects.create(
        employee=emp, skill=skill, score=4, date=date(2026, 5, 1)
    )
    r = _graphql(
        graphql_client,
        "{ allData { employees { id name } skills { id name } } }",
    )
    assert r.status_code == 200
    payload = r.json()
    assert "errors" not in payload
    ad = payload["data"]["allData"]
    assert len(ad["employees"]) == 1
    assert ad["employees"][0]["name"] == "Ada"
    assert len(ad["skills"]) == 1
    assert ad["skills"][0]["name"] == "GraphQL"


@pytest.mark.django_db
def test_matrix_cells_aggregate(graphql_client) -> None:
    emp = Employee.objects.create(name="E1")
    sk = Skill.objects.create(name="S1")
    Assessment.objects.create(employee=emp, skill=sk, score=2, date=date(2026, 1, 1))
    Assessment.objects.create(employee=emp, skill=sk, score=4, date=date(2026, 1, 2))
    r = _graphql(
        graphql_client,
        "{ matrixCells { employeeId skillId average count } }",
    )
    assert r.status_code == 200
    cells = r.json()["data"]["matrixCells"]
    assert len(cells) == 1
    assert cells[0]["employeeId"] == emp.pk
    assert cells[0]["skillId"] == sk.pk
    assert cells[0]["count"] == 2
    assert abs(cells[0]["average"] - 3.0) < 0.001


@pytest.mark.django_db
def test_matrix_cells_excludes_soft_deleted(graphql_client) -> None:
    from django.utils import timezone

    emp = Employee.objects.create(name="E2")
    sk = Skill.objects.create(name="S2")
    a = Assessment.objects.create(employee=emp, skill=sk, score=5, date=date(2026, 2, 1))
    a.deleted_at = timezone.now()
    a.save()
    r = _graphql(graphql_client, "{ matrixCells { employeeId } }")
    assert r.json()["data"]["matrixCells"] == []


@pytest.mark.django_db
def test_assessments_pagination_and_filter(graphql_client) -> None:
    emp = Employee.objects.create(name="P")
    sk = Skill.objects.create(name="K")
    Assessment.objects.create(employee=emp, skill=sk, score=5, date=date(2026, 3, 1))
    Assessment.objects.create(employee=emp, skill=sk, score=2, date=date(2026, 3, 2))
    r = _graphql(
        graphql_client,
        """
        query {
          assessments(limit: 1, offset: 0, order: DATE_DESC) {
            totalCount
            items { id score date }
          }
        }
        """,
    )
    body = r.json()
    assert "errors" not in body
    page = body["data"]["assessments"]
    assert page["totalCount"] == 2
    assert len(page["items"]) == 1
    assert page["items"][0]["score"] == 2

    r2 = _graphql(
        graphql_client,
        """
        query($e: Int!) {
          assessments(limit: 10, offset: 0, employeeId: $e, scoreLt: 3) {
            totalCount
            items { score }
          }
        }
        """,
        variables={"e": emp.pk},
    )
    p2 = r2.json()["data"]["assessments"]
    assert p2["totalCount"] == 1
    assert p2["items"][0]["score"] == 2


@pytest.mark.django_db
def test_add_assessment_success(graphql_client) -> None:
    emp = Employee.objects.create(name="Bob")
    skill = Skill.objects.create(name="Django")
    mutation = """
        mutation($e: Int!, $s: Int!, $sc: Int!, $d: Date!) {
          addAssessment(employeeId: $e, skillId: $s, score: $sc, date: $d) {
            ok
            error
            assessment { id score }
          }
        }
    """
    r = _graphql(
        graphql_client,
        mutation,
        variables={
            "e": emp.pk,
            "s": skill.pk,
            "sc": 5,
            "d": "2026-05-13",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert "errors" not in body
    res = body["data"]["addAssessment"]
    assert res["ok"] is True
    assert res["error"] is None
    assert res["assessment"] is not None
    assert res["assessment"]["score"] == 5
    assert Assessment.objects.filter(deleted_at__isnull=True).count() == 1


@pytest.mark.django_db
def test_add_assessment_unknown_employee(graphql_client) -> None:
    skill = Skill.objects.create(name="X")
    r = _graphql(
        graphql_client,
        """
        mutation {
          addAssessment(employeeId: 99999, skillId: %d, score: 3, date: "2026-01-01") {
            ok
            error
          }
        }
        """
        % skill.pk,
    )
    assert r.status_code == 200
    res = r.json()["data"]["addAssessment"]
    assert res["ok"] is False
    assert "not found" in res["error"]


@pytest.mark.django_db
def test_add_assessment_invalid_score_returns_error(graphql_client) -> None:
    emp = Employee.objects.create(name="C")
    skill = Skill.objects.create(name="Y")
    r = _graphql(
        graphql_client,
        """
        mutation {
          addAssessment(employeeId: %d, skillId: %d, score: 99, date: "2026-01-01") {
            ok
            error
          }
        }
        """
        % (emp.pk, skill.pk),
    )
    assert r.status_code == 200
    res = r.json()["data"]["addAssessment"]
    assert res["ok"] is False
    assert res["error"] is not None


@pytest.mark.django_db
def test_update_assessment(graphql_client) -> None:
    emp = Employee.objects.create(name="U")
    sk = Skill.objects.create(name="V")
    a = Assessment.objects.create(employee=emp, skill=sk, score=3, date=date(2026, 4, 1))
    r = _graphql(
        graphql_client,
        """
        mutation {
          updateAssessment(assessmentId: %d, score: 4, date: "2026-04-02", notes: "ok") {
            ok
            error
            assessment { score notes }
          }
        }
        """
        % a.pk,
    )
    res = r.json()["data"]["updateAssessment"]
    assert res["ok"] is True
    assert res["assessment"]["score"] == 4
    assert res["assessment"]["notes"] == "ok"
    a.refresh_from_db()
    assert a.score == 4


@pytest.mark.django_db
def test_add_employee_success(graphql_client) -> None:
    r = _graphql(
        graphql_client,
        'mutation { addEmployee(name: "  Nadia  ") { ok error employee { id name } } }',
    )
    assert r.status_code == 200
    body = r.json()
    assert "errors" not in body
    res = body["data"]["addEmployee"]
    assert res["ok"] is True
    assert res["employee"]["name"] == "Nadia"
    assert Employee.objects.count() == 1


@pytest.mark.django_db
def test_add_employee_empty_name(graphql_client) -> None:
    r = _graphql(
        graphql_client,
        'mutation { addEmployee(name: "   ") { ok error employee { id } } }',
    )
    res = r.json()["data"]["addEmployee"]
    assert res["ok"] is False
    assert Employee.objects.count() == 0


@pytest.mark.django_db
def test_add_skill_success(graphql_client) -> None:
    r = _graphql(
        graphql_client,
        'mutation { addSkill(name: "Compliance") { ok error skill { id name } } }',
    )
    assert r.status_code == 200
    res = r.json()["data"]["addSkill"]
    assert res["ok"] is True
    assert res["skill"]["name"] == "Compliance"
    assert Skill.objects.count() == 1


@pytest.mark.django_db
def test_delete_assessment_soft_delete(graphql_client) -> None:
    emp = Employee.objects.create(name="Del")
    skill = Skill.objects.create(name="S")
    a = Assessment.objects.create(
        employee=emp, skill=skill, score=4, date=date(2026, 6, 1)
    )
    r = _graphql(
        graphql_client,
        """
        mutation {
          deleteAssessment(assessmentId: %d) { ok error }
        }
        """
        % a.pk,
    )
    assert r.status_code == 200
    res = r.json()["data"]["deleteAssessment"]
    assert res["ok"] is True
    a.refresh_from_db()
    assert a.deleted_at is not None
    assert Assessment.objects.filter(pk=a.pk).count() == 1


@pytest.mark.django_db
def test_restore_and_finalize_delete(graphql_client) -> None:
    from django.utils import timezone

    emp = Employee.objects.create(name="R")
    skill = Skill.objects.create(name="T")
    a = Assessment.objects.create(
        employee=emp, skill=skill, score=3, date=date(2026, 7, 1)
    )
    a.deleted_at = timezone.now()
    a.save()
    r = _graphql(
        graphql_client,
        """
        mutation {
          restoreAssessment(assessmentId: %d) { ok error }
        }
        """
        % a.pk,
    )
    assert r.json()["data"]["restoreAssessment"]["ok"] is True
    a.refresh_from_db()
    assert a.deleted_at is None

    a.deleted_at = timezone.now()
    a.save()
    r2 = _graphql(
        graphql_client,
        """
        mutation {
          finalizeDeleteAssessment(assessmentId: %d) { ok error }
        }
        """
        % a.pk,
    )
    assert r2.json()["data"]["finalizeDeleteAssessment"]["ok"] is True
    assert Assessment.objects.filter(pk=a.pk).count() == 0


@pytest.mark.django_db
def test_delete_assessment_not_found(graphql_client) -> None:
    r = _graphql(
        graphql_client,
        'mutation { deleteAssessment(assessmentId: 999999) { ok error } }',
    )
    res = r.json()["data"]["deleteAssessment"]
    assert res["ok"] is False
    assert "not found" in res["error"].lower()


@pytest.mark.django_db
def test_bulk_import_assessments(graphql_client) -> None:
    emp = Employee.objects.create(name="B1")
    sk = Skill.objects.create(name="K1")
    r = _graphql(
        graphql_client,
        """
        mutation {
          bulkImportAssessments(rows: [
            { employeeId: %d, skillId: %d, score: 3, date: "2026-08-01" }
          ]) { ok createdCount error }
        }
        """
        % (emp.pk, sk.pk),
    )
    res = r.json()["data"]["bulkImportAssessments"]
    assert res["ok"] is True
    assert res["createdCount"] == 1
    assert Assessment.objects.filter(deleted_at__isnull=True).count() == 1
