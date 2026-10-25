import pytest
from pydantic import ValidationError

from app.auth.schemas import SignupRequest


def valid_payload():
    return {
        "name": "Test Student",
        "email": "student@example.com",
        "password": "Example signup password!",
    }


def test_signup_normalizes_name_and_email():
    payload = valid_payload()
    payload.update(
        name="  Test Student  ",
        email=" Student+tag@Example.COM ",
    )

    request = SignupRequest(**payload)

    assert request.name == "Test Student"
    assert request.email == "student+tag@example.com"


def test_password_spaces_are_preserved_and_masked():
    payload = valid_payload()
    password = "  Example signup password!  "
    payload["password"] = password

    request = SignupRequest(**payload)

    assert request.password.get_secret_value() == password
    assert password not in repr(request)
    assert password not in request.model_dump_json()


@pytest.mark.parametrize(
    "email",
    ["not-an-email", "student@", "@example.com"],
)
def test_invalid_email_is_rejected(email):
    payload = valid_payload()
    payload["email"] = email

    with pytest.raises(ValidationError):
        SignupRequest(**payload)


@pytest.mark.parametrize("password", ["x" * 14, "x" * 129])
def test_password_outside_length_limits_is_rejected(password):
    payload = valid_payload()
    payload["password"] = password

    with pytest.raises(ValidationError):
        SignupRequest(**payload)


@pytest.mark.parametrize("name", ["", "   ", "x" * 121])
def test_invalid_name_is_rejected(name):
    payload = valid_payload()
    payload["name"] = name

    with pytest.raises(ValidationError):
        SignupRequest(**payload)


def test_unexpected_privilege_field_is_rejected():
    payload = valid_payload()
    payload["is_admin"] = True

    with pytest.raises(ValidationError):
        SignupRequest(**payload)


def test_unicode_password_is_accepted():
    payload = valid_payload()
    password = "আমার পরীক্ষার দীর্ঘ পাসওয়ার্ড 🔒"
    payload["password"] = password

    request = SignupRequest(**payload)

    assert request.password.get_secret_value() == password
