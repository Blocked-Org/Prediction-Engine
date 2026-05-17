/**
 * /api/health/route.ts — Day 6 Integration Proxy
 *
 * Forwards GET requests to the FastAPI /health endpoint and returns the
 * structured JSON response. Used by the useBackendHealth hook to allow
 * the frontend UI to surface service degradation banners during integration
 * testing without exposing the raw backend URL to the browser.
 *
 * FastAPI /health returns:
 *   { status: "ok" | "degraded", services: { neo4j: "ok"|"error", redis: "ok"|"error" } }
 */

import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000), // Don't block the UI for more than 4s
    });

    if (!res.ok) {
      return NextResponse.json(
        { status: "degraded", services: {}, error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    // Backend is unreachable — return a synthetic degraded response
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      {
        status: "degraded",
        services: {},
        error: isTimeout ? "Backend health check timed out" : "Backend unreachable",
      },
      { status: 503 }
    );
  }
}
