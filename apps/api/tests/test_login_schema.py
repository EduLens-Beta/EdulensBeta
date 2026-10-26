import pytest
from pydantic import ValidationError

from app.auth.schemas import LoginRequest


def test_normalizes_email() -> None:
    payload = LoginRequest(
        email="Student@Example.COM",
        password="a test password",
    )

    assert str(payload.email) == "student@example.com"


def test_preserves_password_exactly() -> None:
    password = "  My Unicode password বাংলা  "
    payload = LoginRequest(
        email="student@example.com",
        password=password,
    )

    assert payload.password.get_secret_value() == password
    assert password not in repr(payload)


@pytest.mark.parametrize(
    "changes",
    [
        {"email": "invalid"},
        {"password": ""},
        {"password": "x" * 129},
        {"is_active": True},
    ],
)
def test_rejects_invalid_input(changes: dict[str, object]) -> None:
    values = {
        "email": "student@example.com",
        "password": "a test password",
    }
    values.update(changes)

    with pytest.raises(ValidationError):
        LoginRequest.model_validate(values)
