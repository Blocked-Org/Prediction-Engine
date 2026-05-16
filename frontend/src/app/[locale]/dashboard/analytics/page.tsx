/**
 * @file page.tsx
 * @description Analytics dashboard with charts driven by the user's campaign simulation.
 */
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AnalyticsView } from "@/components/dashboard/AnalyticsView";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import {
  fetchDashboardResults,
  toDashboardData,
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

type AnalyticsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  const results = await fetchDashboardResults(userId);

  if (!results) {
    return <DashboardEmptyState status="error" />;
  }

  if (results.status === "no_campaign") {
    return <DashboardEmptyState status="no_campaign" />;
  }

  if (results.status === "processing") {
    return <DashboardEmptyState status="processing" />;
  }

  const data = toDashboardData(results);
  if (!data) {
    return <DashboardEmptyState status="processing" />;
  }

  return <AnalyticsView data={data} />;
}
