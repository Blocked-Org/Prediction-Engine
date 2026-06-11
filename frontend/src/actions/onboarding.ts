"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

import type { SimulationRequest } from "@/lib/types/contracts";
import type { OnboardingProfile } from "@/components/onboarding/ConversationalOnboarding";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type OnboardingActionResult =
  | { success: true }
  | { success: false; error: string };

export async function completeOnboarding(
  locale: string,
  payload: SimulationRequest,
  profile?: OnboardingProfile
): Promise<OnboardingActionResult> {
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return { success: false, error: "You must be signed in to complete onboarding." };
    }

    // ── Step 1: Hit the backend (skip in mock mode) ──────────────
    let graphWriteSucceeded = false;
    if (!isMockMode) {
      try {
        const token = await getToken();

        // Warm-up ping: wake up a sleeping Railway container before the
        // heavy /init request.  Fire-and-forget with a short timeout so
        // it doesn't add more than ~2 s to the happy path.
        try {
          const warmup = new AbortController();
          const warmupTimeout = setTimeout(() => warmup.abort(), 5_000);
          await fetch(`${API_URL}/health`, {
            signal: warmup.signal,
            cache: "no-store",
          }).catch(() => {});
          clearTimeout(warmupTimeout);
        } catch {
          // Warm-up is best-effort — ignore failures
        }

        // Railway cold-starts can take 15-30 s; Vercel serverless caps
        // at 60 s.  Use 55 s to leave a small buffer.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55_000);

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

        if (response.ok) {
          graphWriteSucceeded = true;
        } else if (response.status === 503) {
          // Backend DB unavailable — non-fatal for onboarding.
          // The user can proceed; workspace data will be written on next init.
          console.warn(
            "[completeOnboarding] Backend DB unavailable (503) — proceeding with onboarding anyway."
          );
        } else {
          const errText = await response.text();
          console.error(`[completeOnboarding] Backend returned HTTP ${response.status}:`, errText);
          return {
            success: false,
            error: `Simulation initialization failed (HTTP ${response.status}): ${errText || "Unknown error"}`,
          };
        }
      } catch (fetchErr) {
        // Network error or timeout — treat as non-fatal so the user
        // isn't permanently stuck on onboarding.
        const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.error("[completeOnboarding] Backend fetch failed:", fetchErr);

        if (message.includes("aborted")) {
          console.warn(
            "[completeOnboarding] Request timed out — proceeding with onboarding anyway."
          );
        } else {
          console.warn(
            "[completeOnboarding] Backend unreachable — proceeding with onboarding anyway."
          );
        }
      }
    } else {
      // Mock mode: skip backend entirely
      graphWriteSucceeded = true;
    }

    // ── Step 2: Mark user as onboarded in Clerk metadata ─────────
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: {
          isOnboarded: true,
          ...(profile && {
            nickname: profile.nickname,
            businessType: profile.businessType,
            experienceLevel: profile.experienceLevel,
          }),
        },
      });
    } catch (clerkErr) {
      console.warn("[completeOnboarding] Clerk metadata update failed:", clerkErr);
      // Non-fatal — the user can still proceed
    }

    if (!graphWriteSucceeded) {
      console.warn(
        "[completeOnboarding] Onboarding completed without workspace persistence. " +
        "The user's campaign data was NOT saved to PostgreSQL."
      );
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
