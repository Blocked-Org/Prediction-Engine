import os
import logging
import time
from celery import Celery

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__)

logger.info("Starting src.worker.main initialization...")
_start_time = time.time()
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', 'please_change_this_redis_password')

broker_url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0"

celery_app = Celery(
    "prediction_engine",
    broker=broker_url,
    backend=broker_url,
    include=['src.worker.tasks']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Dhaka',
    enable_utc=True,
    # Production safety: prevent long-running tasks from wedging workers
    task_soft_time_limit=120,
    task_time_limit=180,
    result_expires=3600,
    worker_prefetch_multiplier=1,
)

logger.info(f"src.worker.main initialization completed in {time.time() - _start_time:.4f} seconds.")

if __name__ == '__main__':
    celery_app.start()
