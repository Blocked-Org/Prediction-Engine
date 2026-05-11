import os
import redis
from rq import Worker, Queue, Connection

# Connect to Redis using environment variables or defaults
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', 'please_change_this_redis_password')

# Establish Redis connection
redis_conn = redis.Redis(
    host=REDIS_HOST, 
    port=REDIS_PORT, 
    password=REDIS_PASSWORD
)

def start_worker():
    """Starts the RQ worker to listen for tasks."""
    print("Starting background worker...")
    with Connection(redis_conn):
        worker = Worker(['default', 'high', 'low'])
        worker.work()

if __name__ == '__main__':
    start_worker()
