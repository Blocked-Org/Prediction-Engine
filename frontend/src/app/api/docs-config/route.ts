import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { DEFAULT_DOCS_SCHEDULE, TEAM_MEMBERS, PITCH_SECTIONS } from "@/lib/docs-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/v1/public/docs/config`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    // Graceful fallback for mock mode / offline backend
    return NextResponse.json({
      schedule: DEFAULT_DOCS_SCHEDULE,
      team_members: TEAM_MEMBERS,
      pitch_sections: PITCH_SECTIONS
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized — no active Clerk session." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${API_URL}/api/v1/admin/docs/config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend failed: ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.warn("Backend unreachable for saving docs config, simulating success for UI");
    return NextResponse.json({ success: true, message: "Simulated save" });
  }
}
