import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import {
  fetchOnboardingStatus,
  isOnboardedFromClaims,
} from "./lib/onboarding";

const intlMiddleware = createIntlMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/:locale/dashboard(.*)",
  "/:locale/onboarding",
]);

const isOnboardingRoute = createRouteMatcher(["/:locale/onboarding"]);

// Public auth routes — must pass through next-intl (en|bn) before Clerk
const isAuthRoute = createRouteMatcher([
  "/(en|bn)/sign-in(.*)",
  "/(en|bn)/sign-up(.*)",
]);

const isApiRoute = (req: NextRequest) =>
  req.nextUrl.pathname.startsWith("/api") ||
  req.nextUrl.pathname.startsWith("/trpc");

function isIntlRedirect(response: NextResponse): boolean {
  return (
    response.status === 307 ||
    response.status === 308 ||
    Boolean(response.headers.get("location"))
  );
}

function localeFromPathname(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment && routing.locales.includes(segment as "en" | "bn")) {
    return segment;
  }
  return routing.defaultLocale;
}

async function resolveOnboarded(
  userId: string,
  sessionClaims: Parameters<typeof isOnboardedFromClaims>[0]
): Promise<boolean> {
  // Fast path: Clerk session claims already say onboarded
  if (isOnboardedFromClaims(sessionClaims)) {
    return true;
  }

  // Try fetching from backend
  const status = await fetchOnboardingStatus(userId);

  // Backend unreachable — if Clerk claims didn't already confirm
  // onboarding (fast path above), we must assume NOT onboarded and
  // redirect to the onboarding page. This prevents new users from
  // skipping onboarding when the Python backend is down.
  if (status === null) {
    console.warn("[middleware] Backend unreachable for onboarding check — redirecting to onboarding");
    return false;
  }

  if (!status.is_onboarded) {
    return false;
  }

  // Backfill Clerk metadata so future requests use the fast path
  try {
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { isOnboarded: true },
    });
  } catch {
    // Backfill metadata is best-effort; graph status still gates access.
  }

  return true;
}

export default clerkMiddleware(async (auth, req) => {
  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(req);

  if (isIntlRedirect(intlResponse)) {
    return intlResponse;
  }

  if (isAuthRoute(req)) {
    return intlResponse;
  }

  if (isProtectedRoute(req)) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      await auth.protect();
      return intlResponse;
    }

    const locale = localeFromPathname(req.nextUrl.pathname);
    const isOnboarding = isOnboardingRoute(req);

    let onboarded = false;
    if (isOnboarding) {
      // To break infinite redirect loops, if the user is visiting the onboarding route,
      // we query the backend directly to verify if they actually have a campaign.
      const status = await fetchOnboardingStatus(userId);
      // If backend is unreachable (null), DON'T redirect to dashboard — let them stay on onboarding
      onboarded = status !== null && status.is_onboarded === true && status.has_campaign === true;
    } else {
      // For dashboard and other routes, use the faster session claims check
      onboarded = await resolveOnboarded(
        userId,
        sessionClaims as Parameters<typeof isOnboardedFromClaims>[0]
      );
    }

    if (!onboarded && !isOnboarding) {
      const onboardingUrl = new URL(`/${locale}/onboarding`, req.url);
      return NextResponse.redirect(onboardingUrl);
    }

    if (onboarded && isOnboarding) {
      const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return intlResponse;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
