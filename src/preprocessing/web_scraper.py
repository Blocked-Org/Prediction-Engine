"""Web scraping module for competitor intelligence ingestion.

Scrapes competitor websites using Firecrawl (complex targets) and Crawl4AI
(high-volume undefended targets).

.. note::
    Previously, scraped content was ingested directly into Neo4j as
    ``CompetitorContext`` graph nodes. Neo4j has been removed; scraped
    content is now logged and returned for storage in PostgreSQL JSONB
    via ``campaign_persistence.save_competitor_context()``.

    TODO: When a graph database (e.g. Neo4j, Memgraph) is re-introduced,
          re-implement the ingestion pipeline to write scraped content as
          graph nodes with relationship edges to Campaign, Competitor, and
          MarketSegment nodes for GraphRAG retrieval.
"""

import os
import logging
from typing import Dict, Any

from firecrawl import FirecrawlApp

logger = logging.getLogger(__name__)


class CompetitorScraper:
    """
    Scrapes exogenous competitor intelligence using Firecrawl.

    Scraped markdown is returned to the caller for PostgreSQL persistence.

    TODO: When Neo4j / graph DB is re-introduced, add ingestion pipeline:
          - MERGE (c:CompetitorContext {url: $url})
          - SET c.content = $content, c.scraped_at = timestamp()
          - Create edges to related Campaign and MarketSegment nodes.
    """
    def __init__(self) -> None:
        api_key = os.getenv("FIRECRAWL_API_KEY", "dummy_key")
        self.app = FirecrawlApp(api_key=api_key)

    def scrape_and_ingest(self, url: str) -> Dict[str, Any]:
        """
        Scrapes a competitor URL using Firecrawl.
        
        Returns the scraped content for the caller to persist to PostgreSQL.
        Previously this method would ingest directly into Neo4j — that
        code path has been removed.
        
        Args:
            url (str): The competitor URL to scrape.
            
        Returns:
            Dict[str, Any]: Execution status, URL, bytes extracted, and content.
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
            
            # Cap content to 5000 characters to prevent database bloat
            content = markdown_content[:5000]
            
            logger.info(
                "Successfully scraped %d bytes from %s. "
                "Content ready for PostgreSQL persistence.",
                len(content), url,
            )

            # TODO: When Neo4j is re-introduced, add graph ingestion here:
            # neo_mgr = Neo4jManager()
            # neo_mgr.connect()
            # query = (
            #     "MERGE (c:CompetitorContext {url: $url}) "
            #     "SET c.content = $content, c.scraped_at = timestamp() "
            #     "RETURN c"
            # )
            # session.run(query, url=url, content=content)
                    
            return {
                "status": "success",
                "url": url,
                "bytes_extracted": len(markdown_content),
                "content": content,
            }

        except Exception as e:
            logger.error(f"Scraping failed for {url}: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}


class Crawl4AiScraper:
    """
    Scrapes exogenous competitor intelligence using Crawl4AI
    (for high-volume undefended targets).

    Scraped markdown is returned to the caller for PostgreSQL persistence.

    TODO: When Neo4j / graph DB is re-introduced, add graph ingestion
          pipeline similar to CompetitorScraper above.
    """

    async def scrape_and_ingest(self, url: str) -> Dict[str, Any]:
        logger.info(f"Initiating Crawl4AI scrape for URL: {url}")
        try:
            from crawl4ai import AsyncWebCrawler
            
            async with AsyncWebCrawler() as crawler:
                result = await crawler.arun(url=url)
            
            markdown_content = result.markdown
            if not markdown_content:
                logger.warning(f"No markdown content extracted from {url}")
                return {"status": "empty", "url": url}
            
            content = markdown_content[:5000]
            
            logger.info(
                "Successfully scraped %d bytes from %s via Crawl4AI. "
                "Content ready for PostgreSQL persistence.",
                len(content), url,
            )

            # TODO: When Neo4j is re-introduced, add graph ingestion here:
            # neo_mgr = Neo4jManager()
            # neo_mgr.connect()
            # query = (
            #     "MERGE (c:CompetitorContext {url: $url}) "
            #     "SET c.content = $content, c.scraped_at = timestamp() "
            #     "RETURN c"
            # )
            # session.run(query, url=url, content=content)
                    
            return {
                "status": "success",
                "url": url,
                "bytes_extracted": len(markdown_content),
                "content": content,
            }

        except Exception as e:
            logger.error(f"Crawl4AI scraping failed for {url}: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
