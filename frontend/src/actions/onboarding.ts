"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { SimulationRequest } from "@/lib/types/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type OnboardingActionResult =
  | { success: true }
  | { success: false; error: string };

export async function completeOnboarding(
  locale: string,
  payload: SimulationRequest
): Promise<OnboardingActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "You must be signed in to complete onboarding." };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/simulate/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail ?? body.error ?? body);
      return {
        success: false,
        error: detail || `Request failed (${response.status})`,
      };
    }

    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { isOnboarded: true },
    });

    redirect(`/${locale}/dashboard`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to initialize simulation",
    };
  }
}

export async function syncOnboardingMetadata(
  clerkUserId: string
): Promise<boolean> {
  const { fetchOnboardingStatus } = await import("@/lib/onboarding");
  const status = await fetchOnboardingStatus(clerkUserId);
  if (!status?.is_onboarded) return false;

  const client = await clerkClient();
  await client.users.updateUser(clerkUserId, {
    publicMetadata: { isOnboarded: true },
  });
  return true;
}
