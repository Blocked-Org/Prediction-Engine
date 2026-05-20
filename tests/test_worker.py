"""
tests/test_worker.py — Unit tests for Celery worker tasks.

Verifies:
- run_simulation_task correctly delegates to run_micro_simulation
- run_forecast_task correctly delegates to run_macro_forecast
- scrape_competitor_data correctly delegates to CompetitorScraper
- All tasks return properly serializable dict outputs
- Task failure propagates exceptions (so Celery marks them FAILURE)
"""

from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SIMULATION_PAYLOAD = {
    "Impressions": 10000.0,
    "Clicks": 500,
    "Spent": 1000.0,
    "Total_Conversion": 50,
    "age": "25-29",
    "gender": "M",
    "interest": "Travel",
}

FORECAST_PAYLOAD = {
    "historical_spend_data": [
        {"date": "2026-01-01", "channel": "Meta", "spend": 3000.0},
        {"date": "2026-02-01", "channel": "Google", "spend": 2000.0},
    ],
    "exogenous_factors": {"competitor_share_of_voice": 0.3},
}


# ---------------------------------------------------------------------------
# run_simulation_task
# ---------------------------------------------------------------------------


@patch("src.api.worker.run_micro_simulation")
def test_run_simulation_task_success(mock_run: MagicMock) -> None:
    """Task should call run_micro_simulation and return model_dump() dict."""
    from src.api.worker import run_simulation_task

    mock_response = MagicMock()
    mock_response.model_dump.return_value = {
        "projected_roi": 3.5,
        "incremental_roas": 1.8,
        "pareto_optimal_budgets": [{"Meta": 6000.0, "Google": 4000.0}],
    }
    mock_run.return_value = mock_response

    # Invoke the task function directly (bypass Celery broker)
    result = run_simulation_task(SIMULATION_PAYLOAD)

    mock_run.assert_called_once()
    assert result["projected_roi"] == 3.5
    assert result["incremental_roas"] == 1.8
    assert isinstance(result["pareto_optimal_budgets"], list)


@patch("src.api.worker.run_micro_simulation")
def test_run_simulation_task_propagates_exception(mock_run: MagicMock) -> None:
    """Task should re-raise so Celery records FAILURE state."""
    from src.api.worker import run_simulation_task

    mock_run.side_effect = RuntimeError("Engine error")

    with pytest.raises(RuntimeError, match="Engine error"):
        run_simulation_task(SIMULATION_PAYLOAD)


@patch("src.api.worker.run_micro_simulation")
def test_run_simulation_task_invalid_payload(mock_run: MagicMock) -> None:
    """Task should raise ValidationError for a missing required field."""
    from src.api.worker import run_simulation_task

    bad_payload = {"campaign_timeframe": ["2026-01-01", "2026-03-31"]}  # missing fields
    with pytest.raises(Exception):  # Pydantic ValidationError
        run_simulation_task(bad_payload)


# ---------------------------------------------------------------------------
# run_forecast_task
# ---------------------------------------------------------------------------


@patch("src.api.worker.run_macro_forecast")
def test_run_forecast_task_success(mock_forecast: MagicMock) -> None:
    """Task should call run_macro_forecast and return model_dump() dict."""
    from src.api.worker import run_forecast_task

    mock_response = MagicMock()
    mock_response.model_dump.return_value = {
        "baseline_sales": 120_000.0,
        "incremental_sales": 15_000.0,
        "confidence_interval": [110_000.0, 135_000.0],
    }
    mock_forecast.return_value = mock_response

    result = run_forecast_task(FORECAST_PAYLOAD)

    mock_forecast.assert_called_once()
    assert result["baseline_sales"] == 120_000.0
    assert "confidence_interval" in result


@patch("src.api.worker.run_macro_forecast")
def test_run_forecast_task_propagates_exception(mock_forecast: MagicMock) -> None:
    """Task should re-raise so Celery records FAILURE state."""
    from src.api.worker import run_forecast_task

    mock_forecast.side_effect = ValueError("PyMC divergence")

    with pytest.raises(ValueError, match="PyMC divergence"):
        run_forecast_task(FORECAST_PAYLOAD)


# ---------------------------------------------------------------------------
# scrape_competitor_data
# ---------------------------------------------------------------------------


def test_scrape_competitor_data_success() -> None:
    """Task should delegate to CompetitorScraper.scrape_and_ingest."""
    from src.api.worker import scrape_competitor_data

    with patch("src.preprocessing.web_scraper.CompetitorScraper") as MockScraper:
        instance = MockScraper.return_value
        instance.scrape_and_ingest.return_value = {
            "status": "ok",
            "url": "https://competitor.example.com",
            "records_ingested": 5,
        }

        result = scrape_competitor_data("https://competitor.example.com")

        instance.scrape_and_ingest.assert_called_once_with("https://competitor.example.com")
        assert result["status"] == "ok"
        assert result["records_ingested"] == 5


def test_scrape_competitor_data_propagates_exception() -> None:
    """Task should re-raise scraper exceptions."""
    from src.api.worker import scrape_competitor_data

    with patch("src.preprocessing.web_scraper.CompetitorScraper") as MockScraper:
        instance = MockScraper.return_value
        instance.scrape_and_ingest.side_effect = ConnectionError("Firecrawl timeout")

        with pytest.raises(ConnectionError, match="Firecrawl timeout"):
            scrape_competitor_data("https://competitor.example.com")
