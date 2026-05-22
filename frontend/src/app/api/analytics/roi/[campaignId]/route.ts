/**
 * Next.js API proxy — forwards ROI analytics requests to the FastAPI backend.
 * GET /api/analytics/roi/:campaignId → FastAPI /api/v1/analytics/roi/:campaignId
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
    const { MOCK_ROI_DATA } = await import("@/lib/mock-data");
    return NextResponse.json(MOCK_ROI_DATA);
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
      `${API_URL}/api/v1/analytics/roi/${encodeURIComponent(campaignId)}`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.warn("[roi] Backend ROI analytics failed. Returning mock data.");
      const { MOCK_ROI_DATA } = await import("@/lib/mock-data");
      return NextResponse.json(MOCK_ROI_DATA);
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("ROI analytics proxy error, returning mock:", error);
    const { MOCK_ROI_DATA } = await import("@/lib/mock-data");
    return NextResponse.json(MOCK_ROI_DATA);
  }
}
