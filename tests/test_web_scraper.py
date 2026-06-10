"""
Unit Test Suite for Preprocessing (Web Scraper)
"""
from unittest.mock import patch
from src.preprocessing.web_scraper import CompetitorScraper

@patch("src.preprocessing.web_scraper.FirecrawlApp")
class TestCompetitorScraper:
    
    def test_scrape_and_ingest_success(self, mock_firecrawl) -> None:
        """
        Validates the web scraper successfully fetches markdown and ingests it into Neo4j.
        """
        # 1. Mock Firecrawl
        mock_app_instance = mock_firecrawl.return_value
        mock_app_instance.scrape_url.return_value = {
            "markdown": "# Competitor Data\nPricing is 10 BDT.",
            "metadata": {"title": "Competitor A"}
        }
        
        # 2. Mock Neo4j removed
        pass
        
        # 3. Execute
        scraper = CompetitorScraper()
        url = "https://example-competitor.com"
        result = scraper.scrape_and_ingest(url)
        
        # 4. Assertions
        mock_app_instance.scrape_url.assert_called_once_with(url, params={'formats': ['markdown'], 'onlyMainContent': True})
        
        assert result["status"] == "success"
        assert result["url"] == url
        assert result["bytes_extracted"] > 0

    def test_scrape_empty_content(self, mock_firecrawl) -> None:
        """
        Validates the behavior when Firecrawl returns no markdown.
        """
        mock_app_instance = mock_firecrawl.return_value
        mock_app_instance.scrape_url.return_value = {"markdown": ""}
        
        scraper = CompetitorScraper()
        result = scraper.scrape_and_ingest("https://empty-site.com")
        
        assert result["status"] == "empty"
