import os
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.database import get_engine
from app.main import app
from app.models import AuthSession, User


@pytest.fixture
def admin_context():
    if os.environ.get("EDULENS_RUN_DB_TESTS") != "1":
        pytest.skip("Set EDULENS_RUN_DB_TESTS=1 to run PostgreSQL tests.")

    engine = get_engine()
    if not (engine.url.database or "").endswith(("_test", "_ci")):
        pytest.fail("Tests require a database ending in _test or _ci.")

    with engine.connect() as connection:
        transaction = connection.begin()
        session = Session(
            bind=connection,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        )

        def override_db():
            yield session

        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                yield client, session
        finally:
            app.dependency_overrides.pop(get_db, None)
            session.close()
            transaction.rollback()


def create_account(client, session, *, admin=False):
    payload = {
        "name": "Admin Test Account",
        "email": f"admin-test-{uuid4().hex}@example.com",
        "password": "Example admin test password!",
    }
    signup = client.post("/auth/signup", json=payload)
    assert signup.status_code == 201

    user = session.get(User, UUID(signup.json()["id"]))
    assert user is not None
    assert user.is_admin is False

    if admin:
        user.is_admin = True
    session.commit()

    login = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login.status_code == 200
    assert login.json()["user"]["is_admin"] is admin
    token = login.json()["session_token"]
    return user, {"Authorization": f"Bearer {token}"}, token


@pytest.mark.parametrize("authorization", [None, "Bearer invalid"])
def test_admin_list_requires_login(admin_context, authorization):
    client, _ = admin_context
    headers = {"Authorization": authorization} if authorization else {}

    response = client.get("/admin/accounts", headers=headers)

    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"
    assert "accounts" not in response.json()


def test_ordinary_account_cannot_read_admin_list(admin_context):
    client, session = admin_context
    _, headers, _ = create_account(client, session)

    response = client.get("/admin/accounts", headers=headers)

    assert response.status_code == 403
    assert response.headers["cache-control"] == "no-store"
    assert "accounts" not in response.json()


def test_signup_cannot_grant_admin_access(admin_context):
    client, session = admin_context
    email = f"admin-injection-{uuid4().hex}@example.com"

    response = client.post(
        "/auth/signup",
        json={
            "name": "Test Student",
            "email": email,
            "password": "Example signup password!",
            "is_admin": True,
        },
    )

    assert response.status_code == 422
    assert session.scalar(select(User).where(User.email == email)) is None


def test_admin_can_read_accounts_without_secrets(admin_context):
    client, session = admin_context
    admin, headers, token = create_account(client, session, admin=True)
    student, student_headers, student_token = create_account(client, session)

    assert client.put(
        "/student/profile",
        headers=student_headers,
        json={"education_stage": "class_9_10"},
    ).status_code == 200
    assert client.put(
        "/student/school-details",
        headers=student_headers,
        json={"school_class": 9, "study_group": "science"},
    ).status_code == 200

    response = client.get("/admin/accounts?limit=100", headers=headers)

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert set(body) == {"accounts", "total", "limit", "offset"}
    assert body["total"] >= 2
    assert body["limit"] == 100
    assert body["offset"] == 0

    accounts = {item["id"]: item for item in body["accounts"]}
    row = accounts[str(student.id)]
    assert set(row) == {
        "id", "name", "email", "is_active", "is_admin", "created_at",
        "education_stage", "school_class", "study_group",
    }
    assert row["email"] == student.email
    assert row["is_admin"] is False
    assert row["education_stage"] == "class_9_10"
    assert row["school_class"] == 9
    assert row["study_group"] == "science"

    assert accounts[str(admin.id)]["education_stage"] is None
    for secret in [token, student_token, admin.password_hash, student.password_hash]:
        assert secret not in response.text


def test_admin_list_pagination(admin_context):
    client, session = admin_context
    _, headers, _ = create_account(client, session, admin=True)
    create_account(client, session)
    create_account(client, session)

    first = client.get("/admin/accounts?limit=1&offset=0", headers=headers)
    second = client.get("/admin/accounts?limit=1&offset=1", headers=headers)

    assert first.status_code == second.status_code == 200
    first_body, second_body = first.json(), second.json()
    assert len(first_body["accounts"]) == len(second_body["accounts"]) == 1
    assert first_body["total"] == second_body["total"]
    assert first_body["accounts"][0]["id"] != second_body["accounts"][0]["id"]
    assert second_body["offset"] == 1

    beyond = client.get(
        f"/admin/accounts?offset={first_body['total']}&limit=1",
        headers=headers,
    )
    assert beyond.status_code == 200
    assert beyond.json()["accounts"] == []


@pytest.mark.parametrize(
    "query", ["limit=0", "limit=101", "offset=-1", "limit=invalid"]
)
def test_invalid_admin_pagination_is_rejected(admin_context, query):
    client, session = admin_context
    _, headers, _ = create_account(client, session, admin=True)

    response = client.get(f"/admin/accounts?{query}", headers=headers)

    assert response.status_code == 422
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    ("change", "expected_status"),
    [
        ("permission_removed", 403),
        ("inactive", 401),
        ("revoked", 401),
        ("expired", 401),
    ],
)
def test_admin_access_is_checked_on_every_request(
    admin_context, change, expected_status
):
    client, session = admin_context
    user, headers, _ = create_account(client, session, admin=True)

    assert client.get("/admin/accounts", headers=headers).status_code == 200

    if change == "permission_removed":
        user.is_admin = False
    elif change == "inactive":
        user.is_active = False
    else:
        auth_session = session.scalar(
            select(AuthSession).where(AuthSession.user_id == user.id)
        )
        assert auth_session is not None
        if change == "revoked":
            auth_session.revoked_at = datetime.now(UTC)
        else:
            auth_session.created_at = datetime.now(UTC) - timedelta(days=2)
            auth_session.expires_at = datetime.now(UTC) - timedelta(days=1)

    session.commit()

    response = client.get("/admin/accounts", headers=headers)

    assert response.status_code == expected_status
    assert response.headers["cache-control"] == "no-store"
    assert "accounts" not in response.json()


@pytest.mark.parametrize("admin", [False, True])
def test_account_response_reports_current_admin_permission(admin_context, admin):
    client, session = admin_context
    user, headers, _ = create_account(client, session, admin=admin)

    response = client.get("/auth/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["is_admin"] is admin
    assert response.headers["cache-control"] == "no-store"
    assert user.password_hash not in response.text

    user.is_admin = not admin
    session.commit()

    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_admin"] is not admin
