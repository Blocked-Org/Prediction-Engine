import pytest
from unittest.mock import MagicMock, patch
from src.llm.graphrag_service import GraphRAGService

def test_retrieve_campaign_context_by_id():
    """Test retrieving context with a specific campaign_id."""
    service = GraphRAGService()
    
    mock_workspace = MagicMock()
    mock_workspace.campaign_data = {
        "campaign_id": "c-123",
        "budget": 5000.0,
        "historical_revenue": 15000.0,
        "primary_channels": ["search", "social"],
        "target_age_range": "18-35",
        "competitor_names": ["BrandA"],
    }
    
    with patch("src.api.services.campaign_persistence.get_workspace_by_campaign_id", return_value=mock_workspace):
        result = service.retrieve_campaign_context("test query", campaign_id="c-123")
        
        assert "c-123" in result
        assert "$5,000.00" in result
        assert "BrandA" in result

def test_retrieve_campaign_context_text_match():
    """Test retrieving context without campaign_id (fallback to text match)."""
    service = GraphRAGService()
    
    # Without a campaign_id, it should return a message saying no campaign_id was provided
    result = service.retrieve_campaign_context("budget optimization", top_k=5)
    
    assert "No campaign_id provided" in result

def test_retrieve_campaign_context_no_results():
    """Test fallback when no results are found in Postgres."""
    service = GraphRAGService()
    
    with patch("src.api.services.campaign_persistence.get_workspace_by_campaign_id", return_value=None):
        result = service.retrieve_campaign_context("test query", campaign_id="c-not-found")
        assert "No matching campaign context found in PostgreSQL" in result

def test_retrieve_campaign_context_exception():
    """Test fallback on database error."""
    service = GraphRAGService()
    
    with patch("src.api.services.campaign_persistence.get_workspace_by_campaign_id", side_effect=Exception("DB Connection Error")):
        result = service.retrieve_campaign_context("test query", campaign_id="c-123")
        assert "Error retrieving campaign context" in result
