from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", "course_version"),
        CheckConstraint("course_version > 0", name="version_positive"),
        CheckConstraint(
            "length(btrim(course_id)) > 0",
            name="course_id_not_blank",
        ),
        CheckConstraint(
            "completed_at IS NULL OR completed_at >= started_at",
            name="completion_after_start",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[str] = mapped_column(String(80), nullable=False)
    course_version: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class CourseLessonProgress(Base):
    __tablename__ = "course_lesson_progress"
    __table_args__ = (
        CheckConstraint(
            "length(btrim(lesson_id)) > 0",
            name="lesson_id_not_blank",
        ),
        CheckConstraint(
            "length(work_text) <= 10000",
            name="work_length_valid",
        ),
        CheckConstraint(
            "completed_at IS NULL OR length(btrim(work_text)) > 0",
            name="completed_work_not_blank",
        ),
    )

    enrollment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("course_enrollments.id", ondelete="CASCADE"),
        primary_key=True,
    )
    lesson_id: Mapped[str] = mapped_column(
        String(80), primary_key=True
    )
    work_text: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''")
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
