from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app import database
from app.main import app


def test_readiness_returns_success_when_query_succeeds(monkeypatch) -> None:
    engine = MagicMock()
    connection = engine.connect.return_value.__enter__.return_value
    connection.execute.return_value.scalar_one.return_value = 1
    monkeypatch.setattr(database, "get_engine", lambda: engine)

    with TestClient(app) as client:
        response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "ready",
    }
    connection.execute.assert_called_once()


def test_database_failure_returns_503_but_liveness_still_works(
    monkeypatch,
) -> None:
    engine = MagicMock()
    engine.connect.side_effect = OperationalError(
        "SELECT 1",
        {},
        Exception("private connection details"),
    )
    monkeypatch.setattr(database, "get_engine", lambda: engine)

    with TestClient(app) as client:
        readiness = client.get("/health/ready")
        liveness = client.get("/health/live")

    assert readiness.status_code == 503
    assert readiness.json() == {
        "status": "unavailable",
        "database": "unavailable",
    }
    assert "private connection details" not in readiness.text
    assert liveness.status_code == 200
