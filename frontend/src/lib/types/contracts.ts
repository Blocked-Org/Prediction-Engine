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
  demographics: Record<string, unknown>;
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

// === NEW: Real Backend API Contracts (Day 6) ===

export interface SimulationRequest {
  clerk_user_id: string;
  endogenous: {
    Impressions: number;
    Clicks: number;
    Spent: number;
  };
  transactional: {
    Total_Conversion: number;
  };
  audience: {
    age: string;
    gender: string;
    interest: string;
  };
}

export interface SimulationResponse {
  projected_roi: number
  incremental_roas: number
  pareto_optimal_budgets: Record<string, number>[]
  /** Hill function shape parameter (steepness of the S-curve). Defaults to ~2 if absent. */
  hill_S?: number
  /** Hill function half-saturation constant (spend at which response = 50%). Defaults to derived from maxSpend. */
  hill_K?: number
}

export interface SimulationTaskResponse {
  task_id: string
  status: "processing" | "SUCCESS" | "FAILURE" | "PENDING"
  result?: SimulationResponse
  error?: string
}

export interface HistoricalSpendRecord {
  date: string          // "2024-01-01"
  channel: string       // "Meta"
  spend: number         // 5000.0
}

export interface ForecastRequest {
  historical_spend_data: HistoricalSpendRecord[]
  exogenous_factors: Record<string, number>
}

export interface ForecastResponse {
  baseline_sales: number
  incremental_sales: number
  confidence_interval: [number, number]   // [lower_5th, upper_95th] — REAL PyMC quantiles
}
