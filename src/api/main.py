"""
Optional FastAPI application stub kept opt-in via env vars.

Suggested future launch:
    uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8090

Uncomment routers once you finalize authentication and telemetry.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException

from src.api.schemas import ApiHealth, BatchPredictionRequest
from src.api.service import FastApiPredictionFacade

app = FastAPI(title="Marketing Regression Service", version="0.1.0")


def build_facade() -> FastApiPredictionFacade:
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
    global _facade_singleton
    if _facade_singleton is None:
        _facade_singleton = build_facade()
    return _facade_singleton


@app.get("/healthz", response_model=ApiHealth)
def health_check() -> ApiHealth:
    return ApiHealth(status="ok")


@app.post("/v1/predict/batch")
def predict_batch(payload: BatchPredictionRequest) -> dict:
    try:
        results = get_facade().predict_batch_payload(payload.records)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"results": results}

from pydantic import BaseModel
from rq import Queue
from redis import Redis

redis_conn = Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=int(os.getenv('REDIS_PORT', 6379)), password=os.getenv('REDIS_PASSWORD', 'please_change_this_redis_password'))
q = Queue(connection=redis_conn)

class SimulationRequest(BaseModel):
    budget: float
    num_channels: int

@app.post("/v1/simulate")
def start_simulation(payload: SimulationRequest):
    """Trigger background AI simulation."""
    from src.worker.tasks import run_full_simulation_task
    job = q.enqueue(run_full_simulation_task, payload.budget, payload.num_channels)
    return {"job_id": job.id, "status": "queued"}

@app.get("/v1/simulate/{job_id}")
def get_simulation_status(job_id: str):
    """Get the status of a background AI simulation."""
    job = q.fetch_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    response = {"job_id": job.id, "status": job.get_status()}
    if job.is_finished:
        response["result"] = job.result
    elif job.is_failed:
        response["error"] = "Job failed"
    return response
