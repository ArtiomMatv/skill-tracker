"""Tests for ``tracker.schema`` GraphQL API (allData query, addAssessment mutation)."""

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
        "{ allData { employees { id name } skills { id name } assessments { id score } } }",
    )
    assert r.status_code == 200
    payload = r.json()
    assert "errors" not in payload
    data = payload["data"]["allData"]
    assert data["employees"] == []
    assert data["skills"] == []
    assert data["assessments"] == []


@pytest.mark.django_db
def test_all_data_returns_records(graphql_client) -> None:
    emp = Employee.objects.create(name="Ada")
    skill = Skill.objects.create(name="GraphQL")
    Assessment.objects.create(
        employee=emp, skill=skill, score=4, date=date(2026, 5, 1)
    )
    r = _graphql(
        graphql_client,
        "{ allData { employees { id name } skills { id name } "
        "assessments { id score employee { id } skill { id } } } }",
    )
    assert r.status_code == 200
    payload = r.json()
    assert "errors" not in payload
    ad = payload["data"]["allData"]
    assert len(ad["employees"]) == 1
    assert ad["employees"][0]["name"] == "Ada"
    assert len(ad["skills"]) == 1
    assert ad["skills"][0]["name"] == "GraphQL"
    assert len(ad["assessments"]) == 1
    assert ad["assessments"][0]["score"] == 4


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
    assert Assessment.objects.count() == 1


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
def test_delete_assessment_success(graphql_client) -> None:
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
