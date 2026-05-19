"""
Main FastAPI application entry point.

This module initializes the FastAPI application, configures middleware,
and defines the API routers for the Prediction Engine.
"""

from __future__ import annotations

import os
import logging
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
load_dotenv()  # Load .env before any os.getenv() calls

from celery.result import AsyncResult
from src.api.worker import celery_app, run_simulation_task

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.api.schemas import (
    ApiHealth,
    BatchPredictionRequest,
    SimulationRequest,
    SimulationResponse,
    ForecastRequest,
    ForecastResponse
)
from src.api.routes.simulate import router as simulate_router
from src.api.routes.report import router as report_router
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

# Configure CORS Middleware — locked to Dev A's Next.js port for integration day
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Middleware — aggressively compress large JSON payloads (SHAP arrays,
# Pareto optimal outputs) before they reach the frontend or LLM orchestration.
# minimum_size=500 avoids compressing tiny health-check responses.
app.add_middleware(GZipMiddleware, minimum_size=500)

app.include_router(simulate_router)
app.include_router(report_router)



def build_facade() -> FastApiPredictionFacade:
    """
    Build and return the FastApiPredictionFacade singleton instance.
    
    Returns:
        FastApiPredictionFacade: The initialized facade.
    """
    model_path = Path(os.environ.get("PE_MODEL_PATH", "models/xgb_pipeline.joblib")).expanduser()
    meta_path_raw = os.environ.get("PE_METADATA_PATH")
    metadata_path = Path(meta_path_raw).expanduser() if meta_path_raw else None
    background = Path(os.environ.get("PE_BACKGROUND_PARQUET", "data/processed/train.parquet")).expanduser()

    return FastApiPredictionFacade.from_paths(
        model_path=model_path,
        metadata_path=metadata_path,
        background_parquet=background,
        random_state=int(os.environ.get("PE_RANDOM_STATE", "42")),
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
    Live health-check endpoint. Probes Neo4j and Redis connectivity.
    Each probe is isolated — a failing service reports 'error' without crashing.
    
    Returns:
        dict: Overall status ('ok'/'degraded') and per-service statuses.
    """
    services: dict[str, str] = {}

    # --- Neo4j Probe ---
    try:
        from src.api.db.neo4j_client import Neo4jManager
        mgr = Neo4jManager()
        ok = mgr.verify_connectivity()
        services["neo4j"] = "ok" if ok else "error"
    except Exception as exc:
        logger.warning("Neo4j health probe failed: %s", exc)
        services["neo4j"] = "error"
    finally:
        try:
            mgr.close()  # type: ignore[possibly-undefined]
        except Exception:
            pass

    # --- Redis Probe ---
    try:
        import redis as redis_lib
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = redis_lib.from_url(redis_url, socket_connect_timeout=2)
        r.ping()
        services["redis"] = "ok"
    except Exception as exc:
        logger.warning("Redis health probe failed: %s", exc)
        services["redis"] = "error"

    overall = "ok" if all(v == "ok" for v in services.values()) else "degraded"
    return {"status": overall, "services": services}


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
def get_task_status(task_id: str) -> Any:
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
                cache.set("simulate:micro", result, validated)
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

