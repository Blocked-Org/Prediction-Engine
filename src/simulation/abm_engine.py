import logging
from typing import Optional

import mesa
from pydantic import BaseModel, Field, validate_call

from src.simulation.abm_heuristics_config import (
    SEGMENTS,
    compute_segment_weights,
)

# Configure module-level logger for defensive programming
logger = logging.getLogger(__name__)


class ConsumerAgent(mesa.Agent):
    """
    ConsumerAgent represents a single consumer within the MarketingEnvironment.

    This agent is influenced by marketing campaigns which adjust its
    conversion probability over time, modified by its innate brand loyalty.

    Attributes:
        demographic_segment (str): The demographic group of the agent (e.g., 'urban_millennial').
        brand_loyalty (float): A value between 0.0 and 1.0 representing resilience to or affinity for marketing.
        conversion_probability (float): Current probability that the agent will convert in a given step.
        is_converted (bool): Tracks whether the agent has converted.
    """

    def __init__(
        self,
        model: mesa.Model,
        demographic_segment: str,
        brand_loyalty: float,
        conversion_probability: float,
    ) -> None:
        """
        Initializes the ConsumerAgent.

        Args:
            model (mesa.Model): The environment model instance.
            demographic_segment (str): Categorical string for demographics.
            brand_loyalty (float): Loyalty score (0.0 to 1.0).
            conversion_probability (float): Base probability of conversion (0.0 to 1.0).
        """
        super().__init__(model)
        self.demographic_segment = demographic_segment
        self.brand_loyalty = brand_loyalty
        self.conversion_probability = conversion_probability
        self.is_converted = False

    def step(self) -> None:
        """
        Agent's step in the simulation. Evaluates conversion based on probability.
        Once converted, the agent remains converted.
        """
        try:
            if not self.is_converted:
                if self.random.random() < self.conversion_probability:
                    self.is_converted = True
                    logger.debug(f"Agent {self.unique_id} converted!")
        except Exception as e:
            logger.error(f"Error during agent step for ID {self.unique_id}: {e}", exc_info=True)


def compute_conversions(model: mesa.Model) -> int:
    """
    Computes the total number of conversions in the current environment.

    Args:
        model (mesa.Model): The simulation environment.

    Returns:
        int: Total number of converted agents.
    """
    try:
        # Mesa 3.0+ AgentSet: iterate directly over model.agents
        return sum(1 for a in model.agents if getattr(a, "is_converted", False))
    except Exception as e:
        logger.error(f"Failed to compute conversions: {e}")
        return 0


class EnvironmentConfig(BaseModel):
    """
    Pydantic schema to validate the configuration parameters of the MarketingEnvironment.
    Ensures strict typing and constraints for the simulation.
    """
    num_agents: int = Field(1000, gt=0, description="Total number of agents to simulate.")
    ad_exposure: float = Field(0.1, ge=0.0, le=1.0, description="Intensity of the marketing campaign (0.0 to 1.0).")
    age: Optional[str] = Field(default=None, description="Target age range from frontend.")
    gender: Optional[str] = Field(default=None, description="Target gender from frontend.")
    interest: Optional[str] = Field(default=None, description="Target interest vertical from frontend.")


class MarketingEnvironment(mesa.Model):
    """
    Agent-based model simulating a dynamic marketing environment.

    This model creates a population of ConsumerAgents and steps them through
    marketing campaign pushes. Uses the Mesa 3.0+ AgentSet API for agent
    management and random-order activation.

    Attributes:
        config (EnvironmentConfig): Validated configuration parameters.
        datacollector (mesa.DataCollector): Collects simulation metrics per step.
    """

    @validate_call
    def __init__(
        self,
        num_agents: int = 1000,
        ad_exposure: float = 0.1,
        age: Optional[str] = None,
        gender: Optional[str] = None,
        interest: Optional[str] = None,
    ) -> None:
        """
        Initializes the MarketingEnvironment model.

        Args:
            num_agents (int): The number of consumer agents to generate. Default 1000.
            ad_exposure (float): The base advertising exposure level. Default 0.1.
            age (Optional[str]): Target age range from frontend (e.g. '18-24').
            gender (Optional[str]): Target gender from frontend ('M' or 'F').
            interest (Optional[str]): Target interest vertical from frontend.
        """
        super().__init__()
        
        # Strict validation using Pydantic
        self.config = EnvironmentConfig(
            num_agents=num_agents,
            ad_exposure=ad_exposure,
            age=age,
            gender=gender,
            interest=interest,
        )
        self.ad_exposure = self.config.ad_exposure
        
        # Compute demographic segment weights from user inputs via heuristics config
        if age and gender and interest:
            segment_weights = compute_segment_weights(age, gender, interest)
            logger.info(f"ABM segment weights from demographics: {segment_weights}")
        else:
            # Fallback to uniform distribution when demographics are not provided
            segment_weights = {seg: 1.0 / len(SEGMENTS) for seg in SEGMENTS}
            logger.info("ABM using uniform segment weights (no demographics provided).")

        segments_list = list(segment_weights.keys())
        weights_list = list(segment_weights.values())

        for i in range(self.config.num_agents):
            try:
                # Select segment using weighted distribution from user demographics
                segment = self.random.choices(segments_list, weights=weights_list, k=1)[0]
                loyalty = self.random.uniform(0.0, 1.0)
                base_prob = self.random.uniform(0.01, 0.1)
                
                # Mesa 3.0+: agents auto-register with model.agents on construction
                ConsumerAgent(
                    model=self,
                    demographic_segment=segment,
                    brand_loyalty=loyalty,
                    conversion_probability=base_prob
                )
                
            except Exception as e:
                logger.error(f"Failed to initialize agent {i}: {e}", exc_info=True)
                raise
        
        # Setup data collector to track total conversions per step
        self.datacollector = mesa.DataCollector(
            model_reporters={"Total_Conversions": compute_conversions}
        )

    def step(self) -> None:
        """
        Advances the simulation by one step. 
        Applies a marketing campaign push which slightly increases the 
        conversion probability of each agent based on their brand loyalty 
        and the environment's ad exposure parameter.
        """
        try:
            # Apply the marketing push (increase conversion probability)
            for agent in self.agents:
                if isinstance(agent, ConsumerAgent) and not agent.is_converted:
                    # Brand loyalty modifies how much ad_exposure impacts the probability.
                    boost = agent.brand_loyalty * self.ad_exposure * 0.05
                    agent.conversion_probability = min(1.0, agent.conversion_probability + boost)

            # Collect data before agents potentially change state in this step
            self.datacollector.collect(self)
            
            # Execute step on all agents in random order (replaces RandomActivation)
            self.agents.shuffle_do("step")
            
        except Exception as e:
            logger.error(f"Error during environment step: {e}", exc_info=True)
            raise
