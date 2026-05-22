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
    const response = await fetch(
      `${API_URL}/api/v1/simulate/status/${encodeURIComponent(clerkUserId)}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      const { MOCK_ONBOARDING_STATUS } = await import("./mock-data");
      return MOCK_ONBOARDING_STATUS;
    }
    return (await response.json()) as OnboardingStatus;
  } catch {
    try {
      const { MOCK_ONBOARDING_STATUS } = await import("./mock-data");
      return MOCK_ONBOARDING_STATUS;
    } catch {
      return null;
    }
  }
}

export async function resolveIsOnboarded(
  clerkUserId: string | null | undefined,
  sessionClaims: ClerkSessionClaims | null | undefined
): Promise<boolean> {
  if (!clerkUserId) return false;
  if (isOnboardedFromClaims(sessionClaims)) return true;

  const status = await fetchOnboardingStatus(clerkUserId);
  return status?.is_onboarded === true;
}
