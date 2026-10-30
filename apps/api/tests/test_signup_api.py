import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.database import get_engine
from app.main import app
from app.models import User
from app.security import verify_password


@pytest.fixture
def signup_context():
    if os.environ.get("EDULENS_RUN_DB_TESTS") != "1":
        pytest.skip("Set EDULENS_RUN_DB_TESTS=1 to run PostgreSQL API tests.")

    engine = get_engine()
    if not (engine.url.database or "").endswith(("_test", "_ci")):
        pytest.fail("API tests require a database ending in _test or _ci.")

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


def signup_payload():
    return {
        "name": "  Test Student  ",
        "email": f"signup-{uuid4().hex}@example.com",
        "password": "Example signup password!",
    }


def test_signup_saves_hashed_password_and_returns_public_fields(signup_context):
    client, session = signup_context
    payload = signup_payload()

    response = client.post("/auth/signup", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "name", "email", "created_at"}
    assert body["name"] == "Test Student"
    assert payload["password"] not in response.text

    user = session.get(User, UUID(body["id"]))
    assert user is not None
    assert user.email == payload["email"]
    assert user.password_hash != payload["password"]
    assert verify_password(payload["password"], user.password_hash)
    assert user.password_hash not in response.text


def test_duplicate_email_is_rejected_and_next_signup_still_works(signup_context):
    client, session = signup_context
    payload = signup_payload()

    assert client.post("/auth/signup", json=payload).status_code == 201

    duplicate = dict(payload)
    duplicate["email"] = payload["email"].upper()
    response = client.post("/auth/signup", json=duplicate)

    assert response.status_code == 409
    assert payload["password"] not in response.text

    assert client.post(
        "/auth/signup", json=signup_payload()
    ).status_code == 201

    count = session.scalar(
        select(func.count()).select_from(User).where(
            User.email == payload["email"]
        )
    )
    assert count == 1


@pytest.mark.parametrize(
    "changes",
    [
        {"email": "invalid-email"},
        {"password": "short-secret"},
        {"is_active": False},
    ],
)
def test_invalid_signup_is_rejected_without_saving_user(
    signup_context, changes
):
    client, session = signup_context
    payload = signup_payload()
    email = payload["email"]
    payload.update(changes)

    response = client.post("/auth/signup", json=payload)

    assert response.status_code == 422
    assert payload["password"] not in response.text
    assert session.scalar(
        select(func.count()).select_from(User).where(User.email == email)
    ) == 0


def test_login_creates_session_with_hashed_token(signup_context):
    from datetime import datetime, UTC, timedelta

    from app.auth.tokens import hash_session_token
    from app.models import AuthSession

    client, session = signup_context
    payload = signup_payload()
    account = client.post("/auth/signup", json=payload).json()
    before = datetime.now(UTC)

    response = client.post(
        "/auth/login",
        json={
            "email": payload["email"].upper(),
            "password": payload["password"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    token = body["session_token"]
    assert len(token) == 43
    assert body["user"] == {**account, "is_admin": False}
    assert payload["password"] not in response.text

    stored = session.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == hash_session_token(token)
        )
    )
    assert stored is not None
    assert stored.user_id == UUID(account["id"])
    assert stored.token_hash != token
    assert stored.revoked_at is None
    assert before + timedelta(hours=24) <= stored.expires_at
    assert stored.expires_at <= datetime.now(UTC) + timedelta(hours=24)
    assert stored.token_hash not in response.text


@pytest.mark.parametrize("case", ["wrong_password", "unknown_email", "inactive"])
def test_invalid_login_returns_generic_error_without_session(
    signup_context, case
):
    from app.models import AuthSession

    client, session = signup_context
    payload = signup_payload()
    account = client.post("/auth/signup", json=payload).json()

    if case == "inactive":
        with session.begin():
            user = session.get(User, UUID(account["id"]))
            user.is_active = False

    credentials = {
        "email": payload["email"],
        "password": payload["password"],
    }
    if case == "wrong_password":
        credentials["password"] = "An incorrect password!"
    elif case == "unknown_email":
        credentials["email"] = f"missing-{uuid4().hex}@example.com"

    response = client.post("/auth/login", json=credentials)

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password."}
    assert credentials["password"] not in response.text
    assert session.scalar(
        select(func.count()).select_from(AuthSession).where(
            AuthSession.user_id == UUID(account["id"])
        )
    ) == 0


def test_me_returns_signed_in_account(signup_context):
    client, session = signup_context
    payload = signup_payload()
    account = client.post("/auth/signup", json=payload).json()
    login = client.post(
        "/auth/login",
        json={
            "email": payload["email"],
            "password": payload["password"],
        },
    )
    assert login.status_code == 200
    token = login.json()["session_token"]

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {**account, "is_admin": False}
    assert token not in response.text
    assert payload["password"] not in response.text


@pytest.mark.parametrize(
    "case",
    ["missing", "malformed", "unknown", "expired", "revoked", "inactive"],
)
def test_me_rejects_invalid_sessions(signup_context, case):
    from datetime import UTC, datetime, timedelta

    from app.auth.tokens import hash_session_token
    from app.models import AuthSession

    client, session = signup_context
    payload = signup_payload()
    account = client.post("/auth/signup", json=payload).json()
    login = client.post(
        "/auth/login",
        json={
            "email": payload["email"],
            "password": payload["password"],
        },
    )
    assert login.status_code == 200
    token = login.json()["session_token"]

    with session.begin():
        stored = session.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == hash_session_token(token)
            )
        )
        assert stored is not None
        now = datetime.now(UTC)

        if case == "expired":
            stored.created_at = now - timedelta(days=2)
            stored.expires_at = now - timedelta(days=1)
        elif case == "revoked":
            stored.revoked_at = now
        elif case == "inactive":
            user = session.get(User, UUID(account["id"]))
            assert user is not None
            user.is_active = False

    headers = {"Authorization": f"Bearer {token}"}
    if case == "missing":
        headers = {}
    elif case == "malformed":
        headers = {"Authorization": "Bearer malformed-token"}
    elif case == "unknown":
        headers = {"Authorization": "Bearer " + "a" * 43}

    response = client.get("/auth/me", headers=headers)

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}
    assert response.headers["www-authenticate"] == "Bearer"
    assert token not in response.text


def test_logout_revokes_only_current_session(signup_context):
    from app.auth.tokens import hash_session_token
    from app.models import AuthSession

    client, session = signup_context
    payload = signup_payload()
    client.post("/auth/signup", json=payload)
    credentials = {
        "email": payload["email"],
        "password": payload["password"],
    }

    first = client.post("/auth/login", json=credentials)
    second = client.post("/auth/login", json=credentials)
    assert first.status_code == second.status_code == 200

    first_token = first.json()["session_token"]
    second_token = second.json()["session_token"]
    assert first_token != second_token

    first_headers = {"Authorization": f"Bearer {first_token}"}
    second_headers = {"Authorization": f"Bearer {second_token}"}

    assert client.get("/auth/me", headers=first_headers).status_code == 200

    response = client.post("/auth/logout", headers=first_headers)
    assert response.status_code == 204
    assert response.content == b""
    assert response.headers["cache-control"] == "no-store"

    assert client.get("/auth/me", headers=first_headers).status_code == 401
    assert client.get("/auth/me", headers=second_headers).status_code == 200

    assert client.post(
        "/auth/logout", headers=first_headers
    ).status_code == 204

    stored = session.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == hash_session_token(first_token)
        )
    )
    assert stored is not None
    assert stored.revoked_at is not None


@pytest.mark.parametrize(
    "authorization",
    [None, "Bearer malformed", "Basic abc", "Bearer " + "a" * 43],
)
def test_logout_without_valid_session_is_safe(
    signup_context, authorization
):
    client, session = signup_context
    headers = (
        {"Authorization": authorization}
        if authorization is not None else {}
    )

    response = client.post("/auth/logout", headers=headers)

    assert response.status_code == 204
    assert response.content == b""


def test_auth_success_responses_are_not_cached(signup_context):
    client, session = signup_context
    payload = signup_payload()

    signup = client.post("/auth/signup", json=payload)
    assert signup.status_code == 201
    assert signup.headers["cache-control"] == "no-store"

    login = client.post(
        "/auth/login",
        json={
            "email": payload["email"],
            "password": payload["password"],
        },
    )
    assert login.status_code == 200
    assert login.headers["cache-control"] == "no-store"

    headers = {
        "Authorization": f"Bearer {login.json()['session_token']}"
    }
    account = client.get("/auth/me", headers=headers)
    assert account.status_code == 200
    assert account.headers["cache-control"] == "no-store"

    logout = client.post("/auth/logout", headers=headers)
    assert logout.status_code == 204
    assert logout.headers["cache-control"] == "no-store"
