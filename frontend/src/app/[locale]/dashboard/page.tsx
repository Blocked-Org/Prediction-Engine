/**
 * @file page.tsx
 * @description Main analytics dashboard — server-fetched, per-user simulation data.
 */
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardView } from "@/components/dashboard/DashboardView";
import {
  fetchDashboardResults,
  toDashboardData,
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
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

  return <DashboardView data={data} />;
}
