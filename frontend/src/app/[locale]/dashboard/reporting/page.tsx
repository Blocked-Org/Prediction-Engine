/**
 * @file page.tsx
 * @description Reporting view with per-user simulation KPIs and channel breakdown.
 */
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { ReportingCharts } from "./ReportingCharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  fetchDashboardResults,
  toDashboardData,
} from "@/lib/dashboard";

export const revalidate = 3600; // ISR: revalidate every hour

type ReportingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ReportingPage({ params }: ReportingPageProps) {
  const { locale } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  const t = await getTranslations("Dashboard");
  const tReport = await getTranslations("Reporting");

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

  const { optimization_result } = data;
  const totalSpend = optimization_result.optimized_allocations.reduce(
    (acc, curr) => acc + curr.spend,
    0
  );
  const estimatedRevenue =
    optimization_result.expected_forecast.estimated_revenue;
  const { lower_bound, upper_bound, confidence_level } =
    optimization_result.expected_forecast.uncertainty_bounds;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-noto-bengali">
          {tReport("title")}
        </h1>
        <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          {tReport("live_badge")}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">
              {t("estimated_revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${estimatedRevenue.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {(confidence_level * 100).toFixed(0)}% CI: $
              {lower_bound.toLocaleString()} – ${upper_bound.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">
              {t("total_spend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpend.toLocaleString()}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("across_channels", {
                count: optimization_result.optimized_allocations.length,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">
              {tReport("roi")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSpend > 0
                ? ((estimatedRevenue / totalSpend) * 100).toFixed(1)
                : "0"}
              %
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {tReport("roi_desc")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-noto-bengali">
            {tReport("allocation_breakdown")}
          </CardTitle>
          <CardDescription className="font-noto-bengali">
            {tReport("allocation_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground font-noto-bengali">
                    {t("channel")}
                  </th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground font-noto-bengali">
                    {t("spend")}
                  </th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground font-noto-bengali">
                    {tReport("share")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {optimization_result.optimized_allocations.map((alloc) => (
                  <tr
                    key={alloc.channel_name}
                    className="border-b transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="p-4 capitalize">{alloc.channel_name}</td>
                    <td className="p-4 text-right font-medium">
                      ${alloc.spend.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-muted-foreground">
                      {totalSpend > 0
                        ? ((alloc.spend / totalSpend) * 100).toFixed(1)
                        : "0"}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ReportingCharts
        allocations={optimization_result.optimized_allocations}
        totalSpend={totalSpend}
        estimatedRevenue={estimatedRevenue}
      />

      {optimization_result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-noto-bengali">
              {t("recommendations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimization_result.recommendations.map((rec) => (
                <div key={rec.recommendation_id} className="rounded-md bg-muted p-3">
                  <span className="font-semibold text-primary">{rec.action}: </span>
                  {rec.recommendation_reasoning}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
