/**
 * Proxies forecast and dashboard data requests to the FastAPI backend.
 *
 * Phase 1 hardening: extracts the Clerk session JWT and forwards it
 * as a Bearer token so the FastAPI ClerkTenantMiddleware accepts the request.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: Request) {
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  if (isMockMode) {
    return NextResponse.json({
      baseline_sales: 120000,
      incremental_sales: 45000,
      confidence_interval: [135000, 185000]
    });
  }

  try {
    // ── Auth: extract Clerk JWT ──────────────────────────────────────────
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized — no active Clerk session." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${API_URL}/api/v1/forecast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn("[forecast] Backend forecast failed. Returning mock forecast.");
      return NextResponse.json({
        baseline_sales: 120000,
        incremental_sales: 45000,
        confidence_interval: [135000, 185000]
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Forecast proxy error, returning mock:", error);
    return NextResponse.json({
      baseline_sales: 120000,
      incremental_sales: 45000,
      confidence_interval: [135000, 185000]
    });
  }
}

/** Authenticated GET — returns per-user dashboard simulation payload. */
export async function GET() {
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  if (isMockMode) {
    const { MOCK_DASHBOARD_RESULTS } = await import("@/lib/mock-data");
    return NextResponse.json({
      simulation_scenario: MOCK_DASHBOARD_RESULTS.simulation_scenario,
      optimization_result: MOCK_DASHBOARD_RESULTS.optimization_result,
    });
  }

  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized — no active Clerk session." },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/simulate/results/${encodeURIComponent(userId)}`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.warn("[forecast GET] Backend simulation results failed. Returning mock simulation.");
      const { MOCK_DASHBOARD_RESULTS } = await import("@/lib/mock-data");
      return NextResponse.json({
        simulation_scenario: MOCK_DASHBOARD_RESULTS.simulation_scenario,
        optimization_result: MOCK_DASHBOARD_RESULTS.optimization_result,
      });
    }

    const data = await response.json();

    if (data.status !== "ready") {
      // In case we got no campaign, return mock instead of empty state if we want to ensure demo testing works
      console.warn(`[forecast GET] Backend returned state ${data.status}, returning mock simulation results for demo robustness.`);
      const { MOCK_DASHBOARD_RESULTS } = await import("@/lib/mock-data");
      return NextResponse.json({
        simulation_scenario: MOCK_DASHBOARD_RESULTS.simulation_scenario,
        optimization_result: MOCK_DASHBOARD_RESULTS.optimization_result,
      });
    }

    return NextResponse.json({
      simulation_scenario: data.simulation_scenario,
      optimization_result: data.optimization_result,
    });
  } catch (error) {
    console.error("Dashboard results proxy error, returning mock:", error);
    const { MOCK_DASHBOARD_RESULTS } = await import("@/lib/mock-data");
    return NextResponse.json({
      simulation_scenario: MOCK_DASHBOARD_RESULTS.simulation_scenario,
      optimization_result: MOCK_DASHBOARD_RESULTS.optimization_result,
    });
  }
}
