"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

import type { SimulationRequest } from "@/lib/types/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type OnboardingActionResult =
  | { success: true }
  | { success: false; error: string };

export async function completeOnboarding(
  locale: string,
  payload: SimulationRequest
): Promise<OnboardingActionResult> {
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return { success: false, error: "You must be signed in to complete onboarding." };
    }

    // ── Step 1: Hit the backend (skip in mock mode) ──────────────
    if (!isMockMode) {
      try {
        const token = await getToken();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8_000);

        const response = await fetch(`${API_URL}/api/v1/simulate/init`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeout);

        if (!response.ok) {
          console.warn(`[completeOnboarding] Backend returned ${response.status}. Continuing to mark onboarded.`);
        }
      } catch (fetchErr) {
        // Backend unreachable / timed out — continue anyway
        console.warn("[completeOnboarding] Backend fetch failed:", fetchErr);
      }
    }

    // ── Step 2: Mark user as onboarded in Clerk metadata ─────────
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: { isOnboarded: true },
      });
    } catch (clerkErr) {
      console.warn("[completeOnboarding] Clerk metadata update failed:", clerkErr);
      // Non-fatal — the user can still proceed
    }

    return { success: true };

  } catch (error) {
    console.error("[completeOnboarding] Unexpected error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
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
