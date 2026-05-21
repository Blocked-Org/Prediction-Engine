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

  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return { success: false, error: "You must be signed in to complete onboarding." };
    }

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

    shouldRedirect = true;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to initialize simulation",
    };
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
