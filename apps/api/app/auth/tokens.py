import hashlib
import secrets


def generate_session_token() -> str:
    """Create an unpredictable token for a new session."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Produce the hexadecimal digest stored in PostgreSQL."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
