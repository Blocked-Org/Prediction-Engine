/**
 * Next.js API proxy — forwards Markov analytics requests to the FastAPI backend.
 * GET /api/analytics/markov/:campaignId → FastAPI /api/v1/analytics/markov/:campaignId
 *
 * Phase 1 hardening: extracts the Clerk session JWT and forwards it
 * as a Bearer token so the FastAPI ClerkTenantMiddleware accepts the request.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  if (isMockMode) {
    const { MOCK_MARKOV_DATA } = await import("@/lib/mock-data");
    return NextResponse.json(MOCK_MARKOV_DATA);
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

    const { campaignId } = await params;

    const response = await fetch(
      `${API_URL}/api/v1/analytics/markov/${encodeURIComponent(campaignId)}`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.warn("[markov] Backend Markov analytics failed. Returning mock data.");
      const { MOCK_MARKOV_DATA } = await import("@/lib/mock-data");
      return NextResponse.json(MOCK_MARKOV_DATA);
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Markov analytics proxy error, returning mock:", error);
    const { MOCK_MARKOV_DATA } = await import("@/lib/mock-data");
    return NextResponse.json(MOCK_MARKOV_DATA);
  }
}
