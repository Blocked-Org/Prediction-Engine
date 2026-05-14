import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


@patch("src.api.main.run_simulation_task.delay")
@patch("src.api.main.AsyncResult")
def test_simulate_endpoint(mock_async_result, mock_delay):
    """
    Test the /api/v1/simulate and /api/v1/task/{task_id} endpoints
    by mocking the Celery delay and AsyncResult behavior.
    """
    # 1. Mock the Celery delay result
    mock_task = MagicMock()
    mock_task.id = "test-task-123"
    mock_delay.return_value = mock_task

    # Valid payload matching the SimulationRequest schema
    payload = {
        "campaign_timeframe": ["2024-01-01", "2024-06-30"],
        "target_demographics": {"age": "18-35", "location": "Urban"},
        "budget_allocation": {"Meta": 5000.0, "Google": 5000.0}
    }
    
    # 2. Test the POST /simulate endpoint
    response = client.post("/api/v1/simulate", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}. Detail: {response.text}"
    
    data = response.json()
    assert data["task_id"] == "test-task-123"
    assert data["status"] == "processing"
    
    # 3. Mock the AsyncResult instance for a successful task
    mock_result_instance = MagicMock()
    mock_result_instance.state = "SUCCESS"
    mock_result_instance.result = {
        "projected_roi": 3.2,
        "incremental_roas": 1.5,
        "pareto_optimal_budgets": [{"Meta": 6000.0, "Google": 4000.0}]
    }
    mock_async_result.return_value = mock_result_instance
    
    # 4. Test the GET /task/{task_id} endpoint
    task_response = client.get(f"/api/v1/task/{data['task_id']}")
    assert task_response.status_code == 200
    
    task_data = task_response.json()
    assert task_data["task_id"] == "test-task-123"
    assert task_data["status"] == "SUCCESS"
    assert "result" in task_data
    assert task_data["result"]["projected_roi"] == 3.2
    assert task_data["result"]["incremental_roas"] == 1.5


@patch("src.api.main.AsyncResult")
def test_task_polling_pending_status(mock_async_result):
    """
    Test the polling endpoint when the Celery task is still processing.
    """
    # Mock the AsyncResult instance for a pending task
    mock_result_instance = MagicMock()
    mock_result_instance.state = "PENDING"
    mock_async_result.return_value = mock_result_instance
    
    task_response = client.get("/api/v1/task/test-task-pending-123")
    assert task_response.status_code == 200
    
    task_data = task_response.json()
    assert task_data["task_id"] == "test-task-pending-123"
    assert task_data["status"] == "PENDING"
    assert "result" not in task_data
