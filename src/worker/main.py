import os
from celery import Celery

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
)

if __name__ == '__main__':
    celery_app.start()
