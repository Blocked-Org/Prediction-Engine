"""
scripts/test_e2e_engine.py - End-to-end integration test for the Simulation Engine.

This script executes the complete backend data flow:
1. Connects to Postgres and checks onboarding status.
2. Extracts campaign parameters using the seed data clerk_user_id.
3. Triggers the ABM (Micro) and Bayesian (Macro) engines.
4. Outputs the combined dashboard payload (projected ROI, Pareto budgets).

Run via: python -m scripts.test_e2e_engine
"""

import logging
from src.api.services.campaign_persistence import get_active_workspace
from src.api.services.dashboard_results import build_dashboard_results

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("e2e_test")

def run_e2e():
    logger.info("Initializing E2E test...")

    clerk_user_id = "demo_clerk_user_001"
    
    logger.info(f"Triggering dashboard results generation for {clerk_user_id}...")
    try:
        workspace = get_active_workspace(clerk_user_id)
        if workspace is None or workspace.campaign_data is None:
            logger.error("No active workspace found for user.")
            return

        response = build_dashboard_results(workspace.campaign_data)
        
        logger.info(f"Dashboard status: {response.status}")
        if response.status == "ready":
            sim = response.simulation_scenario
            opt = response.optimization_result
            
            logger.info("=== E2E SUCCESS ===")
            logger.info(f"Campaign ID: {sim.campaign_input.campaign_id}")
            logger.info(f"Projected Revenue: ${opt.expected_forecast.estimated_revenue:,.2f}")
            logger.info(f"Confidence Interval: {opt.expected_forecast.uncertainty_bounds.lower_bound} to {opt.expected_forecast.uncertainty_bounds.upper_bound}")
            logger.info("Pareto Optimal Allocations:")
            for alloc in opt.optimized_allocations:
                logger.info(f"  - {alloc.channel_name}: ${alloc.spend:,.2f}")
            logger.info("Recommendations:")
            for rec in opt.recommendations:
                logger.info(f"  - {rec.action}: {rec.recommendation_reasoning}")
        else:
            logger.error("Simulation returned not ready: " + response.status)
            
    except Exception as e:
        logger.error(f"E2E simulation failed: {e}", exc_info=True)

if __name__ == "__main__":
    run_e2e()
