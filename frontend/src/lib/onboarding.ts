const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ClerkSessionClaims = {
  publicMetadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type OnboardingStatus = {
  clerk_user_id: string;
  is_onboarded: boolean;
  has_campaign: boolean;
};

type MetadataRecord = Record<string, unknown>;

function readMetadataClaims(
  sessionClaims: ClerkSessionClaims | null | undefined
): MetadataRecord | undefined {
  if (!sessionClaims) return undefined;
  return sessionClaims.publicMetadata ?? sessionClaims.metadata;
}

export function isOnboardedFromClaims(
  sessionClaims: ClerkSessionClaims | null | undefined
): boolean {
  const metadata = readMetadataClaims(sessionClaims);
  return metadata?.isOnboarded === true;
}

export async function fetchOnboardingStatus(
  clerkUserId: string
): Promise<OnboardingStatus | null> {
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  if (isMockMode) {
    return {
      clerk_user_id: clerkUserId,
      is_onboarded: true,
      has_campaign: true
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(
      `${API_URL}/api/v1/simulate/status/${encodeURIComponent(clerkUserId)}`,
      { cache: "no-store", signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!response.ok) {
      console.warn(`[fetchOnboardingStatus] Backend returned ${response.status} — returning null`);
      return null;
    }
    return (await response.json()) as OnboardingStatus;
  } catch {
    console.warn("[fetchOnboardingStatus] Backend unreachable — returning null");
    return null;
  }
}

export async function resolveIsOnboarded(
  clerkUserId: string | null | undefined,
  _sessionClaims: ClerkSessionClaims | null | undefined
): Promise<boolean> {
  if (!clerkUserId) return false;

  const status = await fetchOnboardingStatus(clerkUserId);
  // If backend unreachable, assume NOT onboarded — let user stay on onboarding page.
  // This is safe because the middleware (resolveOnboarded) handles the dashboard
  // access case separately and allows through when backend is down.
  if (status === null) return false;
  return status.is_onboarded === true && status.has_campaign === true;
}
