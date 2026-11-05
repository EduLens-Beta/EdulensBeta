from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.courses.catalog import (
    COURSES,
    course_is_unlocked,
    get_course,
    lesson_is_unlocked,
)
from app.courses.schemas import (
    CourseProgressResponse,
    LessonProgressResponse,
    SaveLessonRequest,
    SkillsProgressResponse,
)
from app.learning.routes import require_science_profile
from app.models import CourseEnrollment, CourseLessonProgress, User


router = APIRouter(
    prefix="/student/courses",
    tags=["Skill courses"],
)

CurrentUser = Annotated[User, Depends(get_current_user)]
Database = Annotated[Session, Depends(get_db)]


def find_course(course_id):
    try:
        return get_course(course_id)
    except ValueError:
        raise HTTPException(404, "Course not found.") from None


def lock_student(db, user_id):
    # Serialise course writes for this student, including first enrolment.
    db.execute(
        select(User.id).where(User.id == user_id).with_for_update()
    ).one()
    require_science_profile(db, user_id)


def completed_courses(db, user_id):
    return set(
        db.execute(
            select(
                CourseEnrollment.course_id,
                CourseEnrollment.course_version,
            ).where(
                CourseEnrollment.user_id == user_id,
                CourseEnrollment.completed_at.is_not(None),
            )
        ).all()
    )


def require_unlocked_course(db, user_id, course_id):
    if not course_is_unlocked(
        course_id, completed_courses(db, user_id)
    ):
        raise HTTPException(409, "Complete the earlier courses first.")


def find_enrollment(db, user_id, course):
    return db.scalar(
        select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course.id,
            CourseEnrollment.course_version == course.version,
        )
    )


def read_progress(db, user_id):
    enrollments = db.scalars(
        select(CourseEnrollment).where(
            CourseEnrollment.user_id == user_id
        )
    ).all()
    by_course = {
        (item.course_id, item.course_version): item
        for item in enrollments
    }
    saved = {}
    if enrollments:
        rows = db.scalars(
            select(CourseLessonProgress).where(
                CourseLessonProgress.enrollment_id.in_(
                    [item.id for item in enrollments]
                )
            )
        ).all()
        saved = {
            (item.enrollment_id, item.lesson_id): item
            for item in rows
        }

    finished_courses = {
        (item.course_id, item.course_version)
        for item in enrollments
        if item.completed_at is not None
    }
    results = []

    for course in COURSES:
        enrollment = by_course.get((course.id, course.version))
        unlocked = course_is_unlocked(course.id, finished_courses)
        finished_lessons = {
            lesson.id
            for lesson in course.lessons
            if enrollment is not None
            and (row := saved.get((enrollment.id, lesson.id))) is not None
            and row.completed_at is not None
        }
        next_lesson = next(
            (
                lesson.id for lesson in course.lessons
                if lesson.id not in finished_lessons
            ),
            None,
        )
        lessons = []
        for lesson in course.lessons:
            row = (
                saved.get((enrollment.id, lesson.id))
                if enrollment is not None else None
            )
            status = (
                "completed" if lesson.id in finished_lessons
                else "current" if unlocked and lesson.id == next_lesson
                else "locked"
            )
            lessons.append(LessonProgressResponse(
                id=lesson.id,
                title=lesson.title,
                status=status,
                work_text=row.work_text if row else "",
                completed_at=row.completed_at if row else None,
            ))

        results.append(CourseProgressResponse(
            id=course.id,
            title=course.title,
            version=course.version,
            status=(
                "completed"
                if (course.id, course.version) in finished_courses
                else "current" if unlocked else "locked"
            ),
            started_at=enrollment.started_at if enrollment else None,
            completed_at=enrollment.completed_at if enrollment else None,
            completed_lessons=len(finished_lessons),
            total_lessons=len(course.lessons),
            progress_percent=(
                len(finished_lessons) * 100 // len(course.lessons)
            ),
            next_lesson_id=next_lesson if unlocked else None,
            lessons=lessons,
        ))

    return SkillsProgressResponse(
        courses=results,
        next_course_id=next(
            (course.id for course in results if course.status == "current"),
            None,
        ),
    )


def unavailable():
    return HTTPException(
        503, "Your course progress is temporarily unavailable. Please try again."
    )


@router.get("", response_model=SkillsProgressResponse)
def get_progress(user: CurrentUser, db: Database):
    try:
        require_science_profile(db, user.id)
        return read_progress(db, user.id)
    except SQLAlchemyError:
        db.rollback()
        raise unavailable() from None


@router.post("/{course_id}/start", response_model=SkillsProgressResponse)
def start_course(course_id: str, user: CurrentUser, db: Database):
    course = find_course(course_id)
    user_id = user.id
    try:
        lock_student(db, user_id)
        require_unlocked_course(db, user_id, course_id)
        enrollment = find_enrollment(db, user_id, course)
        if enrollment is None:
            db.add(CourseEnrollment(
                user_id=user_id,
                course_id=course.id,
                course_version=course.version,
            ))
            db.flush()

        result = read_progress(db, user_id)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise unavailable() from None


def _save_lesson(
    course_id: str,
    lesson_id: str,
    payload: SaveLessonRequest,
    user: CurrentUser,
    db: Database,
):
    course = find_course(course_id)
    if lesson_id not in {lesson.id for lesson in course.lessons}:
        raise HTTPException(404, "Lesson not found.")

    user_id = user.id
    try:
        lock_student(db, user_id)
        require_unlocked_course(db, user_id, course_id)
        enrollment = find_enrollment(db, user_id, course)
        if enrollment is None:
            raise HTTPException(409, "Start this course before saving work.")

        rows = db.scalars(
            select(CourseLessonProgress).where(
                CourseLessonProgress.enrollment_id == enrollment.id
            )
        ).all()
        by_id = {row.lesson_id: row for row in rows}
        finished = {
            row.lesson_id for row in rows
            if row.completed_at is not None
        }
        row = by_id.get(lesson_id)

        # Repeating completion leaves the original work and timestamp intact.
        if lesson_id in finished:
            if not payload.complete:
                raise HTTPException(
                    409, "This lesson is already completed."
                )
            result = read_progress(db, user_id)
            db.commit()
            return result

        # This applies to drafts as well as completion.
        if not lesson_is_unlocked(course_id, lesson_id, finished):
            raise HTTPException(409, "Complete the earlier lessons first.")

        if payload.complete and len(payload.work_text) < 20:
            raise HTTPException(
                422, "Add at least 20 characters about your work."
            )

        if row is None:
            row = CourseLessonProgress(
                enrollment_id=enrollment.id,
                lesson_id=lesson_id,
            )
            db.add(row)

        row.work_text = payload.work_text
        row.updated_at = func.now()

        if payload.complete:
            row.completed_at = func.now()
            finished.add(lesson_id)
            if all(lesson.id in finished for lesson in course.lessons):
                enrollment.completed_at = func.now()

        db.flush()
        result = read_progress(db, user_id)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise unavailable() from None


class IntroductionQuizRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    answers: list[Annotated[int, Field(ge=0, le=2)]] = Field(
        min_length=2, max_length=2
    )


@router.put(
    "/{course_id}/lessons/{lesson_id}",
    response_model=SkillsProgressResponse,
)
def save_lesson(
    course_id: str,
    lesson_id: str,
    payload: SaveLessonRequest,
    user: CurrentUser,
    db: Database,
):
    if (
        course_id == "powerpoint"
        and lesson_id in {"meet-powerpoint", "first-slides"}
        and payload.complete
    ):
        raise HTTPException(
            422, "Pass this episode’s quiz to complete it."
        )
    return _save_lesson(course_id, lesson_id, payload, user, db)


@router.post(
    "/powerpoint/lessons/meet-powerpoint/quiz",
    response_model=SkillsProgressResponse,
)
def submit_introduction_quiz(
    payload: IntroductionQuizRequest,
    user: CurrentUser,
    db: Database,
):
    if payload.answers != [0, 1]:
        raise HTTPException(
            422, "Not quite. Review the explanations and try again."
        )

    return _save_lesson(
        "powerpoint",
        "meet-powerpoint",
        SaveLessonRequest(
            work_text="Passed Meet PowerPoint quiz: 2 of 2 answers correct.",
            complete=True,
        ),
        user,
        db,
    )


@router.post(
    "/powerpoint/lessons/first-slides/quiz",
    response_model=SkillsProgressResponse,
)
def submit_first_slide_quiz(
    payload: IntroductionQuizRequest,
    user: CurrentUser,
    db: Database,
):
    if payload.answers != [1, 0]:
        raise HTTPException(
            422, "Not quite. Review the lesson and try again."
        )
    return _save_lesson(
        "powerpoint",
        "first-slides",
        SaveLessonRequest(
            work_text="Passed Create your first slide quiz: 2 of 2 correct.",
            complete=True,
        ),
        user,
        db,
    )
