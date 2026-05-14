import os
import logging
from typing import Dict, Any
from firecrawl import FirecrawlApp
from src.api.db.neo4j_client import Neo4jManager

logger = logging.getLogger(__name__)

class CompetitorScraper:
    """
    Scrapes exogenous competitor intelligence using Firecrawl and ingests
    the resulting markdown directly into the Neo4j Graph Database.
    """
    def __init__(self) -> None:
        api_key = os.getenv("FIRECRAWL_API_KEY", "dummy_key")
        self.app = FirecrawlApp(api_key=api_key)
        self.neo_mgr = Neo4jManager()

    def scrape_and_ingest(self, url: str) -> Dict[str, Any]:
        """
        Scrapes a competitor URL using Firecrawl and ingests the markdown content
        into Neo4j as a graph node.
        
        Args:
            url (str): The competitor URL to scrape.
            
        Returns:
            Dict[str, Any]: Execution status, URL, and bytes extracted.
        """
        logger.info(f"Initiating Firecrawl scrape for URL: {url}")
        try:
            # Execute the scrape
            result = self.app.scrape_url(url, params={
                'formats': ['markdown'], 
                'onlyMainContent': True
            })
            
            markdown_content = result.get('markdown', '')
            if not markdown_content:
                logger.warning(f"No markdown content extracted from {url}")
                return {"status": "empty", "url": url}
            
            logger.info("Successfully scraped content. Ingesting into Neo4j...")
            
            # Connect to Neo4j
            self.neo_mgr.connect()
            
            # Cypher query to insert or update the competitor node
            query = (
                "MERGE (c:CompetitorContext {url: $url}) "
                "SET c.content = $content, c.scraped_at = timestamp() "
                "RETURN c"
            )
            
            if self.neo_mgr.driver:
                with self.neo_mgr.driver.session() as session:
                    # Cap content to 5000 characters to prevent Neo4j overload
                    session.run(query, url=url, content=markdown_content[:5000]) 
                    logger.info("Neo4j 'CompetitorContext' node merged successfully.")
                    
            return {"status": "success", "url": url, "bytes_extracted": len(markdown_content)}

        except Exception as e:
            logger.error(f"Scraping failed for {url}: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
        finally:
            if self.neo_mgr.driver:
                self.neo_mgr.close()
