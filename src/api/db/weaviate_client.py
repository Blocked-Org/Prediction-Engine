import logging
from typing import Optional

import weaviate
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

class WeaviateSettings(BaseSettings):
    """Configuration for Weaviate Database Connection."""
    weaviate_host: str = "localhost"
    weaviate_port: int = 8080
    weaviate_grpc_port: int = 50051
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

class WeaviateManager:
    """
    Manager for Weaviate database connections.
    Implements a singleton-like pattern via class instance or can be used with DI.
    """
    _instance: Optional['WeaviateManager'] = None
    
    def __new__(cls) -> 'WeaviateManager':
        if cls._instance is None:
            cls._instance = super(WeaviateManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return
            
        self.settings = WeaviateSettings()
        self.client: Optional[weaviate.WeaviateClient] = None
        self._initialized = True
        logger.info("WeaviateManager initialized.")

    def connect(self) -> None:
        """Establishes connection to the Weaviate database."""
        if self.client is not None and self.client.is_connected():
            logger.debug("Weaviate client is already connected.")
            return

        try:
            # Connect to local docker instance using v4 syntax
            self.client = weaviate.connect_to_local(
                host=self.settings.weaviate_host,
                port=self.settings.weaviate_port,
                grpc_port=self.settings.weaviate_grpc_port
            )
            logger.info(f"Successfully connected to Weaviate at {self.settings.weaviate_host}:{self.settings.weaviate_port}")
        except Exception as e:
            logger.error(f"Failed to connect to Weaviate: {e}")
            raise

    def close(self) -> None:
        """Closes the Weaviate connection."""
        if self.client is not None:
            self.client.close()
            self.client = None
            logger.info("Weaviate connection closed.")

    def check_cluster_health(self) -> bool:
        """
        Verifies the health of the Weaviate cluster.
        
        Returns:
            bool: True if cluster is ready, False otherwise.
        """
        if self.client is None:
            logger.warning("Weaviate client is not connected. Attempting to connect...")
            try:
                self.connect()
            except Exception:
                 return False
                 
        if self.client is None:
            return False

        try:
            is_ready = self.client.is_ready()
            if is_ready:
                logger.info("Weaviate cluster is healthy and ready.")
                return True
            else:
                logger.warning("Weaviate cluster is not ready.")
                return False
        except Exception as e:
            logger.error(f"Error checking Weaviate cluster health: {e}")
            return False

# Dependency injection helper function for FastAPI
def get_weaviate_manager() -> WeaviateManager:
    """
    Returns a singleton instance of WeaviateManager.
    Connects to the database if not already connected.
    """
    manager = WeaviateManager()
    if manager.client is None or not manager.client.is_connected():
        manager.connect()
    return manager
