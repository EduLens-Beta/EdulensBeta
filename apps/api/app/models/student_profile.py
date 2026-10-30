from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    __table_args__ = (
        CheckConstraint(
            "education_stage IN "
            "('class_6_8', 'class_9_10', 'college', 'university')",
            name="education_stage_valid",
        ),
        CheckConstraint(
            "school_class IS NULL OR school_class IN (9, 10)",
            name="school_class_valid",
        ),
        CheckConstraint(
            "study_group IS NULL OR study_group IN "
            "('science', 'business_studies', 'humanities')",
            name="study_group_valid",
        ),
        CheckConstraint(
            "(school_class IS NULL AND study_group IS NULL) OR "
            "(school_class IS NOT NULL AND study_group IS NOT NULL "
            "AND education_stage = 'class_9_10')",
            name="school_details_consistent",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    education_stage: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    school_class: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True
    )
    study_group: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
