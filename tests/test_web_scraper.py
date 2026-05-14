"""
Unit Test Suite for Preprocessing (Web Scraper)
"""
import pytest
from unittest.mock import patch, MagicMock
from src.preprocessing.web_scraper import CompetitorScraper

@patch("src.preprocessing.web_scraper.FirecrawlApp")
@patch("src.preprocessing.web_scraper.Neo4jManager")
class TestCompetitorScraper:
    
    def test_scrape_and_ingest_success(self, mock_neo4j, mock_firecrawl) -> None:
        """
        Validates the web scraper successfully fetches markdown and ingests it into Neo4j.
        """
        # 1. Mock Firecrawl
        mock_app_instance = mock_firecrawl.return_value
        mock_app_instance.scrape_url.return_value = {
            "markdown": "# Competitor Data\nPricing is 10 BDT.",
            "metadata": {"title": "Competitor A"}
        }
        
        # 2. Mock Neo4j
        mock_neo_instance = mock_neo4j.return_value
        mock_session = MagicMock()
        mock_neo_instance.driver.session.return_value.__enter__.return_value = mock_session
        
        # 3. Execute
        scraper = CompetitorScraper()
        url = "https://example-competitor.com"
        result = scraper.scrape_and_ingest(url)
        
        # 4. Assertions
        mock_app_instance.scrape_url.assert_called_once_with(url, params={'formats': ['markdown'], 'onlyMainContent': True})
        mock_neo_instance.connect.assert_called_once()
        mock_session.run.assert_called_once()
        
        assert result["status"] == "success"
        assert result["url"] == url
        assert result["bytes_extracted"] > 0

    def test_scrape_empty_content(self, mock_neo4j, mock_firecrawl) -> None:
        """
        Validates the behavior when Firecrawl returns no markdown.
        """
        mock_app_instance = mock_firecrawl.return_value
        mock_app_instance.scrape_url.return_value = {"markdown": ""}
        
        scraper = CompetitorScraper()
        result = scraper.scrape_and_ingest("https://empty-site.com")
        
        assert result["status"] == "empty"
        mock_neo4j.return_value.connect.assert_not_called()
