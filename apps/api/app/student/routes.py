from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.models import StudentProfile, User
from app.student.schemas import (
    StudentProfileRequest,
    StudentProfileResponse,
)


router = APIRouter(prefix="/student", tags=["Student profile"])


@router.get("/profile", response_model=StudentProfileResponse)
def get_profile(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentProfileResponse:
    try:
        profile = db.get(StudentProfile, user.id)
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Your student profile is temporarily unavailable.",
        ) from None

    return StudentProfileResponse(
        education_stage=profile.education_stage if profile else None,
    )


@router.put("/profile", response_model=StudentProfileResponse)
def save_profile(
    payload: StudentProfileRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentProfileResponse:
    try:
        statement = insert(StudentProfile).values(
            user_id=user.id,
            education_stage=payload.education_stage,
        )
        statement = statement.on_conflict_do_update(
            index_elements=[StudentProfile.user_id],
            set_={
                "education_stage": payload.education_stage,
                "updated_at": func.now(),
            },
        )
        db.execute(statement)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Your selection could not be saved. Please try again.",
        ) from None

    return StudentProfileResponse(
        education_stage=payload.education_stage,
    )
