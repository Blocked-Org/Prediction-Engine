"""Tests for POST /api/v1/simulate/init without Neo4j."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.main import app

VALID_PAYLOAD = {
    "clerk_user_id": "user_test_clerk_123",
    "endogenous": {
        "Impressions": 10000.0,
        "Clicks": 500,
        "spend_meta": 1500.0,
        "spend_google": 0.0,
        "spend_tiktok": 0.0
    },
    "transactional": {
        "Total_Conversion": 50,
        "revenue": 5000.0
    },
    "audience": {
        "age": "25-34",
        "gender": "all",
        "interest": "technology"
    },
    "exogenous": {
        "competitors": ["BrandX", "BrandY"],
        "macroeconomic_flags": ["inflation"]
    }
}


@pytest.fixture
def client() -> TestClient:
    with patch("src.api.auth.verify_clerk_token") as mock_verify, \
         patch("src.api.auth._resolve_tenant_id", return_value="00000000-0000-0000-0000-000000000000"), \
         patch("src.api.auth.SessionLocal") as mock_session, \
         patch("src.api.services.campaign_persistence._get_session") as mock_db_session:
        mock_verify.return_value = {
            "sub": "user_test_clerk_123",
            "org_id": "org_123",
            "org_role": "org:admin",
        }
        mock_session.return_value = MagicMock()
        mock_db_session.return_value = MagicMock()
        
        tc = TestClient(app)
        tc.headers.update({"Authorization": "Bearer valid.jwt.token"})
        yield tc


def test_simulate_init_rejects_invalid_payload(client: TestClient) -> None:
    bad = {**VALID_PAYLOAD, "endogenous": {**VALID_PAYLOAD["endogenous"], "spend_meta": -1.0}}
    response = client.post("/api/v1/simulate/init", json=bad)
    assert response.status_code == 422


def test_simulate_init_rejects_negative_impressions(client: TestClient) -> None:
    bad = {
        **VALID_PAYLOAD,
        "endogenous": {**VALID_PAYLOAD["endogenous"], "Impressions": -1.0},
    }
    response = client.post("/api/v1/simulate/init", json=bad)
    assert response.status_code == 422


def test_simulate_init_success(client: TestClient) -> None:
    response = client.post("/api/v1/simulate/init", json=VALID_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert "campaign_id" in body
    assert body["is_onboarded"] is True
    assert body["node_counts"]["competitors"] == 2


def test_simulate_status_endpoint(client: TestClient) -> None:
    # First init to ensure it has a campaign in the in-memory dict
    client.post("/api/v1/simulate/init", json=VALID_PAYLOAD)
    
    response = client.get("/api/v1/simulate/status/user_test_clerk_123")
    assert response.status_code == 200
    assert response.json()["is_onboarded"] is True


@patch("src.api.routes.simulate.build_dashboard_results")
def test_simulate_results_endpoint(
    mock_build: MagicMock,
    client: TestClient,
) -> None:
    from src.schemas.dashboard import DashboardResultsResponse

    # Auth block check
    response = client.get("/api/v1/simulate/results/unknown_user")
    assert response.status_code == 403

    # Init for current user
    client.post("/api/v1/simulate/init", json=VALID_PAYLOAD)
    
    mock_build.return_value = DashboardResultsResponse(status="ready")
    response = client.get("/api/v1/simulate/results/user_test_clerk_123")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
