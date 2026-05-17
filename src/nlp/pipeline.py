"""
src/nlp/pipeline.py — NLP pipeline for multilingual embeddings and sentiment analysis.

Uses:
- BAAI/bge-m3: Dense/sparse multilingual embeddings for Weaviate.
- csebuetnlp/banglabert: Bangla NLP for sentiment/classification tasks.
"""

import logging
from typing import Optional, List, Union
from threading import Lock

logger = logging.getLogger(__name__)

class NLPPipeline:
    """
    Singleton class for lazy-loading heavy NLP models.
    Prevents memory bloat in fast API threads and ensures single initialization.
    """
    _instance: Optional['NLPPipeline'] = None
    _lock: Lock = Lock()
    
    def __new__(cls) -> 'NLPPipeline':
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(NLPPipeline, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
            
        self.embedding_model = None
        self.sentiment_model = None
        self.sentiment_tokenizer = None
        self._initialized = True
        logger.info("NLPPipeline initialized (models not yet loaded).")

    def get_embedding_model(self):
        """Lazy loads the BAAI/bge-m3 sentence transformer."""
        if self.embedding_model is None:
            logger.info("Loading BAAI/bge-m3 embedding model. This may take a moment and consume RAM...")
            try:
                from sentence_transformers import SentenceTransformer
                # Use bge-m3 which handles English + Bengali (and 100+ others) excellently
                self.embedding_model = SentenceTransformer("BAAI/bge-m3")
                logger.info("BAAI/bge-m3 loaded successfully.")
            except ImportError:
                logger.error("sentence_transformers not installed. Cannot load bge-m3.")
                raise
        return self.embedding_model
        
    def generate_embeddings(self, texts: Union[str, List[str]]) -> List[List[float]]:
        """
        Generates dense embeddings for a text or list of texts.
        """
        model = self.get_embedding_model()
        if isinstance(texts, str):
            texts = [texts]
        
        logger.debug(f"Generating embeddings for {len(texts)} texts...")
        embeddings = model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()
        
    def load_banglabert(self):
        """Lazy loads the csebuetnlp/banglabert model for downstream tasks."""
        if self.sentiment_model is None:
            logger.info("Loading csebuetnlp/banglabert model...")
            try:
                from transformers import AutoModelForSequenceClassification, AutoTokenizer
                model_name = "csebuetnlp/banglabert"
                self.sentiment_tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.sentiment_model = AutoModelForSequenceClassification.from_pretrained(model_name)
                logger.info("BanglaBERT loaded successfully.")
            except ImportError:
                logger.error("transformers not installed. Cannot load banglabert.")
                raise
        return self.sentiment_model, self.sentiment_tokenizer

# Global instance for easy import
nlp_pipeline = NLPPipeline()
