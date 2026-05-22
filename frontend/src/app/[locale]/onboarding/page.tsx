import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SimulationWizard } from "@/components/onboarding/SimulationWizard";
import { resolveIsOnboarded } from "@/lib/onboarding";
import { syncOnboardingMetadata } from "@/actions/onboarding";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  const onboarded = await resolveIsOnboarded(
    userId,
    sessionClaims as Parameters<typeof resolveIsOnboarded>[1]
  );
  if (onboarded) {
    await syncOnboardingMetadata(userId).catch(() => undefined);
    redirect(`/${locale}/dashboard`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-12 dark:from-slate-950 dark:via-[#0c0f1a] dark:to-slate-950">
      <SimulationWizard locale={locale} />
    </main>
  );
}
