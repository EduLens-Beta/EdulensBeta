import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.database import get_engine
from app.learning.catalog import STEP_IDS
from app.main import app
from app.models import LearningJourney


BASE = "/student/learning/science-explorer"
WORK = "I explored an interest and wrote down what I learned."


@pytest.fixture
def learning_context():
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


def account(client, *, group="science", stage="class_9_10"):
    email = f"learning-{uuid4().hex}@example.com"
    password = "Example learning password!"
    assert client.post(
        "/auth/signup",
        json={"name": "Test Student", "email": email, "password": password},
    ).status_code == 201

    login = client.post(
        "/auth/login", json={"email": email, "password": password}
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['session_token']}"}

    assert client.put(
        "/student/profile",
        headers=headers,
        json={"education_stage": stage},
    ).status_code == 200

    if stage == "class_9_10":
        assert client.put(
            "/student/school-details",
            headers=headers,
            json={"school_class": 9, "study_group": group},
        ).status_code == 200

    return headers


def save(client, headers, step, *, work=WORK, complete=False):
    return client.put(
        f"{BASE}/activities/{step}",
        headers=headers,
        json={"work_text": work, "complete": complete},
    )


def test_reading_does_not_start_journey(learning_context):
    client, session = learning_context
    headers = account(client)
    before = session.scalar(select(func.count()).select_from(LearningJourney))

    response = client.get(BASE, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["started_at"] is None
    assert body["total_xp"] == body["progress_percent"] == 0
    assert body["next_step_id"] == STEP_IDS[0]
    assert len(body["activities"]) == 4
    assert response.headers["cache-control"] == "no-store"
    assert session.scalar(
        select(func.count()).select_from(LearningJourney)
    ) == before


def test_starting_twice_preserves_one_journey(learning_context):
    client, _ = learning_context
    headers = account(client)

    first = client.post(f"{BASE}/start", headers=headers)
    second = client.post(f"{BASE}/start", headers=headers)

    assert first.status_code == second.status_code == 200
    assert first.json()["started_at"] is not None
    assert second.json() == first.json()
    assert second.headers["cache-control"] == "no-store"


def test_draft_is_saved_without_xp(learning_context):
    client, _ = learning_context
    headers = account(client)
    assert client.post(f"{BASE}/start", headers=headers).status_code == 200

    response = save(client, headers, STEP_IDS[0])

    assert response.status_code == 200
    assert response.json()["total_xp"] == 0
    assert response.json()["progress_percent"] == 0

    loaded = client.get(BASE, headers=headers).json()
    assert loaded["activities"][0]["work_text"] == WORK
    assert loaded["activities"][0]["completed_at"] is None


def test_completion_awards_xp_once(learning_context):
    client, _ = learning_context
    headers = account(client)
    assert client.post(f"{BASE}/start", headers=headers).status_code == 200

    first = save(client, headers, STEP_IDS[0], complete=True)
    assert first.status_code == 200
    assert first.json()["total_xp"] == 25
    assert first.json()["progress_percent"] == 25
    assert first.json()["next_step_id"] == STEP_IDS[1]

    repeated = save(
        client, headers, STEP_IDS[0],
        work="A different submission should not replace completed work.",
        complete=True,
    )
    assert repeated.status_code == 200
    assert repeated.json() == first.json()

    assert save(client, headers, STEP_IDS[0]).status_code == 409
    assert client.get(BASE, headers=headers).json()["total_xp"] == 25


def test_all_steps_complete_journey(learning_context):
    client, _ = learning_context
    headers = account(client)
    assert client.post(f"{BASE}/start", headers=headers).status_code == 200

    for index, step in enumerate(STEP_IDS, start=1):
        response = save(client, headers, step, complete=True)
        assert response.status_code == 200
        assert response.json()["total_xp"] == index * 25
        assert response.json()["progress_percent"] == index * 25
        assert response.json()["completed_count"] == index

    assert response.json()["next_step_id"] is None
    assert client.post(
        f"{BASE}/start", headers=headers
    ).json()["progress_percent"] == 100


def test_completion_requires_previous_steps(learning_context):
    client, _ = learning_context
    headers = account(client)
    assert client.post(f"{BASE}/start", headers=headers).status_code == 200

    assert save(
        client, headers, STEP_IDS[1], complete=True
    ).status_code == 409

    body = client.get(BASE, headers=headers).json()
    assert body["total_xp"] == body["completed_count"] == 0


@pytest.mark.parametrize("work", ["", "   ", "Too short"])
def test_completion_requires_work(learning_context, work):
    client, _ = learning_context
    headers = account(client)
    assert client.post(f"{BASE}/start", headers=headers).status_code == 200

    assert save(
        client, headers, STEP_IDS[0], work=work, complete=True
    ).status_code == 422
    assert client.get(BASE, headers=headers).json()["total_xp"] == 0


def test_saving_requires_start(learning_context):
    client, _ = learning_context
    headers = account(client)
    assert save(client, headers, STEP_IDS[0]).status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"work_text": WORK, "complete": True, "awarded_xp": 1000},
        {"work_text": WORK, "complete": "true"},
        {"work_text": "x" * 10001},
    ],
)
def test_invalid_activity_payload_is_rejected(learning_context, payload):
    client, _ = learning_context
    headers = account(client)
    assert client.post(f"{BASE}/start", headers=headers).status_code == 200

    response = client.put(
        f"{BASE}/activities/{STEP_IDS[0]}", headers=headers, json=payload
    )
    assert response.status_code == 422
    assert response.headers["cache-control"] == "no-store"
    assert client.get(BASE, headers=headers).json()["total_xp"] == 0


def test_unknown_step_is_rejected(learning_context):
    client, _ = learning_context
    headers = account(client)
    assert save(client, headers, "unknown-step").status_code == 404


@pytest.mark.parametrize("group", ["business_studies", "humanities"])
def test_other_groups_cannot_start_science_journey(learning_context, group):
    client, _ = learning_context
    headers = account(client, group=group)
    assert client.post(f"{BASE}/start", headers=headers).status_code == 409


def test_other_stage_cannot_start_science_journey(learning_context):
    client, _ = learning_context
    headers = account(client, stage="university")
    assert client.post(f"{BASE}/start", headers=headers).status_code == 409


def test_accounts_have_separate_work_and_xp(learning_context):
    client, _ = learning_context
    first = account(client)
    second = account(client)

    assert client.post(f"{BASE}/start", headers=first).status_code == 200
    assert save(client, first, STEP_IDS[0], complete=True).status_code == 200

    second_body = client.get(BASE, headers=second).json()
    assert second_body["started_at"] is None
    assert second_body["total_xp"] == 0
    assert second_body["activities"][0]["work_text"] == ""
    assert save(client, second, STEP_IDS[0]).status_code == 409

    assert client.post(f"{BASE}/start", headers=second).status_code == 200
    assert save(
        client, second, STEP_IDS[0], work="My own draft."
    ).status_code == 200

    assert client.get(
        BASE, headers=first
    ).json()["activities"][0]["work_text"] == WORK


def test_changing_group_preserves_history(learning_context):
    client, _ = learning_context
    headers = account(client)
    assert client.post(f"{BASE}/start", headers=headers).status_code == 200
    assert save(client, headers, STEP_IDS[0], complete=True).status_code == 200

    assert client.put(
        "/student/school-details",
        headers=headers,
        json={"school_class": 10, "study_group": "humanities"},
    ).status_code == 200

    body = client.get(BASE, headers=headers).json()
    assert body["total_xp"] == 25
    assert body["activities"][0]["work_text"] == WORK
    assert save(client, headers, STEP_IDS[1]).status_code == 409


@pytest.mark.parametrize("authorization", [None, "Bearer invalid"])
def test_learning_requires_authentication(learning_context, authorization):
    client, _ = learning_context
    headers = {"Authorization": authorization} if authorization else {}

    requests = [
        ("GET", BASE, {}),
        ("POST", f"{BASE}/start", {}),
        (
            "PUT",
            f"{BASE}/activities/{STEP_IDS[0]}",
            {"json": {"work_text": WORK, "complete": True}},
        ),
    ]
    for method, url, kwargs in requests:
        response = client.request(method, url, headers=headers, **kwargs)
        assert response.status_code == 401
        assert response.headers["cache-control"] == "no-store"
