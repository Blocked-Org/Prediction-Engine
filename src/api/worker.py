import os
import logging
from typing import Any, Dict

from celery import Celery

from src.api.schemas import SimulationRequest
from src.simulation.engine_runner import run_micro_simulation

# Configure logger
logger = logging.getLogger(__name__)

# Initialize Celery app using REDIS_URL from the environment
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "prediction_engine_worker",
    broker=redis_url,
    backend=redis_url
)

# Optional: Configure Celery serialization to ensure JSON is used
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="run_simulation_task", bind=True)
def run_simulation_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Celery task to run the micro-simulation asynchronously.
    
    Args:
        payload (Dict[str, Any]): A JSON dictionary containing the simulation request parameters.
        
    Returns:
        Dict[str, Any]: The simulation response as a JSON dictionary.
    """
    logger.info(f"Task {self.request.id} started simulation.")
    try:
        # Unpack the JSON dictionary into the Pydantic SimulationRequest model
        request = SimulationRequest(**payload)
        
        # Pass it to the engine runner
        response = run_micro_simulation(request)
        
        # Return the dictionary output for serialization
        logger.info(f"Task {self.request.id} completed successfully.")
        return response.model_dump()
        
    except Exception as e:
        logger.error(f"Task {self.request.id} failed: {e}", exc_info=True)
        # Re-raise so Celery catches the failure
        raise
