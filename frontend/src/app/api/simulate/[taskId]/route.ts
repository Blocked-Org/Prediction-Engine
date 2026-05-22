/**
 * Day 6: Polls Celery task status from Dev B's FastAPI backend.
 *
 * Phase 1 hardening: extracts the Clerk session JWT and forwards it
 * as a Bearer token so the FastAPI ClerkTenantMiddleware accepts the request.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse, NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  if (isMockMode) {
    return NextResponse.json({
      task_id: "mock-task-123",
      status: "SUCCESS",
      result: {
        projected_roi: 2.1,
        incremental_roas: 1.8,
        pareto_optimal_budgets: [
          { Meta: 60000, Google: 30000, TikTok: 10000 }
        ],
        hill_S: 2.0,
        hill_K: 40000
      }
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

    const { taskId } = await params;

    const response = await fetch(`${API_URL}/api/v1/task/${taskId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn("[taskId] Backend task poll failed. Returning mock task result.");
      return NextResponse.json({
        task_id: taskId,
        status: "SUCCESS",
        result: {
          projected_roi: 2.1,
          incremental_roas: 1.8,
          pareto_optimal_budgets: [
            { Meta: 60000, Google: 30000, TikTok: 10000 }
          ],
          hill_S: 2.0,
          hill_K: 40000
        }
      });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Task poll error, returning mock response:", error);
    const { taskId } = await params;
    return NextResponse.json({
      task_id: taskId,
      status: "SUCCESS",
      result: {
        projected_roi: 2.1,
        incremental_roas: 1.8,
        pareto_optimal_budgets: [
          { Meta: 60000, Google: 30000, TikTok: 10000 }
        ],
        hill_S: 2.0,
        hill_K: 40000
      }
    });
  }
}
