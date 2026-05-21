from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


@patch("src.api.auth._resolve_tenant_id", return_value="fake-tenant-uuid")
@patch("src.api.auth.SessionLocal")
@patch("src.api.auth.verify_clerk_token")
@patch("src.api.main.run_simulation_task.delay")
@patch("src.api.main.AsyncResult")
def test_simulate_endpoint(mock_async_result, mock_delay, mock_verify, mock_session, mock_resolve):
    """
    Test the /api/v1/simulate and /api/v1/task/{task_id} endpoints
    by mocking the Celery delay and AsyncResult behavior.
    """
    # Mock Clerk claims
    mock_verify.return_value = {
        "sub": "user_test_clerk_123",
        "org_id": "org_123",
        "org_role": "org:admin",
    }
    mock_session.return_value = MagicMock()

    # 1. Mock the Celery delay result
    mock_task = MagicMock()
    mock_task.id = "test-task-123"
    mock_delay.return_value = mock_task

    # Valid payload matching the SimulationRequest schema
    payload = {
        "clerk_user_id": "user_test_clerk_123",
        "endogenous": {
            "Impressions": 10000.0,
            "Clicks": 500,
            "Spent": 1500.0
        },
        "transactional": {
            "Total_Conversion": 50
        },
        "audience": {
            "age": "25-34",
            "gender": "all",
            "interest": "technology"
        }
    }
    
    headers = {"Authorization": "Bearer valid.jwt.token"}

    # 2. Test the POST /simulate endpoint
    response = client.post("/api/v1/simulate", json=payload, headers=headers)
    assert response.status_code == 202, f"Expected 202, got {response.status_code}. Detail: {response.text}"
    
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
    task_response = client.get(f"/api/v1/task/{data['task_id']}", headers=headers)
    assert task_response.status_code == 200
    
    task_data = task_response.json()
    assert task_data["task_id"] == "test-task-123"
    assert task_data["status"] == "SUCCESS"
    assert "result" in task_data
    assert task_data["result"]["projected_roi"] == 3.2
    assert task_data["result"]["incremental_roas"] == 1.5


@patch("src.api.auth._resolve_tenant_id", return_value="fake-tenant-uuid")
@patch("src.api.auth.SessionLocal")
@patch("src.api.auth.verify_clerk_token")
@patch("src.api.main.AsyncResult")
def test_task_polling_pending_status(mock_async_result, mock_verify, mock_session, mock_resolve):
    """
    Test the polling endpoint when the Celery task is still processing.
    """
    mock_verify.return_value = {
        "sub": "user_test_clerk_123",
        "org_id": "org_123",
        "org_role": "org:admin",
    }
    mock_session.return_value = MagicMock()

    # Mock the AsyncResult instance for a pending task
    mock_result_instance = MagicMock()
    mock_result_instance.state = "PENDING"
    mock_async_result.return_value = mock_result_instance
    
    headers = {"Authorization": "Bearer valid.jwt.token"}
    task_response = client.get("/api/v1/task/test-task-pending-123", headers=headers)
    assert task_response.status_code == 200
    
    task_data = task_response.json()
    assert task_data["task_id"] == "test-task-pending-123"
    assert task_data["status"] == "PENDING"
    assert "result" not in task_data
