/**
 * Proxies forecast and dashboard data requests to the FastAPI backend.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/api/v1/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Forecast proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

/** Authenticated GET — returns per-user dashboard simulation payload. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/simulate/results/${encodeURIComponent(userId)}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();

    if (data.status !== "ready") {
      return NextResponse.json(data, {
        status: data.status === "no_campaign" ? 404 : 202,
      });
    }

    return NextResponse.json({
      simulation_scenario: data.simulation_scenario,
      optimization_result: data.optimization_result,
    });
  } catch (error) {
    console.error("Dashboard results proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
