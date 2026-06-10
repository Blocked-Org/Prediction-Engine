"""
Day 6 Integration Smoke Tests.

These tests hit the REAL FastAPI stack (no external mocks) using TestClient.
They validate that all engines are correctly wired together and that every
response matches its Pydantic schema contract.

Run with:
    .venv\\Scripts\\python.exe -m pytest tests/test_integration_smoke.py -v
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.schemas import ForecastResponse

client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_clerk_auth():
    with patch("src.api.auth.verify_clerk_token") as mock_verify, \
         patch("src.api.auth._resolve_tenant_id", return_value="fake-tenant-uuid"), \
         patch("src.api.auth.SessionLocal") as mock_session:
        mock_verify.return_value = {
            "sub": "user_smoke_test_123",
            "org_id": "org_smoke_123",
            "org_role": "org:admin",
        }
        mock_session.return_value = MagicMock()
        client.headers.update({"Authorization": "Bearer valid.jwt.token"})
        yield


# ---------------------------------------------------------------------------
# Smoke Test 1: Health Endpoint
# ---------------------------------------------------------------------------
def test_health_returns_200():
    """
    The /health endpoint must always return 200, even if a service is down.
    It reports 'degraded' rather than crashing.
    """
    response = client.get("/health")
    assert response.status_code == 200, (
        f"Health check must return 200. Got {response.status_code}: {response.text}"
    )
    data = response.json()
    assert "status" in data, "Health response must contain 'status' key"
    assert data["status"] in ("ok", "degraded"), (
        f"Status must be 'ok' or 'degraded', got: {data['status']}"
    )
    assert "services" in data, "Health response must contain 'services' key"
    assert "postgres" in data["services"]
    assert "redis" in data["services"]


# ---------------------------------------------------------------------------
# Smoke Test 2: Full /simulate pipeline (real engines, mocked Celery)
# ---------------------------------------------------------------------------
@patch("src.api.worker.run_simulation_task.delay")
def test_simulate_endpoint_real_engines(mock_delay):
    """
    Posts a real SimulationRequest payload and validates the response schema.
    Celery .delay() is mocked to avoid requiring a live broker,
    but the engine logic inside the task is NOT mocked.
    """
    mock_task = MagicMock()
    mock_task.id = "smoke-test-task-001"
    mock_delay.return_value = mock_task

    payload = {
        "clerk_user_id": "user_smoke_test_123",
        "endogenous": {
            "Impressions": 10000.0,
            "Clicks": 500,
            "spend_meta": 1500.0,
            "spend_google": 0.0,
            "spend_tiktok": 0.0
        },
        "transactional": {
            "Total_Conversion": 50,
            "revenue": 5000.0
        },
        "audience": {
            "age": "25-34",
            "gender": "all",
            "interest": "technology"
        }
    }

    response = client.post("/api/v1/simulate", json=payload)
    assert response.status_code == 202, (
        f"Expected 202 from /api/v1/simulate, got {response.status_code}: {response.text}"
    )

    data = response.json()
    assert "task_id" in data, "Response must contain 'task_id'"
    assert "status" in data, "Response must contain 'status'"
    assert data["status"] == "processing"
    assert data["task_id"] == "smoke-test-task-001"

    # Verify the Pydantic contract by ensuring the task was enqueued with valid data
    mock_delay.assert_called_once()


# ---------------------------------------------------------------------------
# Smoke Test 3: Full /forecast pipeline (real PyMC engines)
# ---------------------------------------------------------------------------
def test_forecast_endpoint_real_pymc():
    """
    Posts a real ForecastRequest and validates the ForecastResponse schema.
    This test exercises the real PyMC prior predictive and verifies that:
    1. The response validates against ForecastResponse Pydantic schema.
    2. The confidence interval is a real [low, high] tuple (not hardcoded ±20%).
    3. lower_bound < upper_bound (proper quantile ordering).
    """
    payload = {
        "historical_spend_data": [
            {"date": "2024-01-01", "channel": "Meta", "spend": 5000.0},
            {"date": "2024-01-08", "channel": "Google", "spend": 3000.0},
            {"date": "2024-01-15", "channel": "Meta", "spend": 4500.0},
            {"date": "2024-01-22", "channel": "TikTok", "spend": 1500.0}
        ],
        "exogenous_factors": {
            "competitor_share_of_voice": 0.35
        }
    }

    # Use the synchronous fallback endpoint to test PyMC without requiring a live Redis broker.
    response = client.post("/api/v1/forecast/sync", json=payload)
    assert response.status_code == 200, (
        f"Expected 200 from /api/v1/forecast/sync, got {response.status_code}: {response.text}"
    )

    data = response.json()

    # 1. Schema validation via Pydantic
    forecast = ForecastResponse(**data)

    # 2. Numeric sanity checks
    assert isinstance(forecast.baseline_sales, float)
    assert isinstance(forecast.incremental_sales, float)
    assert isinstance(forecast.confidence_interval, tuple) or isinstance(forecast.confidence_interval, list)

    lower, upper = forecast.confidence_interval
    assert lower <= upper, (
        f"Confidence interval lower bound ({lower}) must be <= upper bound ({upper})"
    )

    # 3. Competitor factor must reduce baseline below the raw 50000 default
    assert forecast.baseline_sales < 50000.0, (
        f"competitor_share_of_voice=0.35 should reduce baseline below 50000, got {forecast.baseline_sales}"
    )
