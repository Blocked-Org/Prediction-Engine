import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";

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
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-black px-4 py-16 overflow-hidden">
      
      {/* Background Mesh Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-45">
        <div className="absolute top-[10%] left-[5%] w-[700px] h-[700px] rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full bg-accent/10 blur-[140px]" />
        
        {/* Subtle grid lines */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" 
        />
      </div>

      <div className="z-10 flex flex-col items-center gap-8 w-full max-w-3xl">
        
        {/* Brand identity */}
        <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-white mb-2">
          <Activity className="h-6 w-6 text-primary animate-pulse" />
          <span>Buni<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">OS</span></span>
        </div>

        <SimulationWizard locale={locale} />
      </div>
    </main>
  );
}
