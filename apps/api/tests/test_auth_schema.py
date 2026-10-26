import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, delete, insert, select
from sqlalchemy.exc import IntegrityError

from app.database import get_engine
from app.models import AuthSession, User


@pytest.fixture(scope="module")
def schema_engine():
    if os.environ.get("EDULENS_RUN_DB_TESTS") != "1":
        pytest.skip("Set EDULENS_RUN_DB_TESTS=1 to run PostgreSQL tests.")

    url = get_engine().url
    database_name = url.database or ""

    if not database_name.endswith(("_test", "_ci")):
        pytest.fail("Schema tests require a database ending in _test or _ci.")

    engine = create_engine(url, connect_args={"connect_timeout": 5})
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def connection(schema_engine):
    with schema_engine.connect() as conn:
        transaction = conn.begin()
        try:
            yield conn
        finally:
            transaction.rollback()


def add_user(connection, email=None):
    user_id = uuid4()
    connection.execute(
        insert(User).values(
            id=user_id,
            name="Schema Test Student",
            email=email or f"schema-{user_id.hex}@example.invalid",
            password_hash="test-only-placeholder-hash",
        )
    )
    return user_id


def session_values(user_id, **overrides):
    values = {
        "id": uuid4(),
        "user_id": user_id,
        "token_hash": uuid4().hex + uuid4().hex,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    values.update(overrides)
    return values


def assert_constraint(connection, statement, expected_name):
    with pytest.raises(IntegrityError) as error:
        with connection.begin_nested():
            connection.execute(statement)

    assert error.value.orig.diag.constraint_name == expected_name


def test_user_defaults_are_saved(connection):
    user_id = add_user(connection)
    row = connection.execute(
        select(User.__table__).where(User.id == user_id)
    ).mappings().one()

    assert row["is_active"] is True
    assert row["email_verified_at"] is None
    assert row["created_at"].tzinfo is not None
    assert row["updated_at"].tzinfo is not None


def test_duplicate_email_is_rejected(connection):
    email = f"duplicate-{uuid4().hex}@example.invalid"
    add_user(connection, email)

    assert_constraint(
        connection,
        insert(User).values(
            id=uuid4(),
            name="Another Student",
            email=email,
            password_hash="test-only-placeholder-hash",
        ),
        "uq_users_email",
    )


@pytest.mark.parametrize(
    "email",
    ["Student@example.invalid", " student@example.invalid "],
)
def test_non_normalized_email_is_rejected(connection, email):
    assert_constraint(
        connection,
        insert(User).values(
            id=uuid4(),
            name="Schema Test Student",
            email=email,
            password_hash="test-only-placeholder-hash",
        ),
        "ck_users_email_normalized",
    )


@pytest.mark.parametrize(
    ("overrides", "constraint_name"),
    [
        (
            {"token_hash": "invalid"},
            "ck_auth_sessions_token_hash_format",
        ),
        (
            {"expires_at": datetime(2000, 1, 1, tzinfo=timezone.utc)},
            "ck_auth_sessions_expiry_after_creation",
        ),
        (
            {"revoked_at": datetime(2000, 1, 1, tzinfo=timezone.utc)},
            "ck_auth_sessions_revocation_after_creation",
        ),
    ],
)
def test_invalid_session_is_rejected(
    connection, overrides, constraint_name
):
    user_id = add_user(connection)

    assert_constraint(
        connection,
        insert(AuthSession).values(**session_values(user_id, **overrides)),
        constraint_name,
    )


def test_session_requires_existing_user(connection):
    assert_constraint(
        connection,
        insert(AuthSession).values(**session_values(uuid4())),
        "fk_auth_sessions_user_id_users",
    )


def test_duplicate_session_token_hash_is_rejected(connection):
    user_id = add_user(connection)
    values = session_values(user_id)
    connection.execute(insert(AuthSession).values(**values))

    assert_constraint(
        connection,
        insert(AuthSession).values(
            **session_values(user_id, token_hash=values["token_hash"])
        ),
        "uq_auth_sessions_token_hash",
    )


def test_deleting_user_removes_their_sessions(connection):
    user_id = add_user(connection)
    values = session_values(user_id)
    connection.execute(insert(AuthSession).values(**values))

    assert connection.execute(
        select(AuthSession.id).where(AuthSession.id == values["id"])
    ).scalar_one() == values["id"]

    connection.execute(delete(User).where(User.id == user_id))

    assert connection.execute(
        select(AuthSession.id).where(AuthSession.id == values["id"])
    ).scalar_one_or_none() is None
