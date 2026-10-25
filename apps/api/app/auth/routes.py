from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.auth.schemas import SignupRequest
from app.models import User
from app.security import hash_password


router = APIRouter(prefix="/auth", tags=["Authentication"])


class SignupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    created_at: datetime


@router.post(
    "/signup",
    status_code=201,
    response_model=SignupResponse,
    summary="Create an account",
)
def signup(
    payload: SignupRequest,
    db: Annotated[Session, Depends(get_db)],
) -> SignupResponse:
    password_hash = hash_password(payload.password.get_secret_value())

    try:
        with db.begin():
            user = User(
                name=payload.name,
                email=str(payload.email),
                password_hash=password_hash,
            )
            db.add(user)
            db.flush()
            result = SignupResponse.model_validate(user)
    except IntegrityError as error:
        diagnostic = getattr(error.orig, "diag", None)
        constraint = getattr(diagnostic, "constraint_name", None)

        if constraint == "uq_users_email":
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            ) from None

        raise HTTPException(
            status_code=500,
            detail="Account creation failed.",
        ) from None
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None

    return result
