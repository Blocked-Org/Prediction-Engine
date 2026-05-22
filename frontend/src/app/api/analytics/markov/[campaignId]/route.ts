/**
 * Next.js API proxy — forwards Markov analytics requests to the FastAPI backend.
 * GET /api/analytics/markov/:campaignId → FastAPI /api/v1/analytics/markov/:campaignId
 */
import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;

    const response = await fetch(
      `${API_URL}/api/v1/analytics/markov/${encodeURIComponent(campaignId)}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Markov analytics proxy error:", error);
    return NextResponse.json(
      { error: "Backend unreachable" },
      { status: 502 }
    );
  }
}
