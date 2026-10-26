import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.mark.parametrize(
    ("method", "path", "payload", "expected_status"),
    [
        ("GET", "/auth/me", None, 401),
        ("POST", "/auth/login", {}, 422),
        ("POST", "/auth/signup", {}, 422),
    ],
)
def test_auth_errors_are_not_cached(
    method, path, payload, expected_status
):
    with TestClient(app) as client:
        response = client.request(method, path, json=payload)

    assert response.status_code == expected_status
    assert response.headers["cache-control"] == "no-store"
