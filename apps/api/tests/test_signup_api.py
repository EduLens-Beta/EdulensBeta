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
