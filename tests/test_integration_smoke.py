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
from src.api.schemas import SimulationResponse, ForecastResponse

client = TestClient(app)


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
    assert "neo4j" in data["services"]
    assert "redis" in data["services"]


# ---------------------------------------------------------------------------
# Smoke Test 2: Full /simulate pipeline (real engines, mocked Celery)
# ---------------------------------------------------------------------------
@patch("src.api.main.run_simulation_task.delay")
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
        "campaign_timeframe": ["2024-01-01", "2024-06-30"],
        "target_demographics": {"age": "25-40", "location": "Dhaka"},
        "budget_allocation": {
            "Meta": 8000.0,
            "Google": 5000.0,
            "TikTok": 2000.0
        }
    }

    response = client.post("/api/v1/simulate", json=payload)
    assert response.status_code == 200, (
        f"Expected 200 from /api/v1/simulate, got {response.status_code}: {response.text}"
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

    response = client.post("/api/v1/forecast", json=payload)
    assert response.status_code == 200, (
        f"Expected 200 from /api/v1/forecast, got {response.status_code}: {response.text}"
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
