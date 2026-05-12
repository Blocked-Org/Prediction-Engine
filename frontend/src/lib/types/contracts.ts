export interface ChannelAllocation {
  channel_name: string;
  spend: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  ctr?: number;
  cpc?: number;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface TargetAudience {
  demographics: Record<string, any>;
  interests: string[];
}

export interface CampaignInput {
  campaign_id: string;
  channel_names: string[];
  date_range: DateRange;
  target_audience: TargetAudience;
  region: string;
  allocations: ChannelAllocation[];
}

export interface ConfidenceRange {
  lower_bound: number;
  upper_bound: number;
  confidence_level: number;
}

export interface ForecastOutput {
  campaign_id: string;
  estimated_revenue: number;
  uncertainty_bounds: ConfidenceRange;
}

export interface CompetitorSignal {
  competitor_name: string;
  signal_type: string;
  impact_score: number;
  description: string;
}

export interface SimulationScenario {
  scenario_id: string;
  campaign_input: CampaignInput;
  competitor_signals: CompetitorSignal[];
}

export interface Recommendation {
  recommendation_id: string;
  action: string;
  recommendation_reasoning: string;
}

export interface OptimizationResult {
  campaign_id: string;
  optimized_allocations: ChannelAllocation[];
  expected_forecast: ForecastOutput;
  recommendations: Recommendation[];
}
