import logging
from typing import Optional, Any

from neo4j import GraphDatabase, Driver
from neo4j.exceptions import ServiceUnavailable
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

class Neo4jSettings(BaseSettings):
    """Configuration for Neo4j Database Connection."""
    # Field names match the env var names in .env exactly.
    # NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD are the AuraDB variables.
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_username: str = "neo4j"
    neo4j_password: str = "password"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

class Neo4jManager:
    """
    Manager for Neo4j database connections.
    Implements a singleton-like pattern via class instance or can be used with DI.
    """
    _instance: Optional['Neo4jManager'] = None
    
    def __new__(cls) -> 'Neo4jManager':
        if cls._instance is None:
            cls._instance = super(Neo4jManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return
            
        self.settings = Neo4jSettings()
        self.driver: Optional[Driver] = None
        self._initialized = True
        logger.info("Neo4jManager initialized.")

    def connect(self) -> None:
        """Establishes connection to the Neo4j database."""
        if self.driver is not None:
            logger.debug("Neo4j driver is already connected.")
            return

        try:
            self.driver = GraphDatabase.driver(
                self.settings.neo4j_uri,
                auth=(self.settings.neo4j_username, self.settings.neo4j_password)
            )
            logger.info(f"Successfully connected to Neo4j at {self.settings.neo4j_uri}")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise

    def close(self) -> None:
        """Closes the Neo4j connection."""
        if self.driver is not None:
            self.driver.close()
            self.driver = None
            logger.info("Neo4j connection closed.")

    def verify_connectivity(self) -> bool:
        """
        Verifies the connection to Neo4j by executing a simple query.
        
        Returns:
            bool: True if connection is successful, False otherwise.
        """
        if self.driver is None:
            logger.warning("Neo4j driver is not connected. Attempting to connect...")
            try:
                self.connect()
            except Exception:
                return False

        if self.driver is None:
             return False

        try:
            # Using driver.verify_connectivity() as a primary check
            self.driver.verify_connectivity()
            
            # Executing a simple test query to be absolutely sure
            records, summary, keys = self.driver.execute_query("RETURN 1 AS num")
            if records and records[0]["num"] == 1:
                logger.info("Neo4j connectivity verified successfully.")
                return True
            
            logger.warning("Neo4j query returned unexpected results.")
            return False
            
        except ServiceUnavailable as e:
            logger.error(f"Neo4j service is unavailable: {e}")
            return False
        except Exception as e:
            logger.error(f"Error verifying Neo4j connectivity: {e}")
            return False

# Dependency injection helper function for FastAPI
def get_neo4j_manager() -> Neo4jManager:
    """
    Returns a singleton instance of Neo4jManager.
    Connects to the database if not already connected.
    """
    manager = Neo4jManager()
    if manager.driver is None:
        manager.connect()
    return manager
