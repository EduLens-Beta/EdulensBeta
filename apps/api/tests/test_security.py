import pytest

from app.security import hash_password, verify_password


def test_password_hash_uses_argon2id_and_verifies():
    password = "Example password for tests!"
    password_hash = hash_password(password)

    assert password_hash.startswith("$argon2id$")
    assert password_hash != password
    assert verify_password(password, password_hash) is True


def test_wrong_password_is_rejected():
    password_hash = hash_password("Correct example password")

    assert verify_password("Wrong example password", password_hash) is False


def test_same_password_gets_different_salts():
    password = "Same example password"
    first_hash = hash_password(password)
    second_hash = hash_password(password)

    assert first_hash != second_hash
    assert verify_password(password, first_hash) is True
    assert verify_password(password, second_hash) is True


@pytest.mark.parametrize("password_hash", ["", "$argon2id$broken"])
def test_invalid_stored_hash_is_rejected(password_hash):
    assert verify_password("Example password", password_hash) is False


def test_password_spaces_are_preserved():
    password = "  Example password with spaces  "
    password_hash = hash_password(password)

    assert verify_password(password, password_hash) is True
    assert verify_password(password.strip(), password_hash) is False


def test_unicode_password_verifies():
    password = "আমার পরীক্ষার পাসওয়ার্ড 🔒"
    password_hash = hash_password(password)

    assert verify_password(password, password_hash) is True
    assert verify_password(password + "x", password_hash) is False
