import type { DashboardResults } from "./dashboard";
import type { OnboardingStatus } from "./onboarding";
import type { ROIAnalyticsResponse, MarkovAnalyticsResponse } from "./types/contracts";

export const MOCK_DASHBOARD_RESULTS: DashboardResults = {
  status: "ready",
  simulation_scenario: {
    scenario_id: "mock-scenario-123",
    campaign_input: {
      campaign_id: "mock-campaign-123",
      channel_names: ["Meta", "Google", "TikTok"],
      date_range: {
        start_date: "2024-01-01",
        end_date: "2024-01-07"
      },
      target_audience: {
        demographics: { age: "25-34", gender: "All" },
        interests: ["Technology", "SaaS"]
      },
      region: "Bangladesh",
      allocations: [
        {
          channel_name: "Meta",
          spend: 50000,
          impressions: 250000,
          clicks: 12500,
          conversions: 800,
          ctr: 0.05,
          cpc: 4.0
        },
        {
          channel_name: "Google",
          spend: 40000,
          impressions: 200000,
          clicks: 10000,
          conversions: 650,
          ctr: 0.05,
          cpc: 4.0
        },
        {
          channel_name: "TikTok",
          spend: 10000,
          impressions: 50000,
          clicks: 2500,
          conversions: 150,
          ctr: 0.05,
          cpc: 4.0
        }
      ]
    },
    competitor_signals: [
      {
        competitor_name: "Brand X",
        signal_type: "aggressive_bid",
        impact_score: 8,
        description: "Competitor Brand X increased Meta ad spend by 40% in emerging market hubs."
      }
    ]
  },
  optimization_result: {
    campaign_id: "mock-campaign-123",
    optimized_allocations: [
      {
        channel_name: "Meta",
        spend: 60000,
        impressions: 300000,
        clicks: 15000,
        conversions: 1050,
        ctr: 0.05,
        cpc: 4.0
      },
      {
        channel_name: "Google",
        spend: 30000,
        impressions: 150000,
        clicks: 7500,
        conversions: 520,
        ctr: 0.05,
        cpc: 4.0
      },
      {
        channel_name: "TikTok",
        spend: 10000,
        impressions: 50000,
        clicks: 2500,
        conversions: 150,
        ctr: 0.05,
        cpc: 4.0
      }
    ],
    expected_forecast: {
      campaign_id: "mock-campaign-123",
      estimated_revenue: 165000,
      uncertainty_bounds: {
        lower_bound: 145000,
        upper_bound: 185000,
        confidence_level: 0.95
      }
    },
    recommendations: [
      {
        recommendation_id: "rec-meta-shift",
        action: "shift_budget",
        recommendation_reasoning: "Shift BDT 10,000 from Google Search to Meta Ads. Meta yields a 22.4% higher marginal ROAS in the 25-34 demographic cluster."
      },
      {
        recommendation_id: "rec-tiktok-hold",
        action: "hold_budget",
        recommendation_reasoning: "Maintain TikTok spend. S-curve saturation analysis indicates further spend has diminishing returns under the current ad set structure."
      }
    ]
  }
};

export const MOCK_ONBOARDING_STATUS: OnboardingStatus = {
  clerk_user_id: "mock-user-123",
  is_onboarded: true,
  has_campaign: true
};

export const MOCK_ROI_DATA: ROIAnalyticsResponse = {
  campaign_id: "mock-campaign-123",
  data_points: [
    { date: "2024-01-01", iroas: 1.8, lower: 1.5, upper: 2.1 },
    { date: "2024-01-02", iroas: 1.9, lower: 1.6, upper: 2.2 },
    { date: "2024-01-03", iroas: 2.1, lower: 1.8, upper: 2.4 },
    { date: "2024-01-04", iroas: 2.0, lower: 1.7, upper: 2.3 },
    { date: "2024-01-05", iroas: 2.3, lower: 2.0, upper: 2.6 },
    { date: "2024-01-06", iroas: 2.4, lower: 2.1, upper: 2.7 },
    { date: "2024-01-07", iroas: 2.5, lower: 2.2, upper: 2.8 }
  ]
};

export const MOCK_MARKOV_DATA: MarkovAnalyticsResponse = {
  campaign_id: "mock-campaign-123",
  nodes: [
    { id: "Awareness", label: "Awareness", trafficShare: 1.0 },
    { id: "Consideration", label: "Consideration", trafficShare: 0.65 },
    { id: "Lower-Funnel", label: "Lower-Funnel", trafficShare: 0.35 },
    { id: "Conversion", label: "Conversion", trafficShare: 0.12 }
  ],
  edges: [
    { from: "Awareness", to: "Consideration", probability: 0.65 },
    { from: "Awareness", to: "Lower-Funnel", probability: 0.15 },
    { from: "Consideration", to: "Lower-Funnel", probability: 0.45 },
    { from: "Consideration", to: "Conversion", probability: 0.08 },
    { from: "Lower-Funnel", to: "Conversion", probability: 0.28 }
  ]
};
