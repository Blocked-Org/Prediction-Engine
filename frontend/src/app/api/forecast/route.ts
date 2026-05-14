/**
 * Day 6: Proxies forecast requests to Dev B's real FastAPI backend.
 * No more mock data — responses now contain real PyMC confidence intervals.
 */
import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(`${API_URL}/api/v1/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Forecast proxy error:', error)
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}

// Keep GET for backward compatibility with the dashboard page
export async function GET() {
  // Provide minimal mock for the dashboard that still uses GET /api/forecast
  // TODO: migrate dashboard to POST with real historical data
  const mockPayload = {
    simulation_scenario: {
      scenario_id: "sim_001",
      campaign_input: {
        campaign_id: "camp_2026_q3",
        channel_names: ["search", "social", "display"],
        date_range: { start_date: "2026-07-01", end_date: "2026-09-30" },
        target_audience: {
          demographics: { age: "18-35", income: "medium-high" },
          interests: ["technology", "gadgets"],
        },
        region: "US-West",
        allocations: [
          { channel_name: "search", spend: 50000.0, impressions: 1500000, clicks: 45000, conversions: 1200, ctr: 0.03, cpc: 1.11 },
          { channel_name: "social", spend: 30000.0, impressions: 3000000, clicks: 30000, conversions: 600, ctr: 0.01, cpc: 1.00 },
        ],
      },
      competitor_signals: [
        { competitor_name: "TechGiant Inc.", signal_type: "price_drop", impact_score: 0.75, description: "Major competitor dropped prices by 15%." },
      ],
    },
    optimization_result: {
      campaign_id: "camp_2026_q3",
      optimized_allocations: [
        { channel_name: "search", spend: 60000.0 },
        { channel_name: "social", spend: 20000.0 },
      ],
      expected_forecast: {
        campaign_id: "camp_2026_q3",
        estimated_revenue: 250000.0,
        uncertainty_bounds: { lower_bound: 230000.0, upper_bound: 270000.0, confidence_level: 0.95 },
      },
      recommendations: [
        { recommendation_id: "rec_001", action: "increase_search_spend", recommendation_reasoning: "Search shows higher expected ROI." },
      ],
    },
  }
  return NextResponse.json(mockPayload)
}
