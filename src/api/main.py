"""
Main FastAPI application entry point.

This module initializes the FastAPI application, configures middleware,
and defines the API routers for the Prediction Engine.
"""

from __future__ import annotations

# ── Fix matplotlib cache BEFORE any transitive import touches it ──
import os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
os.environ.setdefault("MPLBACKEND", "Agg")

import logging
from pathlib import Path
from typing import Any

from src.api.config import get_settings

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.api.schemas import (
    ApiHealth,
    BatchPredictionRequest,
    SimulationResponse,
    ForecastRequest,
    ForecastResponse
)
from src.api.routes.simulate import router as simulate_router
from src.api.routes.report import router as report_router
from src.api.routes.keys import router as keys_router
from src.api.routes.analytics import router as analytics_router
from src.api.routes.docs import router as docs_router
from src.api.service import FastApiPredictionFacade

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title="Prediction Engine API", 
    version="0.1.0",
    description="Graph-Augmented Bayesian Simulation Engine API"
)

# Configure CORS Middleware
_cors_origins = [
    "http://localhost:3000",
    # Allow all Vercel preview and production deployments
    *[
        origin
        for origin in [os.environ.get("FRONTEND_URL", "")]
        if origin
    ],
]
# Also accept any *.vercel.app origin via regex
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Middleware — aggressively compress large JSON payloads (SHAP arrays,
# Pareto optimal outputs) before they reach the frontend or LLM orchestration.
# minimum_size=500 avoids compressing tiny health-check responses.
app.add_middleware(GZipMiddleware, minimum_size=500)

# NOTE: Clerk auth is enforced per-route via Depends(get_current_tenant),
# NOT via global middleware. This allows existing unauthenticated routes to
# continue working while new routes opt-in to tenant-scoped auth.
# See src/api/auth.py for the get_current_tenant dependency.


app.include_router(simulate_router)
app.include_router(report_router)
app.include_router(keys_router)
app.include_router(analytics_router)
app.include_router(docs_router)



def build_facade() -> FastApiPredictionFacade:
    """
    Build and return the FastApiPredictionFacade singleton instance.
    
    Returns:
        FastApiPredictionFacade: The initialized facade.
    """
    settings = get_settings()
    model_path = Path(settings.PE_MODEL_PATH).expanduser()
    meta_path_raw = settings.PE_METADATA_PATH
    metadata_path = Path(meta_path_raw).expanduser() if meta_path_raw else None
    background = Path(settings.PE_BACKGROUND_PARQUET).expanduser()

    return FastApiPredictionFacade.from_paths(
        model_path=model_path,
        metadata_path=metadata_path,
        background_parquet=background,
        random_state=settings.PE_RANDOM_STATE,
    )


_facade_singleton: FastApiPredictionFacade | None = None


def get_facade() -> FastApiPredictionFacade:
    """
    Retrieve or build the FastApiPredictionFacade singleton.
    
    Returns:
        FastApiPredictionFacade: The active facade instance.
    """
    global _facade_singleton
    if _facade_singleton is None:
        _facade_singleton = build_facade()
    return _facade_singleton


@app.get("/health")
def health_check() -> dict[str, Any]:
    """
    Live health-check endpoint. Probes PostgreSQL and Redis connectivity.
    Each probe is isolated — a failing service reports 'error' without crashing.
    
    Returns:
        dict: Overall status ('ok'/'degraded') and per-service statuses.
    """
    services: dict[str, str] = {}
    environment = "unknown"

    # --- Database Probe (PostgreSQL or SQLite) ---
    try:
        from src.api.db.database import engine, _is_sqlite
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_label = "sqlite" if _is_sqlite else "postgres"
        services[db_label] = "ok"
    except Exception as exc:
        logger.warning("Database health probe failed: %s", exc)
        services["database"] = "error"

    # --- Redis Probe ---
    try:
        import redis as redis_lib
        settings = get_settings()
        environment = settings.ENVIRONMENT
        r = redis_lib.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.ping()
        services["redis"] = "ok"
    except Exception as exc:
        logger.warning("Redis health probe failed: %s", exc)
        services["redis"] = "error"

    overall = "ok" if all(v == "ok" for v in services.values()) else "degraded"
    return {
        "status": overall,
        "services": services,
        "version": app.version,
        "environment": environment
    }


@app.get("/healthz", response_model=ApiHealth)
def health_check_legacy() -> ApiHealth:
    """
    Legacy health-check endpoint.
    
    Returns:
        ApiHealth: Health status.
    """
    return ApiHealth(status="ok")


@app.post("/v1/predict/batch")
def predict_batch(payload: BatchPredictionRequest) -> dict[str, Any]:
    """
    Batch prediction endpoint.
    
    Args:
        payload (BatchPredictionRequest): The batch prediction request payload.
        
    Returns:
        dict: A dictionary containing the prediction results.
        
    Raises:
        HTTPException: If an error occurs during batch prediction.
    """
    try:
        results = get_facade().predict_batch_payload(payload.records)
        return {"results": results}
    except KeyError as exc:
        logger.error("Invalid prediction payload: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Runtime error during batch prediction: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected error during batch prediction: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error") from exc


# The simulate endpoint has been moved to src/api/routes/simulate.py


@app.get("/api/v1/task/{task_id}")
async def get_task_status(task_id: str) -> Any:
    """
    Retrieve the status and result of a Celery task.
    Supports both simulation and forecast tasks.
    
    Completed results are persisted to Redis so that subsequent
    identical simulation requests can skip the Celery round-trip.
    
    Args:
        task_id (str): The Celery task ID.
        
    Returns:
        Any: The task status. If successful, returns the result payload.
    """
    from celery.result import AsyncResult
    from src.api.worker import celery_app
    task_result = AsyncResult(task_id, app=celery_app)
    
    if task_result.state == "SUCCESS":
        result = task_result.result
        # Attempt to validate as SimulationResponse, fallback to raw result
        try:
            validated = SimulationResponse(**result).model_dump()
        except Exception:
            # May be a ForecastResponse or other result type
            validated = result

        # ── Cache the completed result ───────────────────────────────
        try:
            from src.api.cache import get_simulation_cache
            cache = get_simulation_cache()
            # We cache under the result key so that if the original params
            # hash is unavailable we can still serve it next time around.
            if isinstance(result, dict):
                await cache.set("simulate:micro", result, validated)
        except Exception as cache_exc:
            logger.warning("Failed to cache task result: %s", cache_exc)

        return {
            "task_id": task_id,
            "status": task_result.state,
            "result": validated
        }
    elif task_result.state == "FAILURE":
        return {
            "task_id": task_id,
            "status": task_result.state,
            "error": str(task_result.info)
        }
    else:
        return {
            "task_id": task_id,
            "status": task_result.state
        }


@app.post("/api/v1/forecast", status_code=202)
def forecast_async(payload: ForecastRequest) -> dict[str, str]:
    """
    Async endpoint for Sales Forecasting using Bayesian MMM.
    
    Enqueues the PyMC inference to Celery to avoid blocking the main
    FastAPI thread (PyMC sample_prior_predictive with 200 draws can take
    5-30+ seconds under load).
    
    Returns HTTP 202 Accepted with a task_id for polling via /api/v1/task/{id}.
    """
    try:
        from src.api.worker import run_forecast_task

        logger.info(
            "Enqueuing forecast request with %d historical spend records", 
            len(payload.historical_spend_data)
        )
        
        task = run_forecast_task.delay(payload.model_dump())
        return {"task_id": task.id, "status": "processing"}
        
    except Exception as exc:
        logger.error("Error enqueuing forecast request: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error enqueuing forecast") from exc


@app.post("/api/v1/forecast/sync", response_model=ForecastResponse)
def forecast_sync(payload: ForecastRequest) -> ForecastResponse:
    """
    Synchronous fallback for small/quick forecast requests.
    
    WARNING: This runs PyMC inference in the main thread. Use only for 
    development, demos, or payloads with < 10 historical records. 
    Production traffic should use the async /api/v1/forecast endpoint.
    """
    try:
        from src.simulation.engine_runner import run_macro_forecast
        
        logger.info(
            "Running SYNC forecast with %d historical spend records", 
            len(payload.historical_spend_data)
        )
        
        response = run_macro_forecast(payload)
        return response
        
    except Exception as exc:
        logger.error("Error processing sync forecast request: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error during forecasting") from exc

