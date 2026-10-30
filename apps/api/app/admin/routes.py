from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.admin.dependencies import require_admin
from app.admin.schemas import AdminAccountListResponse, AdminAccountResponse
from app.auth.dependencies import get_db
from app.models import StudentProfile, User


router = APIRouter(
    prefix="/admin",
    tags=["Administration"],
    dependencies=[Depends(require_admin)],
)


@router.get("/accounts", response_model=AdminAccountListResponse)
def list_accounts(
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AdminAccountListResponse:
    try:
        total = db.scalar(select(func.count()).select_from(User)) or 0

        rows = db.execute(
            select(User, StudentProfile)
            .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
            .order_by(User.created_at.desc(), User.id.desc())
            .limit(limit)
            .offset(offset)
        ).all()

        accounts = [
            AdminAccountResponse(
                id=user.id,
                name=user.name,
                email=user.email,
                is_active=user.is_active,
                is_admin=user.is_admin,
                created_at=user.created_at,
                education_stage=profile.education_stage if profile else None,
                school_class=profile.school_class if profile else None,
                study_group=profile.study_group if profile else None,
            )
            for user, profile in rows
        ]
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Account information is temporarily unavailable.",
        ) from None

    return AdminAccountListResponse(
        accounts=accounts,
        total=total,
        limit=limit,
        offset=offset,
    )
