import os
import logging
from typing import Optional

from neo4j import GraphDatabase, Driver
from sentence_transformers import SentenceTransformer

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_neo4j_connection() -> None:
    """
    Test Neo4j connection by creating mock nodes and relationships, 
    verifying their existence, and cleaning up.
    """
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")

    driver: Optional[Driver] = None
    try:
        logger.info(f"Connecting to Neo4j at {uri}...")
        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
        logger.info("Successfully connected to Neo4j.")

        with driver.session() as session:
            # 1. Create nodes and relationship
            create_query = """
            CREATE (c:Campaign {id: 'test_campaign_1', name: 'Mock Campaign'})
            CREATE (a:AudienceSegment {id: 'test_audience_1', segment_name: 'Tech Enthusiasts'})
            CREATE (c)-[:TARGETS]->(a)
            RETURN c, a
            """
            logger.info("Creating mock Campaign and AudienceSegment nodes...")
            session.run(create_query)

            # 2. Query to verify
            verify_query = """
            MATCH (c:Campaign {id: 'test_campaign_1'})-[r:TARGETS]->(a:AudienceSegment {id: 'test_audience_1'})
            RETURN c.name AS campaign_name, a.segment_name AS audience_segment
            """
            result = session.run(verify_query)
            record = result.single()
            
            if record:
                logger.info(
                    f"Verification successful. Found relationship: "
                    f"'{record['campaign_name']}' TARGETS '{record['audience_segment']}'"
                )
            else:
                logger.error("Verification failed: Could not find the created relationship.")
                raise RuntimeError("Neo4j node verification failed.")

            # 3. Clean up
            cleanup_query = """
            MATCH (c:Campaign {id: 'test_campaign_1'})
            MATCH (a:AudienceSegment {id: 'test_audience_1'})
            DETACH DELETE c, a
            """
            logger.info("Cleaning up mock nodes...")
            session.run(cleanup_query)
            logger.info("Cleanup completed successfully.")

    except Exception as e:
        logger.error(f"Neo4j test failed: {e}")
    finally:
        if driver:
            driver.close()


def test_vector_db_embedding() -> None:
    """
    Test Vector DB embedding logic using sentence-transformers.
    Loads BAAI/bge-m3 and ensures output dimension matches index config (1024).
    """
    model_name = "BAAI/bge-m3"
    test_string = "Affordable high-speed internet in Tangail"
    expected_dim = 1024

    try:
        logger.info(f"Loading SentenceTransformer model: {model_name}...")
        model = SentenceTransformer(model_name)
        logger.info("Model loaded successfully.")

        logger.info(f"Embedding test string: '{test_string}'...")
        embedding = model.encode(test_string)

        dim_size = len(embedding)
        logger.info(f"Embedding generated. Dimension size: {dim_size}")

        if dim_size == expected_dim:
            logger.info("SUCCESS: Dimension size matches the expected Vector DB configuration (1024).")
        else:
            logger.error(f"FAILURE: Expected dimension {expected_dim}, got {dim_size}.")

    except Exception as e:
        logger.error(f"Vector DB embedding test failed: {e}")


if __name__ == "__main__":
    logger.info("--- Starting Infrastructure Sanity Checks ---")
    
    logger.info("--- 1. Testing Neo4j Connection ---")
    test_neo4j_connection()
    
    logger.info("--- 2. Testing Vector DB Embeddings ---")
    test_vector_db_embedding()
    
    logger.info("--- Sanity Checks Completed ---")
