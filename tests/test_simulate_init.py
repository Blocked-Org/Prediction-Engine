"""Tests for POST /api/v1/simulate/init graph persistence."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from neo4j.exceptions import ServiceUnavailable

from src.api.main import app
from src.api.routes.simulate import get_onboarding_status, persist_simulation_init
from src.schemas.simulation import SimulationInitRequest, SimulationOnboardingStatus

VALID_PAYLOAD = {
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
    },
    "exogenous": {
        "competitors": ["BrandX", "BrandY"],
        "macroeconomic_flags": ["inflation"]
    }
}


@pytest.fixture
def client() -> TestClient:
    with patch("src.api.auth.verify_clerk_token") as mock_verify, \
         patch("src.api.auth._resolve_tenant_id", return_value="fake-tenant-uuid"), \
         patch("src.api.auth.SessionLocal") as mock_session:
        mock_verify.return_value = {
            "sub": "user_test_clerk_123",
            "org_id": "org_123",
            "org_role": "org:admin",
        }
        mock_session.return_value = MagicMock()
        
        tc = TestClient(app)
        tc.headers.update({"Authorization": "Bearer valid.jwt.token"})
        yield tc


def test_simulate_init_rejects_invalid_payload(client: TestClient) -> None:
    bad = {**VALID_PAYLOAD, "endogenous": {**VALID_PAYLOAD["endogenous"], "Spent": -1.0}}
    response = client.post("/api/v1/simulate/init", json=bad)
    assert response.status_code == 422


def test_simulate_init_rejects_negative_impressions(client: TestClient) -> None:
    bad = {
        **VALID_PAYLOAD,
        "endogenous": {**VALID_PAYLOAD["endogenous"], "Impressions": -1.0},
    }
    response = client.post("/api/v1/simulate/init", json=bad)
    assert response.status_code == 422


@patch("src.api.routes.simulate.persist_simulation_init")
def test_simulate_init_success(
    mock_persist: MagicMock,
    client: TestClient,
) -> None:
    from src.schemas.simulation import SimulationInitResponse, SimulationNodeCounts

    mock_persist.return_value = SimulationInitResponse(
        campaign_id="camp-1",
        agent_cluster_id="ac-1",
        competitor_ids=["Category Benchmark A", "Category Benchmark B"],
        macro_context_ids=["baseline_market_conditions"],
        node_counts=SimulationNodeCounts(competitors=2, macro_contexts=1),
        is_onboarded=True,
    )

    response = client.post("/api/v1/simulate/init", json=VALID_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["campaign_id"] == "camp-1"
    assert body["is_onboarded"] is True
    assert body["node_counts"]["competitors"] == 2
    mock_persist.assert_called_once()


@patch("src.api.routes.simulate.persist_simulation_init")
def test_simulate_init_neo4j_unavailable(
    mock_persist: MagicMock,
    client: TestClient,
) -> None:
    mock_persist.side_effect = ServiceUnavailable("down")
    response = client.post("/api/v1/simulate/init", json=VALID_PAYLOAD)
    assert response.status_code == 503


@patch("src.api.routes.simulate.get_onboarding_status")
def test_simulate_status_endpoint(
    mock_status: MagicMock,
    client: TestClient,
) -> None:
    mock_status.return_value = SimulationOnboardingStatus(
        clerk_user_id="user_test_clerk_123",
        is_onboarded=True,
        has_campaign=True,
    )
    response = client.get("/api/v1/simulate/status/user_test_clerk_123")
    assert response.status_code == 200
    assert response.json()["is_onboarded"] is True


def test_persist_simulation_init_executes_write_transaction() -> None:
    """Unit test: verify execute_write is invoked with campaign + competitor params."""
    manager = MagicMock()
    session = MagicMock()
    manager.driver = MagicMock()
    manager.driver.session.return_value.__enter__.return_value = session

    campaign_record = {
        "campaign_id": "generated-camp",
        "agent_cluster_id": "generated-ac",
        "competitor_ids": ["Category Benchmark A", "Category Benchmark B"],
    }

    captured_params: dict[str, object] = {}
    run_results = [
        campaign_record,
        {"macro_context_ids": ["baseline_market_conditions"]},
    ]

    def fake_execute_write(fn: object) -> dict[str, object]:
        tx = MagicMock()
        result_index = {"i": 0}

        def capture_run(
            _cypher: str,
            params: dict[str, object] | None = None,
            **kwargs: object,
        ) -> MagicMock:
            merged = {**(params or {}), **kwargs}
            if "clerk_user_id" in merged:
                captured_params.update(merged)
            result_mock = MagicMock()
            result_mock.single.return_value = run_results[result_index["i"]]
            result_index["i"] += 1
            return result_mock

        tx.run.side_effect = capture_run
        return fn(tx)

    session.execute_write.side_effect = fake_execute_write

    payload = SimulationInitRequest.model_validate(VALID_PAYLOAD)
    result = persist_simulation_init(manager, payload)

    assert result.campaign_id == "generated-camp"
    assert result.is_onboarded is True
    assert result.node_counts.competitors == 2
    assert captured_params["clerk_user_id"] == "user_test_clerk_123"
    assert captured_params["primary_channels"] == ["Meta"]
    assert captured_params["target_age_range"] == "25-34"
    session.execute_write.assert_called_once()


@patch("src.api.routes.simulate.get_dashboard_results")
def test_simulate_results_endpoint(
    mock_results: MagicMock,
    client: TestClient,
) -> None:
    from src.schemas.dashboard import DashboardResultsResponse

    mock_results.return_value = DashboardResultsResponse(status="no_campaign")

    response = client.get("/api/v1/simulate/results/user_test_clerk_123")
    assert response.status_code == 200
    assert response.json()["status"] == "no_campaign"
    mock_results.assert_called_once()


def test_get_onboarding_status_backfill_from_campaign() -> None:
    manager = MagicMock()
    manager.driver = MagicMock()
    session = MagicMock()
    manager.driver.session.return_value.__enter__.return_value = session
    session.run.return_value.single.return_value = {
        "flag_onboarded": False,
        "has_campaign": True,
    }

    status = get_onboarding_status(manager, "user_legacy")
    assert status.is_onboarded is True
    assert status.has_campaign is True
