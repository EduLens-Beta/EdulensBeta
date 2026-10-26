import hashlib
import re

from app.auth.tokens import generate_session_token, hash_session_token


def test_generated_token_contains_32_random_bytes() -> None:
    import base64

    token = generate_session_token()

    assert re.fullmatch(r"[A-Za-z0-9_-]{43}", token)
    assert len(base64.urlsafe_b64decode(token + "=")) == 32


def test_generated_tokens_differ() -> None:
    assert generate_session_token() != generate_session_token()


def test_token_hash_matches_sha256() -> None:
    token = "example-session-token"

    assert hash_session_token(token) == hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def test_hash_matches_database_format() -> None:
    token = generate_session_token()
    digest = hash_session_token(token)

    assert re.fullmatch(r"[0-9a-f]{64}", digest)
    assert digest != token


def test_hash_preserves_exact_token() -> None:
    assert hash_session_token("token") != hash_session_token(" token")
    assert hash_session_token("token") != hash_session_token("TOKEN")
