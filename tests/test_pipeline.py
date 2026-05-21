import pytest
from unittest.mock import patch

from src.nlp.pipeline import NLPPipeline

@pytest.fixture
def pipeline() -> NLPPipeline:
    # Reset singleton state for testing
    NLPPipeline._instance = None
    return NLPPipeline()

def test_singleton_pattern(pipeline: NLPPipeline):
    """Ensure NLPPipeline acts as a singleton."""
    second_pipeline = NLPPipeline()
    assert pipeline is second_pipeline

def test_preprocess_banglish(pipeline: NLPPipeline):
    """Ensure Banglish preprocessing translates romanized marketing terms correctly."""
    # Test mapping values
    text = "khub valo product, dam kom!"
    processed = pipeline.preprocess_banglish(text)
    
    assert "খুব" in processed
    assert "ভালো" in processed
    assert "প্রোডাক্ট" in processed
    assert "দাম" in processed
    assert "কম" in processed
    
    # Unmatched English word remains
    text_mixed = "new offer ashbe kobe?"
    processed_mixed = pipeline.preprocess_banglish(text_mixed)
    assert "new" in processed_mixed
    assert "অফার" in processed_mixed
    assert "আসবে" in processed_mixed
    assert "কবে" in processed_mixed

@patch("sentence_transformers.SentenceTransformer")
def test_generate_embeddings(MockTransformer, pipeline: NLPPipeline):
    """Test embedding generation handles string and list correctly."""
    mock_instance = MockTransformer.return_value
    import numpy as np
    # Mocking numpy array return from encode
    mock_instance.encode.return_value = np.array([[0.1, 0.2], [0.3, 0.4]])
    
    # Single string
    res1 = pipeline.generate_embeddings("test")
    assert len(res1) == 2
    assert res1[0] == [0.1, 0.2]
    MockTransformer.assert_called_once_with("BAAI/bge-m3")
    
    # List of strings
    mock_instance.encode.return_value = np.array([[0.5, 0.6]])
    res2 = pipeline.generate_embeddings(["test2"])
    assert len(res2) == 1
    assert res2[0] == [0.5, 0.6]

@patch("transformers.AutoTokenizer")
@patch("transformers.AutoModelForSequenceClassification")
def test_load_banglabert(MockModel, MockTokenizer, pipeline: NLPPipeline):
    """Ensure banglabert loads correctly."""
    model, tokenizer = pipeline.load_banglabert()
    MockTokenizer.from_pretrained.assert_called_once_with("csebuetnlp/banglabert")
    MockModel.from_pretrained.assert_called_once_with("csebuetnlp/banglabert")
    
    # Should not load twice
    pipeline.load_banglabert()
    assert MockTokenizer.from_pretrained.call_count == 1
