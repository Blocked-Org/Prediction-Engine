import time
import logging
from src.worker.main import celery_app

logger = logging.getLogger(__name__)
logger.info("Initializing src.worker.tasks module (lightweight import)...")

@celery_app.task
def run_full_simulation_task(budget: float, num_channels: int):
    """
    Background Celery task to run the complete simulation pipeline.
    """
    logger.info(f"Starting full simulation task for budget: {budget}")
    
    # Lazy imports to prevent heavy ML library loading on worker startup
    logger.info("Importing heavy ML simulation libraries...")
    from src.simulation.macro import run_bayesian_mmm
    from src.simulation.micro import run_agent_based_simulation
    from src.simulation.optimization import run_genetic_optimization
    logger.info("ML libraries loaded successfully.")

    # 1. Macro Simulation (Placeholder)
    # run_bayesian_mmm(data, target_col, spend_cols)
    time.sleep(2) # simulate delay
    
    # 2. Micro Simulation
    micro_results = run_agent_based_simulation(agents_count=1000, transition_matrix=None)
    time.sleep(2) # simulate delay
    
    # 3. Optimization
    opt_results = run_genetic_optimization(total_budget=budget, num_channels=num_channels)
    
    return {
        "status": "completed",
        "micro_results": micro_results,
        "optimization": opt_results
    }

import os
from firecrawl import FirecrawlApp
from src.api.db.neo4j_client import Neo4jManager

@celery_app.task
def scrape_competitor_data_task(url: str, prompt: str = None):
    """
    Background Celery task to scrape exogenous competitor data using Firecrawl.
    Ingests extracted markdown insights directly into Neo4j graph nodes.
    """
    api_key = os.getenv("FIRECRAWL_API_KEY", "dummy_key")
    app = FirecrawlApp(api_key=api_key)
    
    try:
        print(f"Scraping data from {url} via Firecrawl...")
        result = app.scrape_url(url, params={
            'formats': ['markdown'], 
            'onlyMainContent': True
        })
        
        markdown_content = result.get('markdown', 'No content found')
        
        neo_mgr = Neo4jManager()
        neo_mgr.connect()
        
        query = (
            "MERGE (c:CompetitorContext {url: $url}) "
            "SET c.content = $content, c.scraped_at = timestamp() "
            "RETURN c"
        )
        
        if neo_mgr.driver:
            with neo_mgr.driver.session() as session:
                session.run(query, url=url, content=markdown_content[:2000]) # Cap for safety
                print("Neo4j node 'CompetitorContext' updated successfully.")
                
        return {"status": "success", "url": url, "bytes_extracted": len(markdown_content)}

    except Exception as e:
        print(f"Scraping task failed: {e}")
        return {"status": "error", "message": str(e)}
