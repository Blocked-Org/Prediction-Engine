import { auth } from "@clerk/nextjs/server";

import type {
  OptimizationResult,
  SimulationScenario,
} from "@/lib/types/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://127.0.0.1:8000";

export type DashboardStatus = "ready" | "no_campaign" | "processing";

export type DashboardSimulationData = {
  simulation_scenario: SimulationScenario;
  optimization_result: OptimizationResult;
};

export type DashboardResults = {
  status: DashboardStatus;
  simulation_scenario?: SimulationScenario;
  optimization_result?: OptimizationResult;
};

export async function fetchDashboardResults(
  clerkUserId: string
): Promise<DashboardResults | null> {
  try {
    // Retrieve the Clerk session JWT for authenticating with the FastAPI backend
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      console.error("[fetchDashboardResults] No Clerk session token available — user may not be authenticated.");
      return null;
    }

    const url = `${API_URL}/api/v1/simulate/results/${encodeURIComponent(clerkUserId)}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[fetchDashboardResults] HTTP Error ${response.status} from ${url}:`, errorText);
      return null;
    }

    const data = await response.json();
    return data as DashboardResults;
  } catch (error) {
    console.error("[fetchDashboardResults] Fetch exception occurred:", error);
    return null;
  }
}

export function toDashboardData(
  results: DashboardResults
): DashboardSimulationData | null {
  if (
    results.status !== "ready" ||
    !results.simulation_scenario ||
    !results.optimization_result
  ) {
    return null;
  }

  return {
    simulation_scenario: results.simulation_scenario,
    optimization_result: results.optimization_result,
  };
}
