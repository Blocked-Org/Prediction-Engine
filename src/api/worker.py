import os
import logging
from typing import Any, Dict

from dotenv import load_dotenv
load_dotenv()  # Must run before os.getenv('REDIS_URL') below

from celery import Celery  # noqa: E402

from src.api.schemas import SimulationRequest, ForecastRequest  # noqa: E402
from src.simulation.engine_runner import run_micro_simulation, run_macro_forecast  # noqa: E402

# Configure logger
logger = logging.getLogger(__name__)

# Initialize Celery app using REDIS_URL from environment / .env
# The URL MUST include the password component, e.g. redis://:mypassword@localhost:6379/0
redis_url = os.getenv("REDIS_URL", "redis://:1234@localhost:6379/0")

celery_app = Celery(
    "prediction_engine_worker",
    broker=redis_url,
    backend=redis_url
)

# Configure Celery serialization and task behavior
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Global task time limits for production safety
    task_soft_time_limit=120,   # Soft limit: 2 minutes — raises SoftTimeLimitExceeded
    task_time_limit=180,        # Hard limit: 3 minutes — kills the task
    # Result expiry: clean up completed results after 1 hour
    result_expires=3600,
    # Prefetch 1 task at a time per worker (heavy compute tasks)
    worker_prefetch_multiplier=1,
)


@celery_app.task(name="run_simulation_task", bind=True, max_retries=1)
def run_simulation_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Celery task to run the micro-simulation asynchronously.
    
    Executes the full pipeline: ABM → Markov attribution → Neo4j graph enrichment 
    → Bayesian MMM → Pareto budget generation. All heavy compute runs here,
    NOT in the FastAPI ASGI thread.
    
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


@celery_app.task(name="run_forecast_task", bind=True, max_retries=1)
def run_forecast_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Celery task to run Bayesian MMM forecasting asynchronously.
    
    Offloads PyMC sample_prior_predictive (200 draws) from the main thread.
    This can take 5-30+ seconds depending on the number of channels and
    exogenous factors — far too long for a synchronous HTTP response.
    
    Args:
        payload (Dict[str, Any]): A JSON dictionary from ForecastRequest.model_dump().
        
    Returns:
        Dict[str, Any]: The ForecastResponse as a JSON dictionary.
    """
    logger.info(f"Task {self.request.id} started forecast.")
    try:
        request = ForecastRequest(**payload)
        response = run_macro_forecast(request)
        
        logger.info(f"Task {self.request.id} forecast completed successfully.")
        return response.model_dump()
        
    except Exception as e:
        logger.error(f"Task {self.request.id} forecast failed: {e}", exc_info=True)
        raise


@celery_app.task(name="scrape_competitor_data", bind=True)
def scrape_competitor_data(self, url: str) -> Dict[str, Any]:
    """
    Celery task to scrape competitor intelligence using Firecrawl and ingest into Neo4j.
    
    Args:
        url (str): The competitor URL to scrape.
        
    Returns:
        Dict[str, Any]: Execution status and metrics.
    """
    logger.info(f"Task {self.request.id} started scraping: {url}")
    try:
        from src.preprocessing.web_scraper import CompetitorScraper
        scraper = CompetitorScraper()
        result = scraper.scrape_and_ingest(url)
        logger.info(f"Task {self.request.id} completed scraping successfully.")
        return result
    except Exception as e:
        logger.error(f"Task {self.request.id} scraping failed: {e}", exc_info=True)
        raise

