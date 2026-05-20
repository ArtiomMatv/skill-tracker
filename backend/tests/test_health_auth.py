"""Health and optional auth API."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test.utils import override_settings


@pytest.mark.django_db
def test_healthz(client) -> None:
    r = client.get("/healthz/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.django_db
def test_require_auth_blocks_graphql(settings, graphql_client) -> None:
    settings.REQUIRE_AUTH = True
    r = graphql_client.post(
        "/graphql/",
        data=json.dumps({"query": "{ allData { employees { id } } }"}),
        content_type="application/json",
    )
    assert r.status_code == 401
    body = r.json()
    assert body.get("errors")


@pytest.mark.django_db
def test_require_auth_allows_session(settings, graphql_client) -> None:
    settings.REQUIRE_AUTH = True
    User = get_user_model()
    User.objects.create_user(username="u1", password="pw-test-12")
    login_r = graphql_client.post(
        "/api/auth/login/",
        data=json.dumps({"username": "u1", "password": "pw-test-12"}),
        content_type="application/json",
    )
    assert login_r.status_code == 200
    assert login_r.json()["ok"] is True
    r = graphql_client.post(
        "/graphql/",
        data=json.dumps({"query": "{ allData { employees { id } } }"}),
        content_type="application/json",
    )
    assert "errors" not in r.json()


@pytest.mark.django_db
def test_auth_me_register_available_matches_debug(settings, graphql_client) -> None:
    me = graphql_client.get("/api/auth/me/")
    assert me.status_code == 200
    body = me.json()
    assert body["authenticated"] is False
    assert body["registerAvailable"] == bool(settings.DEBUG or settings.ALLOW_REGISTER)
    assert body["requireAuth"] is settings.REQUIRE_AUTH


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_register_accepts_dev_password(graphql_client) -> None:
    r = graphql_client.post(
        "/api/auth/register/",
        data=json.dumps(
            {
                "username": "devuser2",
                "password": "short",
                "passwordConfirm": "short",
            }
        ),
        content_type="application/json",
    )
    assert r.status_code == 400
    assert "8" in r.json()["error"]

    r2 = graphql_client.post(
        "/api/auth/register/",
        data=json.dumps(
            {
                "username": "devuser2",
                "password": "Local-only-Auth-2026!",
                "passwordConfirm": "Local-only-Auth-2026!",
            }
        ),
        content_type="application/json",
    )
    assert r2.status_code == 200


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_register_creates_user_and_logs_in(graphql_client) -> None:
    r = graphql_client.post(
        "/api/auth/register/",
        data=json.dumps(
            {
                "username": "newbie",
                "password": "Local-only-Auth-2026!",
                "passwordConfirm": "Local-only-Auth-2026!",
            }
        ),
        content_type="application/json",
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True
    me = graphql_client.get("/api/auth/me/")
    assert me.status_code == 200
    assert me.json()["authenticated"] is True
    assert me.json()["username"] == "newbie"


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_register_duplicate_username(graphql_client) -> None:
    User = get_user_model()
    User.objects.create_user(username="taken", password="pw-test-12")
    r = graphql_client.post(
        "/api/auth/register/",
        data=json.dumps(
            {
                "username": "Taken",
                "password": "Local-only-Auth-2026!",
                "passwordConfirm": "Local-only-Auth-2026!",
            }
        ),
        content_type="application/json",
    )
    assert r.status_code == 409


@pytest.mark.django_db
def test_register_forbidden_when_disabled(settings, graphql_client) -> None:
    settings.DEBUG = False
    settings.ALLOW_REGISTER = False
    r = graphql_client.post(
        "/api/auth/register/",
        data=json.dumps(
            {
                "username": "x",
                "password": "Local-only-Auth-2026!",
                "passwordConfirm": "Local-only-Auth-2026!",
            }
        ),
        content_type="application/json",
    )
    assert r.status_code == 403
    assert r.json()["error"] == "Registration disabled"
