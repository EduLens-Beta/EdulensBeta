import pytest
from pydantic import ValidationError

from app.courses.catalog import (
    COURSES,
    course_is_unlocked,
    get_course,
    lesson_is_unlocked,
)
from app.courses.schemas import SaveLessonRequest


def test_first_course_available_without_progress():
    assert course_is_unlocked("powerpoint", set())
    assert not course_is_unlocked("word", set())


def test_completing_first_course_unlocks_only_next():
    completed = {("powerpoint", 3)}
    assert course_is_unlocked("word", completed)
    assert not course_is_unlocked("excel", completed)


def test_course_requires_every_previous_course():
    assert not course_is_unlocked("python", {("excel", 2)})


def test_completion_of_old_version_does_not_unlock_next():
    assert not course_is_unlocked("word", {("powerpoint", 99)})


def test_first_lesson_available():
    assert lesson_is_unlocked(
        "powerpoint", "meet-powerpoint", set()
    )


def test_lesson_cannot_skip_earlier_work():
    assert not lesson_is_unlocked(
        "powerpoint", "text-basics",
        {"first-slides"},
    )


def test_completed_lesson_unlocks_next():
    assert lesson_is_unlocked(
        "powerpoint", "first-slides",
        {"meet-powerpoint"},
    )


def test_completed_lessons_remain_available():
    course = get_course("powerpoint")
    completed = {lesson.id for lesson in course.lessons}
    assert all(
        lesson_is_unlocked(course.id, lesson.id, completed)
        for lesson in course.lessons
    )


def test_unknown_course_rejected():
    with pytest.raises(ValueError):
        course_is_unlocked("unknown", set())


def test_lesson_from_another_course_rejected():
    with pytest.raises(ValueError):
        lesson_is_unlocked("word", "meet-powerpoint", set())


def test_catalog_ids_are_unique():
    assert len({course.id for course in COURSES}) == len(COURSES)
    for course in COURSES:
        assert course.lessons
        assert len({lesson.id for lesson in course.lessons}) == len(
            course.lessons
        )


def test_work_is_trimmed():
    assert SaveLessonRequest(work_text="  My work  ").work_text == "My work"


@pytest.mark.parametrize("payload", [
    {"work_text": "Work", "complete": "true"},
    {"work_text": 123},
    {"work_text": "Work", "completed_at": "2026-11-06"},
    {"work_text": "x" * 10001},
])
def test_invalid_save_payload_rejected(payload):
    with pytest.raises(ValidationError):
        SaveLessonRequest(**payload)
