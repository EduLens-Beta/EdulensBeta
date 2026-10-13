from functools import lru_cache

from sqlalchemy import URL, Engine, create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()

    url = URL.create(
        drivername="postgresql+psycopg",
        username=settings.postgres_user,
        password=settings.postgres_password.get_secret_value(),
        host=settings.postgres_host,
        port=settings.postgres_port,
        database=settings.postgres_db,
    )

    return create_engine(
        url,
        pool_pre_ping=True,
        pool_timeout=5,
        connect_args={
            "connect_timeout": 3,
            "options": "-c statement_timeout=3000",
        },
    )


def database_is_ready() -> bool:
    try:
        with get_engine().connect() as connection:
            return connection.execute(text("SELECT 1")).scalar_one() == 1
    except SQLAlchemyError:
        return False
