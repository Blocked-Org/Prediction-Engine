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

# Configure CORS Middleware
# Allows requests from the Next.js frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
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
    Basic health-check endpoint.
    
    Returns:
        dict: A dictionary containing the overall status and service statuses.
    """
    try:
        return {
            "status": "ok",
            "services": {
                "redis": "pending",
                "neo4j": "pending"
            }
        }
    except Exception as exc:
        logger.error("Health check failed: %s", exc)
        raise HTTPException(status_code=500, detail="Health check failed") from exc


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


@app.post("/api/v1/simulate", response_model=SimulationResponse)
def simulate(payload: SimulationRequest) -> SimulationResponse:
    """
    Mock endpoint for Marketing Simulation.
    
    Args:
        payload (SimulationRequest): The request payload containing timeframe, 
            demographics, and budget allocation.
            
    Returns:
        SimulationResponse: The mock simulation results including ROI, ROAS, 
            and optimal budget allocations.
            
    Raises:
        HTTPException: If an error occurs during simulation processing.
    """
    # NOTE: These are mock routes for Day 1 of the hackathon and will be wired to Celery tasks on Day 6.
    try:
        logger.info(
            "Received simulation request for timeframe: %s to %s", 
            payload.campaign_timeframe[0], 
            payload.campaign_timeframe[1]
        )
        
        mock_response = SimulationResponse(
            projected_roi=2.5,
            incremental_roas=1.8,
            pareto_optimal_budgets=[
                {"meta_ads": 1000.0, "google_ads": 2000.0},
                {"meta_ads": 1500.0, "google_ads": 1500.0}
            ]
        )
        return mock_response
    except Exception as exc:
        logger.error("Error processing simulation request: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error during simulation") from exc


@app.post("/api/v1/forecast", response_model=ForecastResponse)
def forecast(payload: ForecastRequest) -> ForecastResponse:
    """
    Mock endpoint for Sales Forecasting.
    
    Args:
        payload (ForecastRequest): The request payload containing historical 
            spend data and exogenous factors.
            
    Returns:
        ForecastResponse: The mock forecast results including baseline sales, 
            incremental sales, and confidence intervals.
            
    Raises:
        HTTPException: If an error occurs during forecast processing.
    """
    # NOTE: These are mock routes for Day 1 of the hackathon and will be wired to Celery tasks on Day 6.
    try:
        logger.info(
            "Received forecast request with %d historical spend records", 
            len(payload.historical_spend_data)
        )
        
        mock_response = ForecastResponse(
            baseline_sales=50000.0,
            incremental_sales=12000.50,
            confidence_interval=(45000.0, 65000.0)
        )
        return mock_response
    except Exception as exc:
        logger.error("Error processing forecast request: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error during forecasting") from exc
