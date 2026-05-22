/**
 * Day 6: Proxies simulation requests to Dev B's real FastAPI backend.
 * POST enqueues a Celery task, GET polls for the result.
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
      task_id: "mock-task-123"
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

    const response = await fetch(`${API_URL}/api/v1/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn("[simulate] Backend failed, returning mock task ID.");
      return NextResponse.json({ task_id: "mock-task-123" });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Simulate proxy error:", error);

    // Graceful fallback: return a synthetic result so the UI doesn't break.
    // The saturation curve already updates live via slider preview;
    // this ensures the "Run" button doesn't scare users with an error
    // when the heavy backend is temporarily unavailable.
    try {
      const fallbackBody = await request.clone().json().catch(() => ({}));
      const budgets = fallbackBody?.budget_overrides ?? {};
      const totalSpend =
        (budgets.Meta ?? 0) + (budgets.Google ?? 0) + (budgets.TikTok ?? 0);

      return NextResponse.json({
        _fallback: true,
        _warning:
          "Backend unavailable — showing client-side estimate. Results will update when the server reconnects.",
        optimized_allocations: Object.entries(budgets).map(
          ([channel, spend]) => ({
            channel,
            spend: spend as number,
            percentage:
              totalSpend > 0
                ? Math.round(((spend as number) / totalSpend) * 100)
                : 0,
          })
        ),
        expected_forecast: {
          estimated_revenue: Math.round(totalSpend * 1.6),
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Backend unreachable" },
        { status: 502 }
      );
    }
  }
}
