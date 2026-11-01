import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.database import get_engine
from app.main import app
from app.models import LearningJourney


BASE = "/student/learning/science-explorer/v2"
V1 = "/student/learning/science-explorer"


@pytest.fixture
def discovery_context():
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
    email = f"discovery-{uuid4().hex}@example.com"
    password = "Example discovery password!"
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
        "/student/profile", headers=headers,
        json={"education_stage": stage},
    ).status_code == 200

    if stage == "class_9_10":
        assert client.put(
            "/student/school-details", headers=headers,
            json={"school_class": 9, "study_group": group},
        ).status_code == 200
    return headers


def payload(**changes):
    result = {
        "interests": ["nature", "technology"],
        "unsure": False,
        "activity_id": "notice-and-question",
        "work_text": "I observed leaf shapes and wrote down three differences.",
        "reflection": "I enjoyed noticing patterns and would like to learn more.",
        "complete": True,
    }
    result.update(changes)
    return result


def start(client, headers):
    response = client.post(f"{BASE}/start", headers=headers)
    assert response.status_code == 200
    return response


def test_catalog_describes_six_milestones(discovery_context):
    client, _ = discovery_context
    headers = account(client)

    response = client.get(f"{BASE}/catalog", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["roadmap_version"] == 2
    assert len(body["milestones"]) == 6
    assert body["milestones"][0]["available"] is True
    assert all(not item["available"] for item in body["milestones"][1:])
    assert len(body["exploration_activities"]) == 3
    assert response.headers["cache-control"] == "no-store"


def test_reading_does_not_enrol_student(discovery_context):
    client, session = discovery_context
    headers = account(client)
    before = session.scalar(select(func.count()).select_from(LearningJourney))

    response = client.get(BASE, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["journey"]["started_at"] is None
    assert body["journey"]["total_xp"] == 0
    assert body["discovery"]["interests"] == []
    assert session.scalar(
        select(func.count()).select_from(LearningJourney)
    ) == before


def test_repeated_start_preserves_journey(discovery_context):
    client, session = discovery_context
    headers = account(client)
    before = session.scalar(select(func.count()).select_from(LearningJourney))

    first = start(client, headers).json()
    second = start(client, headers).json()

    assert first == second
    assert first["journey"]["started_at"] is not None
    assert session.scalar(
        select(func.count()).select_from(LearningJourney)
    ) == before + 1


def test_draft_saves_details_without_xp(discovery_context):
    client, _ = discovery_context
    headers = account(client)
    start(client, headers)

    response = client.put(
        f"{BASE}/discovery", headers=headers,
        json=payload(complete=False, reflection=""),
    )

    assert response.status_code == 200
    body = client.get(BASE, headers=headers).json()
    assert body["discovery"]["interests"] == ["nature", "technology"]
    assert body["discovery"]["work_text"] == payload()["work_text"]
    assert body["journey"]["total_xp"] == 0
    assert body["journey"]["progress_percent"] == 0


@pytest.mark.parametrize("unsure", [False, True])
def test_completion_saves_details_and_awards_once(discovery_context, unsure):
    client, _ = discovery_context
    headers = account(client)
    start(client, headers)
    submitted = payload(
        interests=[] if unsure else ["nature"],
        unsure=unsure,
    )

    first = client.put(
        f"{BASE}/discovery", headers=headers, json=submitted,
    )
    assert first.status_code == 200
    body = first.json()
    assert body["journey"]["total_xp"] == 25
    assert body["journey"]["progress_percent"] == 16
    assert body["journey"]["completed_count"] == 1
    assert body["journey"]["next_step_id"] == "ask-a-question"
    assert body["discovery"]["unsure"] is unsure
    assert body["discovery"]["reflection"] == submitted["reflection"]

    repeated = client.put(
        f"{BASE}/discovery", headers=headers,
        json=payload(interests=["data"]),
    )
    assert repeated.status_code == 200
    assert repeated.json() == body

    draft = client.put(
        f"{BASE}/discovery", headers=headers,
        json=payload(complete=False),
    )
    assert draft.status_code == 409
    assert client.get(BASE, headers=headers).json() == body


def test_discovery_requires_start(discovery_context):
    client, _ = discovery_context
    headers = account(client)

    response = client.put(
        f"{BASE}/discovery", headers=headers, json=payload(),
    )
    assert response.status_code == 409


@pytest.mark.parametrize(
    "changes",
    [
        {"interests": ["nature"], "unsure": True},
        {"interests": []},
        {"activity_id": None},
        {"work_text": "short"},
        {"reflection": ""},
        {"awarded_xp": 9999},
        {"user_id": str(uuid4())},
    ],
)
def test_invalid_submission_preserves_draft(discovery_context, changes):
    client, _ = discovery_context
    headers = account(client)
    start(client, headers)
    assert client.put(
        f"{BASE}/discovery", headers=headers,
        json=payload(complete=False),
    ).status_code == 200
    before = client.get(BASE, headers=headers).json()

    response = client.put(
        f"{BASE}/discovery", headers=headers, json=payload(**changes),
    )

    assert response.status_code == 422
    assert response.headers["cache-control"] == "no-store"
    assert client.get(BASE, headers=headers).json() == before


def test_versions_keep_separate_progress(discovery_context):
    client, _ = discovery_context
    headers = account(client)

    assert client.post(f"{V1}/start", headers=headers).status_code == 200
    assert client.put(
        f"{V1}/activities/notice-your-interests",
        headers=headers,
        json={
            "work_text": "My original version one work should remain saved.",
            "complete": True,
        },
    ).status_code == 200
    original = client.get(V1, headers=headers).json()

    start(client, headers)
    assert client.get(BASE, headers=headers).json()["journey"]["total_xp"] == 0

    assert client.put(
        f"{BASE}/discovery", headers=headers, json=payload(),
    ).status_code == 200

    assert client.get(V1, headers=headers).json() == original
    assert client.get(BASE, headers=headers).json()["journey"]["total_xp"] == 25


def test_students_cannot_access_each_others_discovery(discovery_context):
    client, _ = discovery_context
    first = account(client)
    second = account(client)

    start(client, first)
    assert client.put(
        f"{BASE}/discovery", headers=first, json=payload(),
    ).status_code == 200

    second_data = client.get(BASE, headers=second).json()
    assert second_data["journey"]["started_at"] is None
    assert second_data["discovery"]["work_text"] == ""
    assert second_data["journey"]["total_xp"] == 0

    start(client, second)
    assert client.put(
        f"{BASE}/discovery", headers=second,
        json=payload(complete=False, interests=["data"]),
    ).status_code == 200

    assert client.get(
        BASE, headers=first
    ).json()["discovery"]["interests"] == ["nature", "technology"]


@pytest.mark.parametrize("group", ["business_studies", "humanities"])
def test_other_groups_cannot_start(discovery_context, group):
    client, _ = discovery_context
    headers = account(client, group=group)

    assert client.post(f"{BASE}/start", headers=headers).status_code == 409


def test_group_change_preserves_saved_discovery(discovery_context):
    client, _ = discovery_context
    headers = account(client)
    start(client, headers)
    assert client.put(
        f"{BASE}/discovery", headers=headers, json=payload(),
    ).status_code == 200
    before = client.get(BASE, headers=headers).json()

    assert client.put(
        "/student/school-details", headers=headers,
        json={"school_class": 10, "study_group": "humanities"},
    ).status_code == 200

    assert client.get(BASE, headers=headers).json() == before
    assert client.put(
        f"{BASE}/discovery", headers=headers, json=payload(),
    ).status_code == 409


@pytest.mark.parametrize("authorization", [None, "Bearer invalid"])
def test_discovery_requires_authentication(discovery_context, authorization):
    client, _ = discovery_context
    headers = {"Authorization": authorization} if authorization else {}

    requests = [
        ("GET", BASE, {}),
        ("GET", f"{BASE}/catalog", {}),
        ("POST", f"{BASE}/start", {}),
        ("PUT", f"{BASE}/discovery", {"json": payload()}),
    ]
    for method, url, kwargs in requests:
        response = client.request(method, url, headers=headers, **kwargs)
        assert response.status_code == 401
        assert response.headers["cache-control"] == "no-store"
