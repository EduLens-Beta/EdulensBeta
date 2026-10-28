import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.database import get_engine
from app.main import app
from app.models import StudentProfile


@pytest.fixture
def profile_context():
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


def create_account(client):
    payload = {
        "name": "Test Student",
        "email": f"profile-{uuid4().hex}@example.com",
        "password": "Example student password!",
    }
    assert client.post("/auth/signup", json=payload).status_code == 201

    login = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['session_token']}"}


def test_new_account_has_no_education_stage(profile_context):
    client, _ = profile_context
    headers = create_account(client)

    response = client.get("/student/profile", headers=headers)

    assert response.status_code == 200
    assert response.json() == {"education_stage": None}
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    "stage", ["class_6_8", "class_9_10", "college", "university"]
)
def test_each_stage_can_be_saved_and_read(profile_context, stage):
    client, _ = profile_context
    headers = create_account(client)

    saved = client.put(
        "/student/profile",
        headers=headers,
        json={"education_stage": stage},
    )
    assert saved.status_code == 200
    assert saved.json() == {"education_stage": stage}
    assert saved.headers["cache-control"] == "no-store"

    loaded = client.get("/student/profile", headers=headers)
    assert loaded.status_code == 200
    assert loaded.json() == {"education_stage": stage}


def test_selection_can_change_without_creating_another_profile(profile_context):
    client, session = profile_context
    headers = create_account(client)
    before = session.scalar(select(func.count()).select_from(StudentProfile))

    for stage in ["class_6_8", "class_6_8", "college"]:
        response = client.put(
            "/student/profile",
            headers=headers,
            json={"education_stage": stage},
        )
        assert response.status_code == 200

    assert client.get(
        "/student/profile", headers=headers
    ).json() == {"education_stage": "college"}

    after = session.scalar(select(func.count()).select_from(StudentProfile))
    assert after == before + 1


def test_students_have_separate_profiles(profile_context):
    client, _ = profile_context
    first = create_account(client)
    second = create_account(client)

    assert client.put(
        "/student/profile",
        headers=first,
        json={"education_stage": "university"},
    ).status_code == 200

    assert client.get(
        "/student/profile", headers=second
    ).json() == {"education_stage": None}

    assert client.put(
        "/student/profile",
        headers=second,
        json={"education_stage": "class_6_8"},
    ).status_code == 200

    assert client.get(
        "/student/profile", headers=first
    ).json() == {"education_stage": "university"}


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"education_stage": "invalid"},
        {"education_stage": None},
        {"education_stage": "college", "user_id": str(uuid4())},
    ],
)
def test_invalid_payload_does_not_change_selection(profile_context, payload):
    client, _ = profile_context
    headers = create_account(client)

    assert client.put(
        "/student/profile",
        headers=headers,
        json={"education_stage": "university"},
    ).status_code == 200

    response = client.put(
        "/student/profile", headers=headers, json=payload
    )
    assert response.status_code == 422
    assert response.headers["cache-control"] == "no-store"

    assert client.get(
        "/student/profile", headers=headers
    ).json() == {"education_stage": "university"}


@pytest.mark.parametrize("authorization", [None, "Bearer invalid"])
def test_profile_requires_authentication(profile_context, authorization):
    client, _ = profile_context
    headers = {"Authorization": authorization} if authorization else {}

    for method in ["GET", "PUT"]:
        kwargs = (
            {"json": {"education_stage": "college"}}
            if method == "PUT" else {}
        )
        response = client.request(
            method, "/student/profile", headers=headers, **kwargs
        )
        assert response.status_code == 401
        assert response.headers["cache-control"] == "no-store"
