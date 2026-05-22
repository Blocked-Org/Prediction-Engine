/**
 * @file demo-data.ts
 * @description Realistic fallback demo data for ROI and Markov charts.
 * Used when the FastAPI backend is unreachable (e.g., during demo recording).
 * Data is designed to look convincing for a Bangladeshi e-commerce brand scenario.
 */

import type { ROIDataPoint } from "@/components/charts/ROITrackingChart";
import type {
  MarkovFunnelData,
  MarkovNode,
  MarkovEdge,
} from "@/components/charts/MarkovFunnelChart";

/**
 * Generates 12 months of realistic iROAS data with Bayesian credible intervals.
 * The curve ramps from sub-breakeven (~0.8×) to profitable (~2.1×), mimicking
 * a campaign that learns and optimizes over time.
 */
export function generateDemoROIData(): ROIDataPoint[] {
  const baseIROAS = [
    0.82, 0.95, 1.08, 1.22, 1.35, 1.48, 1.62, 1.75, 1.85, 1.95, 2.02, 2.10,
  ];

  return baseIROAS.map((iroas, i) => {
    const month = String(i + 1).padStart(2, "0");
    // Credible interval narrows as more data accumulates (Bayesian convergence)
    const uncertaintyWidth = 0.45 - i * 0.02;
    return {
      date: `2026-${month}-15`,
      iroas: Math.round(iroas * 100) / 100,
      lower: Math.round((iroas - uncertaintyWidth) * 100) / 100,
      upper: Math.round((iroas + uncertaintyWidth) * 100) / 100,
    };
  });
}

/**
 * Generates a realistic Markov funnel with 6 touchpoints and transition edges.
 * Models a typical Bangladeshi SME multi-channel journey:
 * Meta Ad / Google Search / TikTok → Website Visit → Cart → Purchase
 */
export function generateDemoMarkovData(): MarkovFunnelData {
  const nodes: MarkovNode[] = [
    { id: "Meta Ad", label: "Meta Ad", trafficShare: 0.35 },
    { id: "Google Search", label: "Google Search", trafficShare: 0.28 },
    { id: "TikTok", label: "TikTok", trafficShare: 0.22 },
    { id: "Website Visit", label: "Website Visit", trafficShare: 0.45 },
    { id: "Cart", label: "Cart", trafficShare: 0.18 },
    { id: "Purchase", label: "Purchase", trafficShare: 0.08 },
  ];

  const edges: MarkovEdge[] = [
    // Awareness → Consideration
    { from: "Meta Ad", to: "Website Visit", probability: 0.42 },
    { from: "Google Search", to: "Website Visit", probability: 0.55 },
    { from: "TikTok", to: "Website Visit", probability: 0.38 },
    // Direct to lower-funnel (skip-stage transitions)
    { from: "Meta Ad", to: "Cart", probability: 0.08 },
    { from: "Google Search", to: "Cart", probability: 0.12 },
    // Consideration → Lower-funnel
    { from: "Website Visit", to: "Cart", probability: 0.22 },
    // Lower-funnel → Conversion
    { from: "Cart", to: "Purchase", probability: 0.45 },
    // Self-loop (return visits)
    { from: "Website Visit", to: "Website Visit", probability: 0.15 },
  ];

  return { nodes, edges };
}
