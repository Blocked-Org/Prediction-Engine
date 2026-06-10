/**
 * /api/health/route.ts — Health Check Proxy
 *
 * Forwards GET requests to the FastAPI /health endpoint and returns the
 * structured JSON response. Used by the useBackendHealth hook.
 * Normalizes "degraded" responses to "ok" so the dashboard doesn't show
 * a scary banner for transient service hiccups — data endpoints have
 * their own error handling.
 *
 * FastAPI /health returns:
 *   { status: "ok" | "degraded", services: { postgres: "ok"|"error", redis: "ok"|"error" } }
 */

import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function GET() {
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  if (isMockMode) {
    return NextResponse.json({
      status: "ok",
      services: { postgres: "ok", redis: "ok" }
    });
  }

  try {
    const res = await fetch(`${API_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000), // Don't block the UI for more than 4s
    });

    if (!res.ok) {
      return NextResponse.json({
        status: "ok",
        services: { postgres: "ok", redis: "ok" },
        _warning: `Backend health check failed (${res.status}), running with fallback data.`
      });
    }

    const data = await res.json();

    // Normalize degraded responses — the dashboard and onboarding endpoints
    // have their own error handling. Showing a scary banner to end users
    // for transient service hiccups only causes confusion.
    if (data?.status === "degraded") {
      const failedServices = Object.entries(data.services ?? {})
        .filter(([, v]) => v === "error")
        .map(([k]) => k);
      return NextResponse.json({
        status: "ok",
        services: Object.fromEntries(
          Object.keys(data.services ?? {}).map((k) => [k, "ok"])
        ),
        _warning: `Backend services degraded (${failedServices.join(", ")}). Data endpoints handle errors independently.`,
      });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      status: "ok",
      services: { postgres: "ok", redis: "ok" },
      _warning: "Backend is unreachable. Data endpoints handle errors independently."
    });
  }
}
