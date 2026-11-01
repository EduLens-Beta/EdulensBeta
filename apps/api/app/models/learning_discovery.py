from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    Uuid,
    false,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class LearningDiscovery(Base):
    __tablename__ = "learning_discoveries"
    __table_args__ = (
        CheckConstraint(
            "CASE WHEN jsonb_typeof(interests) = 'array' "
            "THEN jsonb_array_length(interests) <= 3 "
            "ELSE false END",
            name="interests_array_valid",
        ),
        CheckConstraint(
            "NOT unsure OR interests = '[]'::jsonb",
            name="interest_choice_consistent",
        ),
        CheckConstraint(
            "activity_id IS NULL OR activity_id IN "
            "('notice-and-question', 'explain-an-idea', 'design-a-solution')",
            name="activity_valid",
        ),
        CheckConstraint(
            "length(reflection) <= 2000",
            name="reflection_length_valid",
        ),
    )

    journey_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learning_journeys.id", ondelete="CASCADE"),
        primary_key=True,
    )
    interests: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    unsure: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )
    activity_id: Mapped[str | None] = mapped_column(
        String(40), nullable=True
    )
    reflection: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
