"""
src/worker/tasks.py — Celery task definitions wired to the real simulation engines.

This module is the canonical entry point for background simulation work.
All heavy computation (PyMC, ABM, Markov, NSGA-II, SHAP) runs here —
NOT in the FastAPI ASGI thread.

Two Celery apps co-exist in this repo:
  • src/worker/main.py   — the "standalone" Celery app (legacy, broker-only config)
  • src/api/worker.py    — the "API-coupled" worker (imports engine_runner directly)

This file plugs the gap in src/worker/main.py by wiring its tasks to the
real engine pipeline, matching the contract established by src/api/worker.py.
"""

import logging
from typing import Any, Dict

from src.worker.main import celery_app

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Task 1: Full Micro + Macro Simulation Pipeline
# ─────────────────────────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.run_full_simulation_task",
    bind=True,
    soft_time_limit=120,
    time_limit=180,
    max_retries=1,
)
def run_full_simulation_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Background Celery task: execute the complete simulation pipeline.

    Pipeline sequence:
        1. Deserialise payload into SimulationRequest (Pydantic-validated)
        2. ABM (Mesa 3.0) — 1 000 agents, 10 simulation steps
        3. Markov Chain attribution — transition matrix + Removal Effect
        4. _fetch_competitor_proxy() — reads CompetitorContext count from Neo4j
        5. Bayesian MMM (PyMC-Marketing) — 50-draw prior predictive
        6. NSGA-II budget optimisation (pymoo) — Pareto frontier
        7. Return SimulationResponse-compatible dict

    Time limits:
        Soft: 120 s  → raises SoftTimeLimitExceeded (allows cleanup)
        Hard: 180 s  → Celery kills the process outright

    Args:
        payload: JSON-serialisable dict matching SimulationRequest fields.

    Returns:
        dict: SimulationResponse fields (projected_roi, incremental_roas,
              pareto_optimal_budgets).
    """
    logger.info("Task %s: starting full simulation pipeline.", self.request.id)

    # Lazy imports — keeps worker startup fast; heavy libs load only when needed
    from src.api.schemas import SimulationRequest
    from src.simulation.engine_runner import run_micro_simulation

    try:
        request = SimulationRequest(**payload)
        response = run_micro_simulation(request)
        result = response.model_dump()
        logger.info("Task %s: simulation completed successfully.", self.request.id)
        return result

    except Exception as exc:
        logger.error(
            "Task %s: simulation failed — %s", self.request.id, exc, exc_info=True
        )
        raise self.retry(exc=exc, countdown=5) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Task 2: Bayesian MMM Macro Forecast
# ─────────────────────────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.run_forecast_task",
    bind=True,
    soft_time_limit=120,
    time_limit=180,
    max_retries=1,
)
def run_forecast_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Background Celery task: execute Bayesian MMM macro forecast.

    Offloads PyMC sample_prior_predictive (200 draws) from the main ASGI
    thread. Draws take 5–30 s depending on channel count and exogenous factors.

    Args:
        payload: JSON-serialisable dict matching ForecastRequest fields.

    Returns:
        dict: ForecastResponse fields (baseline_sales, incremental_sales,
              confidence_interval).
    """
    logger.info("Task %s: starting macro forecast.", self.request.id)

    from src.api.schemas import ForecastRequest
    from src.simulation.engine_runner import run_macro_forecast

    try:
        request = ForecastRequest(**payload)
        response = run_macro_forecast(request)
        result = response.model_dump()
        logger.info("Task %s: forecast completed successfully.", self.request.id)
        return result

    except Exception as exc:
        logger.error(
            "Task %s: forecast failed — %s", self.request.id, exc, exc_info=True
        )
        raise self.retry(exc=exc, countdown=5) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Task 3: Competitor Intelligence Scraping → Neo4j Ingestion
# ─────────────────────────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.scrape_competitor_data_task",
    bind=True,
    soft_time_limit=60,
    time_limit=90,
)
def scrape_competitor_data_task(self, url: str) -> Dict[str, Any]:
    """
    Background Celery task: scrape competitor intelligence via Firecrawl/Crawl4AI
    and ingest the extracted markdown into Neo4j as a CompetitorContext node.

    The engine_runner._fetch_competitor_proxy() reads the node count from
    Neo4j in every simulation run, so keeping this data fresh directly
    improves simulation accuracy.

    Args:
        url: The competitor URL to scrape.

    Returns:
        dict: Execution status, URL, and byte count.
    """
    logger.info("Task %s: scraping competitor URL: %s", self.request.id, url)

    from src.preprocessing.web_scraper import CompetitorScraper

    try:
        scraper = CompetitorScraper()
        result = scraper.scrape_and_ingest(url)
        logger.info("Task %s: scraping completed — %s", self.request.id, result)
        return result
    except Exception as exc:
        logger.error(
            "Task %s: scraping failed — %s", self.request.id, exc, exc_info=True
        )
        return {"status": "error", "url": url, "message": str(exc)}
