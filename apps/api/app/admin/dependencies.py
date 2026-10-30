from typing import Annotated

from fastapi import Depends, HTTPException

from app.auth.dependencies import get_current_user
from app.models import User


def require_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Administrator access required.",
        )
    return user
