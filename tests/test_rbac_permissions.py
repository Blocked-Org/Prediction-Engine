from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.auth import Role, _normalize_clerk_role
from src.api.main import app

client = TestClient(app)

FAKE_TENANT_ID = str(uuid.uuid4())
FAKE_ORG_ID = "org_2xYzAbCdEfGh"
FAKE_USER_ID = "user_2aBcDeFgHiJk"


def _make_claims(role: str) -> dict:
    return {
        "sub": FAKE_USER_ID,
        "org_id": FAKE_ORG_ID,
        "org_role": role,
        "iss": "https://clerk.test.dev",
        "azp": "https://myapp.test.dev",
    }


def _make_valid_simulate_payload() -> dict:
    return {
        "clerk_user_id": FAKE_USER_ID,
        "endogenous": {
            "Impressions": 1000.0,
            "Clicks": 100,
            "Spent": 500.0
        },
        "transactional": {
            "Total_Conversion": 10
        },
        "audience": {
            "age": "25-34",
            "gender": "all",
            "interest": "technology"
        }
    }


def _make_valid_init_payload() -> dict:
    return {
        "clerk_user_id": FAKE_USER_ID,
        "endogenous": {
            "Impressions": 10000.0,
            "Clicks": 500,
            "Spent": 1500.0
        },
        "transactional": {
            "Total_Conversion": 50
        },
        "audience": {
            "age": "18-24",
            "gender": "female",
            "interest": "gaming"
        },
        "exogenous": {
            "competitors": ["BrandX", "BrandY"],
            "macroeconomic_flags": ["inflation"]
        }
    }


# ---------------------------------------------------------------------------
# Unit Tests for Role Normalization
# ---------------------------------------------------------------------------

def test_role_normalization():
    """Verify mapping of raw role strings to our Role enum."""
    assert _normalize_clerk_role("org:owner") == Role.owner
    assert _normalize_clerk_role("org:admin") == Role.admin
    assert _normalize_clerk_role("org:analyst") == Role.analyst
    assert _normalize_clerk_role("org:viewer") == Role.viewer

    assert _normalize_clerk_role("owner") == Role.owner
    assert _normalize_clerk_role("admin") == Role.admin
    assert _normalize_clerk_role("analyst") == Role.analyst
    assert _normalize_clerk_role("viewer") == Role.viewer


def test_unknown_role_defaults_to_viewer():
    """Verify that unrecognised or empty roles default to viewer."""
    assert _normalize_clerk_role("org:member") == Role.viewer
    assert _normalize_clerk_role("") == Role.viewer
    assert _normalize_clerk_role(None) == Role.viewer
    assert _normalize_clerk_role("guest") == Role.viewer


# ---------------------------------------------------------------------------
# Endpoint RBAC Integration Tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "role,expected_status",
    [
        ("org:owner", 202),
        ("org:admin", 202),
        ("org:analyst", 202),
        ("org:viewer", 403),
        ("org:member", 403),  # Default viewer is blocked
    ],
)
@patch("src.api.auth._resolve_tenant_id", return_value=FAKE_TENANT_ID)
@patch("src.api.auth.SessionLocal")
@patch("src.api.auth.verify_clerk_token")
@patch("src.api.worker.run_simulation_task.delay")
@patch("src.api.cache.get_simulation_cache")
def test_rbac_simulate_endpoint(
    mock_cache_getter,
    mock_celery_delay,
    mock_verify,
    mock_session,
    mock_resolve,
    role,
    expected_status,
):
    """Test RBAC on POST /api/v1/simulate."""
    mock_verify.return_value = _make_claims(role)
    mock_session.return_value = MagicMock()
    
    # Mock cache search to miss
    mock_cache = MagicMock()
    mock_cache.get.return_value = None
    mock_cache_getter.return_value = mock_cache

    # Mock Celery task
    mock_task = MagicMock()
    mock_task.id = "test-task-uuid"
    mock_celery_delay.return_value = mock_task

    headers = {"Authorization": "Bearer valid.jwt.token"}
    response = client.post(
        "/api/v1/simulate",
        json=_make_valid_simulate_payload(),
        headers=headers,
    )
    assert response.status_code == expected_status
    if expected_status == 202:
        assert response.json()["task_id"] == "test-task-uuid"


@pytest.mark.parametrize(
    "role,expected_status",
    [
        ("org:owner", 200),
        ("org:admin", 200),
        ("org:analyst", 403),
        ("org:viewer", 403),
    ],
)
@patch("src.api.auth._resolve_tenant_id", return_value=FAKE_TENANT_ID)
@patch("src.api.auth.SessionLocal")
@patch("src.api.auth.verify_clerk_token")
@patch("src.api.routes.simulate.persist_simulation_init")
def test_rbac_simulate_init_endpoint(
    mock_persist,
    mock_verify,
    mock_session,
    mock_resolve,
    role,
    expected_status,
):
    """Test RBAC on POST /api/v1/simulate/init."""
    mock_verify.return_value = _make_claims(role)
    mock_session.return_value = MagicMock()
    
    # Mock Neo4j persistence
    mock_persist.return_value = {
        "campaign_id": "c-123",
        "agent_cluster_id": "a-123",
        "competitor_ids": ["BrandX"],
        "macro_context_ids": [],
        "node_counts": {"competitors": 1, "macro_contexts": 0},
        "is_onboarded": True,
    }

    headers = {"Authorization": "Bearer valid.jwt.token"}
    response = client.post(
        "/api/v1/simulate/init",
        json=_make_valid_init_payload(),
        headers=headers,
    )
    assert response.status_code == expected_status


@pytest.mark.parametrize(
    "role,expected_status",
    [
        ("org:owner", 200),
        ("org:admin", 200),
        ("org:analyst", 200),
        ("org:viewer", 200),
    ],
)
@patch("src.api.auth._resolve_tenant_id", return_value=FAKE_TENANT_ID)
@patch("src.api.auth.SessionLocal")
@patch("src.api.auth.verify_clerk_token")
@patch("src.api.routes.simulate.get_dashboard_results")
def test_rbac_simulate_results_endpoint(
    mock_results,
    mock_verify,
    mock_session,
    mock_resolve,
    role,
    expected_status,
):
    """Test RBAC on GET /api/v1/simulate/results/{id} — everyone can read."""
    mock_verify.return_value = _make_claims(role)
    mock_session.return_value = MagicMock()

    # Mock dashboard results service response
    mock_results.return_value = {
        "status": "ready",
        "simulation_scenario": None,
        "optimization_result": None,
    }

    headers = {"Authorization": "Bearer valid.jwt.token"}
    response = client.get(
        f"/api/v1/simulate/results/{FAKE_USER_ID}",
        headers=headers,
    )
    assert response.status_code == expected_status
