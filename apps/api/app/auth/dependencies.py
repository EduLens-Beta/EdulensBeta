import re
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from sqlalchemy.orm import Session

from app.database import get_engine
from app.auth.tokens import hash_session_token
from app.models import AuthSession, User


def get_db() -> Iterator[Session]:
    with Session(get_engine(), expire_on_commit=False) as session:
        yield session


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=401,
        detail="Authentication required.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if authorization is None:
        raise unauthorized

    scheme, separator, token = authorization.partition(" ")
    if (
        not separator
        or scheme.lower() != "bearer"
        or re.fullmatch(r"[A-Za-z0-9_-]{43}", token) is None
    ):
        raise unauthorized

    try:
        user = db.scalar(
            select(User)
            .join(AuthSession, AuthSession.user_id == User.id)
            .where(
                AuthSession.token_hash == hash_session_token(token),
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > func.now(),
                User.is_active.is_(True),
            )
        )
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Authentication is temporarily unavailable.",
        ) from None

    if user is None:
        raise unauthorized

    return user
