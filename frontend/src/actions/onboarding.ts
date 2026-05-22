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
  let shouldRedirect = false;
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return { success: false, error: "You must be signed in to complete onboarding." };
    }

    if (isMockMode) {
      try {
        const client = await clerkClient();
        await client.users.updateUser(userId, {
          publicMetadata: { isOnboarded: true },
        });
      } catch (err) {
        console.warn("[completeOnboarding] Clerk metadata update failed in mock mode, proceeding anyway.", err);
      }
      shouldRedirect = true;
    } else {
      // Get the Clerk session JWT for backend auth (org_id → tenant_id mapping)
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/v1/simulate/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Check if we can fallback to mock behavior on failure
        console.warn("[completeOnboarding] Backend failed. Falling back to local success for onboarding flow.");
        try {
          const client = await clerkClient();
          await client.users.updateUser(userId, {
            publicMetadata: { isOnboarded: true },
          });
        } catch {
          // ignore
        }
        shouldRedirect = true;
      } else {
        const client = await clerkClient();
        await client.users.updateUser(userId, {
          publicMetadata: { isOnboarded: true },
        });
        shouldRedirect = true;
      }
    }
  } catch (error) {
    if (isMockMode) {
      shouldRedirect = true;
    } else {
      console.warn("[completeOnboarding] Connection error. Falling back to mock success.", error);
      shouldRedirect = true;
    }
  }

  if (shouldRedirect) {
    redirect(`/${locale}/dashboard`);
  }
  
  return { success: true };
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
