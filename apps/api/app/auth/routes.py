from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.auth.schemas import LoginRequest, SignupRequest
from app.auth.tokens import generate_session_token, hash_session_token
from app.models import AuthSession, User
from app.security import hash_password, verify_password


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


# Verify a real Argon2 hash even when the email does not exist.
_DUMMY_PASSWORD_HASH = hash_password(generate_session_token())


class LoginResponse(BaseModel):
    session_token: str
    expires_at: datetime
    user: SignupResponse


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Sign in and create a session",
)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> LoginResponse:
    try:
        with db.begin():
            user = db.scalar(
                select(User).where(User.email == str(payload.email))
            )
            stored_hash = (
                user.password_hash if user is not None
                else _DUMMY_PASSWORD_HASH
            )
            password_valid = verify_password(
                payload.password.get_secret_value(),
                stored_hash,
            )

            if user is None or not password_valid or not user.is_active:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password.",
                )

            token = generate_session_token()
            expires_at = datetime.now(UTC) + timedelta(hours=24)

            db.add(
                AuthSession(
                    user_id=user.id,
                    token_hash=hash_session_token(token),
                    expires_at=expires_at,
                )
            )
            db.flush()

            result = LoginResponse(
                session_token=token,
                expires_at=expires_at,
                user=SignupResponse.model_validate(user),
            )
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Sign-in is temporarily unavailable.",
        ) from None

    return result
