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

from src.api.schemas import (
    ApiHealth,
    BatchPredictionRequest,
    SimulationRequest,
    SimulationResponse,
    ForecastRequest,
    ForecastResponse
)
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


@app.post("/api/v1/simulate")
def simulate(payload: SimulationRequest) -> dict[str, str]:
    """
    Endpoint for Marketing Simulation. Enqueues a task to process the simulation.
    
    Args:
        payload (SimulationRequest): The request payload containing timeframe, 
            demographics, and budget allocation.
            
    Returns:
        dict: A dictionary containing the task ID and status.
            
    Raises:
        HTTPException: If an error occurs enqueuing the task.
    """
    try:
        logger.info(
            "Enqueuing simulation request for timeframe: %s to %s", 
            payload.campaign_timeframe[0], 
            payload.campaign_timeframe[1]
        )
        
        # Enqueue the Celery task
        task = run_simulation_task.delay(payload.model_dump())
        
        return {"task_id": task.id, "status": "processing"}
    except Exception as exc:
        logger.error("Error enqueuing simulation request: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error enqueuing simulation") from exc


@app.get("/api/v1/task/{task_id}")
def get_task_status(task_id: str) -> Any:
    """
    Retrieve the status and result of a Celery task.
    
    Args:
        task_id (str): The Celery task ID.
        
    Returns:
        Any: The task status. If successful, returns the SimulationResponse payload.
    """
    task_result = AsyncResult(task_id, app=celery_app)
    
    if task_result.state == "SUCCESS":
        # Validate and return the SimulationResponse
        return {
            "task_id": task_id,
            "status": task_result.state,
            "result": SimulationResponse(**task_result.result).model_dump()
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


@app.post("/api/v1/forecast", response_model=ForecastResponse)
def forecast(payload: ForecastRequest) -> ForecastResponse:
    """
    Endpoint for Sales Forecasting using Bayesian Marketing Mix Modeling.
    
    Args:
        payload (ForecastRequest): The request payload containing historical 
            spend data and exogenous factors.
            
    Returns:
        ForecastResponse: The forecast results including baseline sales, 
            incremental sales, and confidence intervals.
            
    Raises:
        HTTPException: If an error occurs during forecast processing.
    """
    try:
        from src.simulation.engine_runner import run_macro_forecast
        
        logger.info(
            "Received forecast request with %d historical spend records", 
            len(payload.historical_spend_data)
        )
        
        response = run_macro_forecast(payload)
        return response
        
    except Exception as exc:
        logger.error("Error processing forecast request: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error during forecasting") from exc
