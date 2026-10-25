from collections.abc import Iterator

from sqlalchemy.orm import Session

from app.database import get_engine


def get_db() -> Iterator[Session]:
    with Session(get_engine(), expire_on_commit=False) as session:
        yield session
