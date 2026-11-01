from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.learning.discovery_schemas import (
    DiscoveryDetailsResponse,
    DiscoveryJourneyResponse,
    SaveDiscoveryRequest,
)
from app.learning.routes import require_science_profile
from app.learning.schemas import ActivityResponse, JourneyResponse
from app.learning.science_v2 import (
    EXPLORATION_ACTIVITIES,
    INTERESTS,
    MILESTONES,
    ROADMAP_ID,
    ROADMAP_VERSION,
)
from app.models import LearningActivity, LearningDiscovery, LearningJourney, User


router = APIRouter(
    prefix="/student/learning/science-explorer/v2",
    tags=["Science skill exploration"],
)


def find_journey(db: Session, user_id, *, lock=False):
    statement = select(
        LearningJourney.id, LearningJourney.started_at,
    ).where(
        LearningJourney.user_id == user_id,
        LearningJourney.roadmap_id == ROADMAP_ID,
        LearningJourney.roadmap_version == ROADMAP_VERSION,
    )
    if lock:
        statement = statement.with_for_update()
    return db.execute(statement).first()


def read_discovery(db: Session, user_id) -> DiscoveryJourneyResponse:
    journey = find_journey(db, user_id)
    saved = {}
    discovery = None

    if journey is not None:
        rows = db.execute(
            select(
                LearningActivity.step_id,
                LearningActivity.work_text,
                LearningActivity.completed_at,
                LearningActivity.awarded_xp,
            ).where(LearningActivity.journey_id == journey.id)
        ).all()
        saved = {row.step_id: row for row in rows}

        discovery = db.execute(
            select(
                LearningDiscovery.interests,
                LearningDiscovery.unsure,
                LearningDiscovery.activity_id,
                LearningDiscovery.reflection,
            ).where(LearningDiscovery.journey_id == journey.id)
        ).first()

    activities = [
        ActivityResponse(
            step_id=milestone.id,
            work_text=saved[milestone.id].work_text if milestone.id in saved else "",
            completed_at=(
                saved[milestone.id].completed_at
                if milestone.id in saved else None
            ),
            awarded_xp=saved[milestone.id].awarded_xp if milestone.id in saved else 0,
        )
        for milestone in MILESTONES
    ]
    completed = sum(item.completed_at is not None for item in activities)

    return DiscoveryJourneyResponse(
        journey=JourneyResponse(
            roadmap_id=ROADMAP_ID,
            roadmap_version=ROADMAP_VERSION,
            started_at=journey.started_at if journey else None,
            activities=activities,
            completed_count=completed,
            total_activities=len(MILESTONES),
            total_xp=sum(item.awarded_xp for item in activities),
            progress_percent=completed * 100 // len(MILESTONES),
            next_step_id=next(
                (
                    item.step_id for item in activities
                    if item.completed_at is None
                ),
                None,
            ),
        ),
        discovery=DiscoveryDetailsResponse(
            interests=discovery.interests if discovery else [],
            unsure=discovery.unsure if discovery else False,
            activity_id=discovery.activity_id if discovery else None,
            work_text=activities[0].work_text,
            reflection=discovery.reflection if discovery else "",
        ),
    )


@router.get("/catalog")
def get_catalog(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return {
        "roadmap_id": ROADMAP_ID,
        "roadmap_version": ROADMAP_VERSION,
        "milestones": [
            {**asdict(item), "available": index == 0}
            for index, item in enumerate(MILESTONES)
        ],
        "interests": INTERESTS,
        "exploration_activities": EXPLORATION_ACTIVITIES,
    }


@router.get("", response_model=DiscoveryJourneyResponse)
def get_discovery(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DiscoveryJourneyResponse:
    try:
        return read_discovery(db, user.id)
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Your discovery journey is temporarily unavailable.",
        ) from None


@router.post("/start", response_model=DiscoveryJourneyResponse)
def start_discovery(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DiscoveryJourneyResponse:
    user_id = user.id
    try:
        require_science_profile(db, user_id)
        db.execute(
            insert(LearningJourney)
            .values(
                user_id=user_id,
                roadmap_id=ROADMAP_ID,
                roadmap_version=ROADMAP_VERSION,
            )
            .on_conflict_do_nothing(
                index_elements=["user_id", "roadmap_id", "roadmap_version"]
            )
        )
        result = read_discovery(db, user_id)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Your discovery journey could not be started.",
        ) from None


@router.put("/discovery", response_model=DiscoveryJourneyResponse)
def save_discovery(
    payload: SaveDiscoveryRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DiscoveryJourneyResponse:
    user_id = user.id
    milestone = MILESTONES[0]

    try:
        require_science_profile(db, user_id)
        journey = find_journey(db, user_id, lock=True)
        if journey is None:
            raise HTTPException(
                status_code=409,
                detail="Start the discovery journey before saving your work.",
            )

        existing = db.execute(
            select(LearningActivity.completed_at).where(
                LearningActivity.journey_id == journey.id,
                LearningActivity.step_id == milestone.id,
            )
        ).first()

        if existing is not None and existing.completed_at is not None:
            if not payload.complete:
                raise HTTPException(
                    status_code=409,
                    detail="This milestone is already completed.",
                )
            result = read_discovery(db, user_id)
            db.commit()
            return result

        details = {
            "interests": payload.interests,
            "unsure": payload.unsure,
            "activity_id": payload.activity_id,
            "reflection": payload.reflection,
            "updated_at": func.now(),
        }
        db.execute(
            insert(LearningDiscovery)
            .values(journey_id=journey.id, **details)
            .on_conflict_do_update(
                index_elements=["journey_id"], set_=details,
            )
        )

        activity = {
            "work_text": payload.work_text,
            "awarded_xp": milestone.xp if payload.complete else 0,
            "completed_at": func.now() if payload.complete else None,
            "updated_at": func.now(),
        }
        db.execute(
            insert(LearningActivity)
            .values(
                journey_id=journey.id,
                step_id=milestone.id,
                **activity,
            )
            .on_conflict_do_update(
                index_elements=["journey_id", "step_id"],
                set_=activity,
            )
        )

        result = read_discovery(db, user_id)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Your discovery work could not be saved. Please try again.",
        ) from None
