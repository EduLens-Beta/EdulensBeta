import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.courses.catalog import COURSES
from app.database import get_engine
from app.main import app
from app.models import (
    CourseEnrollment,
    CourseLessonProgress,
    StudentProfile,
)


BASE = "/student/courses"
WORK = "I practised this activity and saved my finished work."


@pytest.fixture
def course_context():
    if os.environ.get("EDULENS_RUN_DB_TESTS") != "1":
        pytest.skip("Set EDULENS_RUN_DB_TESTS=1.")

    engine = get_engine()
    if not (engine.url.database or "").endswith(("_test", "_ci")):
        pytest.fail("Use a database ending in _test or _ci.")

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


def account(context, *, science=True):
    client, session = context
    email = f"course-{uuid4().hex}@example.com"
    password = "Example course password!"
    signup = client.post("/auth/signup", json={
        "name": "Course Student",
        "email": email,
        "password": password,
    })
    assert signup.status_code == 201
    user_id = UUID(signup.json()["id"])

    if science:
        session.add(StudentProfile(
            user_id=user_id,
            education_stage="class_9_10",
            school_class=9,
            study_group="science",
        ))
        session.commit()

    login = client.post("/auth/login", json={
        "email": email,
        "password": password,
    })
    assert login.status_code == 200
    return {
        "Authorization": f"Bearer {login.json()['session_token']}"
    }, user_id


def start(client, headers, course_id="powerpoint"):
    return client.post(f"{BASE}/{course_id}/start", headers=headers)


def save(
    client, headers,
    lesson_id="meet-powerpoint",
    course_id="powerpoint",
    complete=True,
    work=WORK,
):
    if (
        course_id == "powerpoint"
        and lesson_id == "meet-powerpoint"
        and complete
        and len(work.strip()) >= 20
    ):
        return client.post(
            f"{BASE}/powerpoint/lessons/meet-powerpoint/quiz",
            headers=headers,
            json={"answers": [0, 1]},
        )
    if (
        course_id == "powerpoint"
        and lesson_id == "first-slides"
        and complete
        and len(work.strip()) >= 20
    ):
        return client.post(
            f"{BASE}/powerpoint/lessons/first-slides/quiz",
            headers=headers,
            json={"answers": [1, 0]},
        )
    return client.put(
        f"{BASE}/{course_id}/lessons/{lesson_id}",
        headers=headers,
        json={"work_text": work, "complete": complete},
    )


def finish_first(client, headers):
    assert start(client, headers).status_code == 200
    response = None
    for lesson in COURSES[0].lessons:
        response = save(client, headers, lesson_id=lesson.id)
        assert response.status_code == 200
    return response.json()


def test_authentication_required(course_context):
    client, _ = course_context
    assert client.get(BASE).status_code == 401
    assert start(client, {}).status_code == 401


def test_science_profile_required(course_context):
    client, _ = course_context
    headers, _ = account(course_context, science=False)
    assert client.get(BASE, headers=headers).status_code == 409
    assert start(client, headers).status_code == 409


def test_read_does_not_enroll_student(course_context):
    client, session = course_context
    headers, user_id = account(course_context)
    response = client.get(BASE, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["next_course_id"] == "powerpoint"
    assert body["courses"][0]["status"] == "current"
    assert body["courses"][0]["lessons"][0]["status"] == "current"
    assert all(
        item["status"] == "locked"
        for item in body["courses"][1:]
    )
    assert session.scalar(
        select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id
        )
    ) is None


def test_cannot_start_later_course(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    assert start(client, headers, "word").status_code == 409


def test_start_is_idempotent(course_context):
    client, session = course_context
    headers, user_id = account(course_context)
    first = start(client, headers)
    second = start(client, headers)
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    rows = session.scalars(
        select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id
        )
    ).all()
    assert len(rows) == 1


def test_must_start_before_saving(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    assert save(client, headers).status_code == 409


@pytest.mark.parametrize("complete", [False, True])
def test_cannot_skip_lesson_even_for_draft(course_context, complete):
    client, _ = course_context
    headers, _ = account(course_context)
    assert start(client, headers).status_code == 200
    response = save(
        client, headers,
        lesson_id="first-slides",
        complete=complete,
    )
    assert response.status_code == 409


def test_draft_is_saved_without_unlocking_next(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    response = save(client, headers, complete=False, work="My draft")
    assert response.status_code == 200
    course = response.json()["courses"][0]
    assert course["completed_lessons"] == 0
    assert course["lessons"][0]["work_text"] == "My draft"
    assert course["lessons"][1]["status"] == "locked"
    reloaded = client.get(BASE, headers=headers).json()
    assert reloaded == response.json()


def test_short_work_does_not_complete_lesson(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    assert save(client, headers, work="Too short").status_code == 422
    body = client.get(BASE, headers=headers).json()
    assert body["courses"][0]["completed_lessons"] == 0


def test_completion_unlocks_next_lesson(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    response = save(client, headers)
    assert response.status_code == 200
    course = response.json()["courses"][0]
    assert course["lessons"][0]["status"] == "completed"
    assert course["lessons"][1]["status"] == "current"
    assert course["lessons"][2]["status"] == "locked"
    assert course["progress_percent"] == 14


def test_repeated_completion_preserves_original_work(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    first = save(client, headers)
    second = save(client, headers, work="A different submitted description.")
    assert first.status_code == second.status_code == 200
    assert second.json() == first.json()
    assert save(client, headers, complete=False).status_code == 409


def test_finishing_course_unlocks_next_course(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    body = finish_first(client, headers)
    assert body["courses"][0]["status"] == "completed"
    assert body["courses"][0]["progress_percent"] == 100
    assert body["courses"][0]["completed_at"] is not None
    assert body["next_course_id"] == "word"
    assert body["courses"][1]["status"] == "current"
    assert body["courses"][2]["status"] == "locked"
    assert start(client, headers, "word").status_code == 200


def test_other_account_cannot_read_or_use_progress(course_context):
    client, _ = course_context
    first_headers, _ = account(course_context)
    finish_first(client, first_headers)
    other_headers, _ = account(course_context)
    body = client.get(BASE, headers=other_headers).json()
    assert body["next_course_id"] == "powerpoint"
    assert all(
        lesson["work_text"] == ""
        for course in body["courses"]
        for lesson in course["lessons"]
    )
    assert start(client, other_headers, "word").status_code == 409


def test_unknown_course_and_lesson_rejected(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    assert start(client, headers, "unknown").status_code == 404
    start(client, headers)
    assert save(
        client, headers, lesson_id="unknown"
    ).status_code == 404


def test_client_cannot_set_completion_timestamp(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    response = client.put(
        f"{BASE}/powerpoint/lessons/meet-powerpoint",
        headers=headers,
        json={
            "work_text": WORK,
            "complete": True,
            "completed_at": "2026-11-06T00:00:00Z",
        },
    )
    assert response.status_code == 422


def test_completion_persisted_in_database(course_context):
    client, session = course_context
    headers, user_id = account(course_context)
    finish_first(client, headers)
    enrollment = session.scalar(
        select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id
        )
    )
    assert enrollment.completed_at is not None
    lessons = session.scalars(
        select(CourseLessonProgress).where(
            CourseLessonProgress.enrollment_id == enrollment.id
        )
    ).all()
    assert len(lessons) == 7
    assert all(lesson.completed_at is not None for lesson in lessons)


def test_course_responses_are_not_cached(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    for response in (
        client.get(BASE),
        client.get(BASE, headers=headers),
        start(client, headers),
        start(client, headers, "word"),
    ):
        assert response.headers.get("cache-control") == "no-store"


def test_intro_quiz_wrong_answers_do_not_unlock(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    response = client.post(
        f"{BASE}/powerpoint/lessons/meet-powerpoint/quiz",
        headers=headers,
        json={"answers": [2, 0]},
    )
    assert response.status_code == 422
    body = client.get(BASE, headers=headers).json()
    assert body["courses"][0]["completed_lessons"] == 0
    assert body["courses"][0]["lessons"][1]["status"] == "locked"


def test_intro_cannot_be_completed_by_notes(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    response = client.put(
        f"{BASE}/powerpoint/lessons/meet-powerpoint",
        headers=headers,
        json={"work_text": WORK, "complete": True},
    )
    assert response.status_code == 422


def test_intro_quiz_requires_two_answers(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    response = client.post(
        f"{BASE}/powerpoint/lessons/meet-powerpoint/quiz",
        headers=headers,
        json={"answers": [0]},
    )
    assert response.status_code == 422


def test_slide_quiz_cannot_skip_introduction(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    response = client.post(
        f"{BASE}/powerpoint/lessons/first-slides/quiz",
        headers=headers,
        json={"answers": [1, 0]},
    )
    assert response.status_code == 409


def test_slide_quiz_wrong_answers_do_not_complete(course_context):
    client, _ = course_context
    headers, _ = account(course_context)
    start(client, headers)
    assert save(client, headers).status_code == 200
    response = client.post(
        f"{BASE}/powerpoint/lessons/first-slides/quiz",
        headers=headers,
        json={"answers": [0, 2]},
    )
    assert response.status_code == 422
    body = client.get(BASE, headers=headers).json()
    assert body["courses"][0]["completed_lessons"] == 1
