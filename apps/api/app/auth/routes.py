from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
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


class AccountResponse(SignupResponse):
    is_admin: bool


class LoginResponse(BaseModel):
    session_token: str
    expires_at: datetime
    user: AccountResponse


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
                user=AccountResponse.model_validate(user),
            )
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Sign-in is temporarily unavailable.",
        ) from None

    return result


@router.get(
    "/me",
    response_model=AccountResponse,
    summary="Get the signed-in account",
)
def get_account(
    user: Annotated[User, Depends(get_current_user)],
) -> AccountResponse:
    return AccountResponse.model_validate(user)


@router.post(
    "/logout",
    status_code=204,
    response_class=Response,
    summary="Revoke the current session",
)
def logout(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> Response:
    if authorization is not None:
        scheme, separator, token = authorization.partition(" ")
        if separator and scheme.lower() == "bearer" and len(token) == 43:
            try:
                db.execute(
                    update(AuthSession)
                    .where(
                        AuthSession.token_hash == hash_session_token(token),
                        AuthSession.revoked_at.is_(None),
                    )
                    .values(revoked_at=func.now())
                )
                db.commit()
            except SQLAlchemyError:
                db.rollback()
                raise HTTPException(
                    status_code=503,
                    detail="Sign-out is temporarily unavailable.",
                ) from None

    return Response(
        status_code=204,
        headers={"Cache-Control": "no-store"},
    )
