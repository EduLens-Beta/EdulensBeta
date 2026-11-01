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


class LearningJourney(Base):
    __tablename__ = "learning_journeys"
    __table_args__ = (
        UniqueConstraint("user_id", "roadmap_id", "roadmap_version"),
        CheckConstraint("roadmap_version > 0", name="version_positive"),
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
    roadmap_id: Mapped[str] = mapped_column(String(80), nullable=False)
    roadmap_version: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class LearningActivity(Base):
    __tablename__ = "learning_activities"
    __table_args__ = (
        CheckConstraint("awarded_xp >= 0", name="xp_nonnegative"),
        CheckConstraint(
            "(completed_at IS NULL AND awarded_xp = 0) OR "
            "(completed_at IS NOT NULL AND awarded_xp > 0 "
            "AND length(btrim(work_text)) > 0)",
            name="completion_consistent",
        ),
    )

    journey_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learning_journeys.id", ondelete="CASCADE"),
        primary_key=True,
    )
    step_id: Mapped[str] = mapped_column(
        String(80), primary_key=True
    )
    work_text: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''")
    )
    awarded_xp: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
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
