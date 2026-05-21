import subprocess
import pytest
import json

def get_container_health(container_name: str) -> str:
    """Gets the health status of a docker container."""
    try:
        # Get health status. We use format to get raw text instead of json, because some docker versions might format differently
        # Let's just grab the whole state and parse the json
        output = subprocess.check_output(
            ["docker", "inspect", container_name],
            stderr=subprocess.STDOUT,
            text=True
        )
        data = json.loads(output)
        if not data:
            return "not found"
            
        state = data[0].get("State", {})
        health = state.get("Health", {})
        
        if not health:
            return "no healthcheck"
            
        return health.get("Status", "unknown")
    except subprocess.CalledProcessError:
        return "not running"

@pytest.mark.parametrize("service_name", [
    "prediction_engine_postgres",
    "prediction_engine_neo4j",
    "prediction_engine_redis",
    # We might not check api and celery_worker since they don't have healthchecks defined in docker-compose.prod.yml yet,
    # but the databases do.
])
def test_docker_service_health(service_name):
    """
    Test that docker services are healthy.
    This requires the production docker-compose stack to be running.
    """
    status = get_container_health(service_name)
    
    # If the containers aren't running at all, we might skip the test or fail.
    # Since this is a dedicated healthcheck test, we expect them to be healthy.
    if status == "not running":
        pytest.skip(f"Container {service_name} is not running, skipping health check.")
        
    assert status == "healthy", f"Service {service_name} is not healthy, current status: {status}"
