import pytest
from unittest.mock import MagicMock
from src.llm.graphrag_service import GraphRAGService

@pytest.fixture
def mock_neo4j_manager():
    manager = MagicMock()
    # Mocking driver.session().run()
    session_mock = MagicMock()
    manager.driver.session.return_value.__enter__.return_value = session_mock
    return manager

def test_retrieve_campaign_context_by_id(mock_neo4j_manager):
    """Test retrieving context with a specific campaign_id."""
    service = GraphRAGService(mock_neo4j_manager)
    
    # Setup mock return record
    session_mock = mock_neo4j_manager.driver.session.return_value.__enter__.return_value
    mock_record = {
        "campaign_id": "c-123",
        "budget": 5000.0,
        "historical_revenue": 15000.0,
        "primary_channels": ["search", "social"],
        "target_age_range": "18-35",
        "competitors": ["BrandA"],
        "macro_flags": ["inflation"]
    }
    session_mock.run.return_value = [mock_record]
    
    result = service.retrieve_campaign_context("test query", campaign_id="c-123")
    
    assert "c-123" in result
    assert "$5,000.00" in result
    assert "BrandA" in result
    assert "inflation" in result
    session_mock.run.assert_called_once()
    # Verify the CYpher param passed
    args, kwargs = session_mock.run.call_args
    assert kwargs["parameters"]["campaign_id"] == "c-123"

def test_retrieve_campaign_context_text_match(mock_neo4j_manager):
    """Test retrieving context without campaign_id (fallback to text match)."""
    service = GraphRAGService(mock_neo4j_manager)
    
    session_mock = mock_neo4j_manager.driver.session.return_value.__enter__.return_value
    mock_record = {
        "campaign_id": "c-456",
        "budget": 2000.0,
    }
    session_mock.run.return_value = [mock_record]
    
    result = service.retrieve_campaign_context("budget optimization", top_k=5)
    
    assert "c-456" in result
    assert "$2,000.00" in result
    
    args, kwargs = session_mock.run.call_args
    assert kwargs["parameters"]["query"] == "budget optimization"
    assert kwargs["parameters"]["top_k"] == 5

def test_retrieve_campaign_context_no_results(mock_neo4j_manager):
    """Test fallback when no results are found."""
    service = GraphRAGService(mock_neo4j_manager)
    session_mock = mock_neo4j_manager.driver.session.return_value.__enter__.return_value
    session_mock.run.return_value = []
    
    result = service.retrieve_campaign_context("test query")
    assert "No matching campaign context found" in result

def test_retrieve_campaign_context_exception(mock_neo4j_manager):
    """Test fallback on database error."""
    service = GraphRAGService(mock_neo4j_manager)
    session_mock = mock_neo4j_manager.driver.session.return_value.__enter__.return_value
    session_mock.run.side_effect = Exception("DB Connection Error")
    
    result = service.retrieve_campaign_context("test query")
    assert "Error retrieving context from Neo4j knowledge graph" in result
