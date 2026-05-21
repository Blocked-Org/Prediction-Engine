from typing import List, Optional
from datetime import date
from pydantic import BaseModel

class ChannelAllocation(BaseModel):
    channel_name: str
    spend: float
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    conversions: Optional[int] = None
    ctr: Optional[float] = None
    cpc: Optional[float] = None

class DateRange(BaseModel):
    start_date: date
    end_date: date

class TargetAudience(BaseModel):
    demographics: dict
    interests: List[str]

class CampaignInput(BaseModel):
    campaign_id: str
    channel_names: List[str]
    date_range: DateRange
    target_audience: TargetAudience
    region: str
    allocations: List[ChannelAllocation]

class ConfidenceRange(BaseModel):
    lower_bound: float
    upper_bound: float
    confidence_level: float = 0.95

class ForecastOutput(BaseModel):
    campaign_id: str
    estimated_revenue: float
    uncertainty_bounds: ConfidenceRange

class CompetitorSignal(BaseModel):
    competitor_name: str
    signal_type: str
    impact_score: float
    description: str

class SimulationScenario(BaseModel):
    scenario_id: str
    campaign_input: CampaignInput
    competitor_signals: List[CompetitorSignal]

class Recommendation(BaseModel):
    recommendation_id: str
    action: str
    recommendation_reasoning: str

class OptimizationResult(BaseModel):
    campaign_id: str
    optimized_allocations: List[ChannelAllocation]
    expected_forecast: ForecastOutput
    recommendations: List[Recommendation]
