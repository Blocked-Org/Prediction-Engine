from __future__ import annotations

import hashlib
import uuid
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.api.main import app
from src.api.models import Base, Tenant, ApiKey
from src.api.routes.keys import get_db

from sqlalchemy.pool import StaticPool

# ── SQLite In-Memory Database Setup for Testing ────────────────────────
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables in sqlite
Base.metadata.create_all(bind=engine)

# Override FastAPI get_db dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# Test Constants
TENANT_A_ID = uuid.uuid4()
TENANT_B_ID = uuid.uuid4()
FAKE_ORG_ID_A = "org_TenantA"
FAKE_ORG_ID_B = "org_TenantB"
FAKE_USER_ID = "user_12345"


def _make_claims(org_id: str, role: str) -> dict:
    return {
        "sub": FAKE_USER_ID,
        "org_id": org_id,
        "org_role": role,
        "iss": "https://clerk.test.dev",
        "azp": "https://myapp.test.dev",
    }


@pytest.fixture(autouse=True, scope="module")
def seed_tenants():
    """Seed the database with test tenants once for the module."""
    db = TestingSessionLocal()
    # Add Tenant A and Tenant B
    tenant_a = Tenant(id=TENANT_A_ID, company_name="Tenant Alpha")
    tenant_b = Tenant(id=TENANT_B_ID, company_name="Tenant Bravo")
    db.add(tenant_a)
    db.add(tenant_b)
    db.commit()
    db.close()


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

@patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_A_ID))
@patch("src.api.auth.verify_clerk_token")
def test_create_key_returns_raw_key(mock_verify, mock_resolve):
    """POST /api/v1/keys creates a key and returns the raw key starting with pe_k_."""
    mock_verify.return_value = _make_claims(FAKE_ORG_ID_A, "org:admin")

    headers = {"Authorization": "Bearer valid.jwt.token"}
    payload = {"name": "Test CI/CD Key"}
    
    response = client.post("/api/v1/keys", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    
    data = response.json()
    assert data["name"] == "Test CI/CD Key"
    assert "raw_key" in data
    assert data["raw_key"].startswith("pe_k_")
    assert len(data["key_prefix"]) == 8
    assert data["is_active"] is True
    assert uuid.UUID(data["tenant_id"]) == TENANT_A_ID


@patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_A_ID))
@patch("src.api.auth.verify_clerk_token")
def test_list_keys_shows_prefix_not_full_key(mock_verify, mock_resolve):
    """GET /api/v1/keys lists active keys and returns prefix but never the raw key."""
    mock_verify.return_value = _make_claims(FAKE_ORG_ID_A, "org:admin")

    headers = {"Authorization": "Bearer valid.jwt.token"}
    
    # 1. Create a key first
    create_payload = {"name": "Prod Web Key"}
    create_resp = client.post("/api/v1/keys", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    created_key_data = create_resp.json()

    # 2. List the keys
    list_resp = client.get("/api/v1/keys", headers=headers)
    assert list_resp.status_code == 200
    
    keys_list = list_resp.json()
    assert len(keys_list) >= 1
    
    # Check that it returns the prefix, but NOT the raw_key or key_hash
    retrieved_key = next(k for k in keys_list if k["id"] == created_key_data["id"])
    assert retrieved_key["name"] == "Prod Web Key"
    assert retrieved_key["key_prefix"] == created_key_data["key_prefix"]
    assert "raw_key" not in retrieved_key
    assert "key_hash" not in retrieved_key


@patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_A_ID))
@patch("src.api.auth.verify_clerk_token")
def test_delete_key_soft_deletes(mock_verify, mock_resolve):
    """DELETE /api/v1/keys/{key_id} soft-deletes a key (sets is_active=False)."""
    mock_verify.return_value = _make_claims(FAKE_ORG_ID_A, "org:admin")
    headers = {"Authorization": "Bearer valid.jwt.token"}

    # 1. Create a key
    create_payload = {"name": "Ephemeral Key"}
    create_resp = client.post("/api/v1/keys", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    key_id = create_resp.json()["id"]

    # 2. Delete the key
    delete_resp = client.delete(f"/api/v1/keys/{key_id}", headers=headers)
    assert delete_resp.status_code == 204

    # 3. Check that it is no longer listed as active
    list_resp = client.get("/api/v1/keys", headers=headers)
    assert list_resp.status_code == 200
    active_keys = list_resp.json()
    assert not any(k["id"] == key_id for k in active_keys)

    # 4. Directly query database to assert is_active is False
    db = TestingSessionLocal()
    db_key = db.query(ApiKey).filter(ApiKey.id == uuid.UUID(key_id)).first()
    assert db_key is not None
    assert db_key.is_active is False
    db.close()


@patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_A_ID))
@patch("src.api.auth.verify_clerk_token")
def test_delete_nonexistent_key_returns_404(mock_verify, mock_resolve):
    """DELETE with a nonexistent UUID returns 404."""
    mock_verify.return_value = _make_claims(FAKE_ORG_ID_A, "org:admin")
    headers = {"Authorization": "Bearer valid.jwt.token"}

    nonexistent_id = uuid.uuid4()
    delete_resp = client.delete(f"/api/v1/keys/{nonexistent_id}", headers=headers)
    assert delete_resp.status_code == 404


@patch("src.api.auth.verify_clerk_token")
def test_key_scoped_to_tenant(mock_verify):
    """Keys from tenant A are completely isolated and not visible to tenant B."""
    headers = {"Authorization": "Bearer valid.jwt.token"}

    # 1. Create key as Tenant A
    with patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_A_ID)):
        mock_verify.return_value = _make_claims(FAKE_ORG_ID_A, "org:admin")
        create_resp = client.post("/api/v1/keys", json={"name": "A-Key"}, headers=headers)
        assert create_resp.status_code == 201
        key_a_id = create_resp.json()["id"]

    # 2. List keys as Tenant B, should not see Tenant A's key
    with patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_B_ID)):
        mock_verify.return_value = _make_claims(FAKE_ORG_ID_B, "org:admin")
        
        list_resp = client.get("/api/v1/keys", headers=headers)
        assert list_resp.status_code == 200
        keys_b = list_resp.json()
        assert not any(k["id"] == key_a_id for k in keys_b)

    # 3. Attempt to delete Tenant A's key as Tenant B, should get 404
    with patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_B_ID)):
        mock_verify.return_value = _make_claims(FAKE_ORG_ID_B, "org:admin")
        
        delete_resp = client.delete(f"/api/v1/keys/{key_a_id}", headers=headers)
        assert delete_resp.status_code == 404


@patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_A_ID))
@patch("src.api.auth.verify_clerk_token")
def test_viewer_cannot_create_key(mock_verify, mock_resolve):
    """Users with viewer role are blocked from creating keys (gets 403)."""
    mock_verify.return_value = _make_claims(FAKE_ORG_ID_A, "org:viewer")
    headers = {"Authorization": "Bearer valid.jwt.token"}

    response = client.post("/api/v1/keys", json={"name": "Forbidden Key"}, headers=headers)
    assert response.status_code == 403


@patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_A_ID))
@patch("src.api.auth.verify_clerk_token")
def test_viewer_cannot_list_keys(mock_verify, mock_resolve):
    """Users with viewer role are blocked from listing keys (gets 403)."""
    mock_verify.return_value = _make_claims(FAKE_ORG_ID_A, "org:viewer")
    headers = {"Authorization": "Bearer valid.jwt.token"}

    response = client.get("/api/v1/keys", headers=headers)
    assert response.status_code == 403


@patch("src.api.auth._resolve_tenant_id", return_value=str(TENANT_A_ID))
@patch("src.api.auth.verify_clerk_token")
def test_key_hash_is_sha256(mock_verify, mock_resolve):
    """The stored key_hash matches the SHA-256 of the generated raw_key."""
    mock_verify.return_value = _make_claims(FAKE_ORG_ID_A, "org:admin")
    headers = {"Authorization": "Bearer valid.jwt.token"}

    response = client.post("/api/v1/keys", json={"name": "Hashed Key"}, headers=headers)
    assert response.status_code == 201
    
    data = response.json()
    raw_key = data["raw_key"]
    key_id = data["id"]

    # Calculate expected hash
    expected_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    # Query from test sqlite DB directly
    db = TestingSessionLocal()
    db_key = db.query(ApiKey).filter(ApiKey.id == uuid.UUID(key_id)).first()
    assert db_key is not None
    assert db_key.key_hash == expected_hash
    db.close()
