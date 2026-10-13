from fastapi.testclient import TestClient

from app.main import app


def test_liveness_returns_success() -> None:
    with TestClient(app) as client:
        response = client.get("/health/live")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    assert response.json() == {
        "status": "ok",
        "service": "edulens-api",
    }
