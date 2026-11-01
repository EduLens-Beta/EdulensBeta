from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.learning.catalog import (
    ROADMAP_ID,
    ROADMAP_VERSION,
    STEP_IDS,
    XP_PER_ACTIVITY,
)
from app.learning.schemas import (
    ActivityResponse,
    JourneyResponse,
    SaveActivityRequest,
)
from app.models import LearningActivity, LearningJourney, StudentProfile, User


router = APIRouter(
    prefix="/student/learning/science-explorer",
    tags=["Learning journey"],
)


def require_science_profile(db: Session, user_id) -> None:
    profile = db.execute(
        select(
            StudentProfile.education_stage,
            StudentProfile.school_class,
            StudentProfile.study_group,
        ).where(StudentProfile.user_id == user_id)
    ).first()

    if (
        profile is None
        or profile.education_stage != "class_9_10"
        or profile.school_class not in (9, 10)
        or profile.study_group != "science"
    ):
        raise HTTPException(
            status_code=409,
            detail="Choose Class 9–10 and Science to start this journey.",
        )


def find_journey(db: Session, user_id, *, lock=False):
    statement = select(
        LearningJourney.id,
        LearningJourney.started_at,
    ).where(
        LearningJourney.user_id == user_id,
        LearningJourney.roadmap_id == ROADMAP_ID,
        LearningJourney.roadmap_version == ROADMAP_VERSION,
    )
    if lock:
        statement = statement.with_for_update()
    return db.execute(statement).first()


def read_journey(db: Session, user_id) -> JourneyResponse:
    journey = find_journey(db, user_id)
    saved = {}

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

    activities = [
        ActivityResponse(
            step_id=step_id,
            work_text=saved[step_id].work_text if step_id in saved else "",
            completed_at=(
                saved[step_id].completed_at if step_id in saved else None
            ),
            awarded_xp=saved[step_id].awarded_xp if step_id in saved else 0,
        )
        for step_id in STEP_IDS
    ]
    completed = sum(item.completed_at is not None for item in activities)

    return JourneyResponse(
        roadmap_id=ROADMAP_ID,
        roadmap_version=ROADMAP_VERSION,
        started_at=journey.started_at if journey else None,
        activities=activities,
        completed_count=completed,
        total_activities=len(STEP_IDS),
        total_xp=sum(item.awarded_xp for item in activities),
        progress_percent=completed * 100 // len(STEP_IDS),
        next_step_id=next(
            (
                item.step_id
                for item in activities
                if item.completed_at is None
            ),
            None,
        ),
    )


@router.get("", response_model=JourneyResponse)
def get_journey(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> JourneyResponse:
    try:
        return read_journey(db, user.id)
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Your journey is temporarily unavailable.",
        ) from None


@router.post("/start", response_model=JourneyResponse)
def start_journey(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> JourneyResponse:
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
        db.commit()
        return read_journey(db, user_id)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Your journey could not be started. Please try again.",
        ) from None


@router.put("/activities/{step_id}", response_model=JourneyResponse)
def save_activity(
    step_id: str,
    payload: SaveActivityRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> JourneyResponse:
    if step_id not in STEP_IDS:
        raise HTTPException(status_code=404, detail="Activity not found.")

    user_id = user.id
    try:
        require_science_profile(db, user_id)
        journey = find_journey(db, user_id, lock=True)

        if journey is None:
            raise HTTPException(
                status_code=409,
                detail="Start your journey before saving an activity.",
            )

        current = db.execute(
            select(LearningActivity.completed_at).where(
                LearningActivity.journey_id == journey.id,
                LearningActivity.step_id == step_id,
            )
        ).first()

        # Repeated completion requests never award more XP.
        if current is not None and current.completed_at is not None:
            if not payload.complete:
                raise HTTPException(
                    status_code=409,
                    detail="This activity is already completed.",
                )
            result = read_journey(db, user_id)
            db.commit()
            return result

        work = payload.work_text.strip()
        if payload.complete:
            if len(work) < 20:
                raise HTTPException(
                    status_code=422,
                    detail="Add at least 20 characters about your work.",
                )

            previous_steps = STEP_IDS[:STEP_IDS.index(step_id)]
            completed_steps = set(
                db.scalars(
                    select(LearningActivity.step_id).where(
                        LearningActivity.journey_id == journey.id,
                        LearningActivity.completed_at.is_not(None),
                    )
                ).all()
            )
            if any(item not in completed_steps for item in previous_steps):
                raise HTTPException(
                    status_code=409,
                    detail="Complete the earlier activities first.",
                )

        values = {
            "work_text": work,
            "awarded_xp": XP_PER_ACTIVITY if payload.complete else 0,
            "completed_at": func.now() if payload.complete else None,
            "updated_at": func.now(),
        }
        db.execute(
            insert(LearningActivity)
            .values(
                journey_id=journey.id,
                step_id=step_id,
                **values,
            )
            .on_conflict_do_update(
                index_elements=["journey_id", "step_id"],
                set_=values,
            )
        )

        result = read_journey(db, user_id)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Your work could not be saved. Please try again.",
        ) from None
