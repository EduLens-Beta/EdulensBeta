from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.models import StudentProfile, User
from app.student.schemas import (
    SchoolDetailsRequest,
    SchoolDetailsResponse,
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
                "school_class": case(
                    (
                        StudentProfile.education_stage == payload.education_stage,
                        StudentProfile.school_class,
                    ),
                    else_=None,
                ),
                "study_group": case(
                    (
                        StudentProfile.education_stage == payload.education_stage,
                        StudentProfile.study_group,
                    ),
                    else_=None,
                ),
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


@router.get("/school-details", response_model=SchoolDetailsResponse)
def get_school_details(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SchoolDetailsResponse:
    try:
        profile = db.get(StudentProfile, user.id)
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Your school details are temporarily unavailable.",
        ) from None

    if profile is None or profile.education_stage != "class_9_10":
        raise HTTPException(
            status_code=409,
            detail="Choose Class 9–10 before adding school details.",
        )

    return SchoolDetailsResponse(
        school_class=profile.school_class,
        study_group=profile.study_group,
    )


@router.put("/school-details", response_model=SchoolDetailsResponse)
def save_school_details(
    payload: SchoolDetailsRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> SchoolDetailsResponse:
    try:
        result = db.execute(
            update(StudentProfile)
            .where(
                StudentProfile.user_id == user.id,
                StudentProfile.education_stage == "class_9_10",
            )
            .values(
                school_class=payload.school_class,
                study_group=payload.study_group,
                updated_at=func.now(),
            )
            .returning(StudentProfile.user_id)
        ).scalar_one_or_none()

        if result is None:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Choose Class 9–10 before adding school details.",
            )

        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Your school details could not be saved. Please try again.",
        ) from None

    return SchoolDetailsResponse(
        school_class=payload.school_class,
        study_group=payload.study_group,
    )
