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

// Conversational formatter for AI recommendations
function formatConversationalRecommendation(reasoning: string): string {
  const amountMatch = reasoning.match(/(?:BDT|৳)\s*([\d,]+)/i) || reasoning.match(/([\d,]+)\s*(?:BDT|৳)/i);
  const channelMatch = reasoning.match(/to\s+([A-Za-z\s]+?)(?:\s+Ads|\s+Search)?\./i) || reasoning.match(/to\s+([A-Za-z\s]+?)(?:\s+Ads|\s+Search)?\s/i);
  const percentMatch = reasoning.match(/([\d.]+%)/);
  const demoMatch = reasoning.match(/in\s+the\s+([\d-]+)\s+([A-Za-z\s]+)?/i) || reasoning.match(/demographic\s+([^\s,.]+)/i);

  const amount = amountMatch ? `৳${amountMatch[1]}` : "some budget";
  const channel = channelMatch ? channelMatch[1].trim() : "the recommended channel";
  const percentage = percentMatch ? percentMatch[1] : "a significant margin";
  const demographic = demoMatch ? `the ${demoMatch[1].trim()} audience` : "your target demographic";

  if (reasoning.toLowerCase().includes("shift")) {
    return `Moving ${amount} to ${channel} could increase profits by ${percentage}, especially with ${demographic}.`;
  }
  
  if (reasoning.toLowerCase().includes("maintain") || reasoning.toLowerCase().includes("hold")) {
    const holdChannelMatch = reasoning.match(/(?:Maintain|Hold)\s+([A-Za-z]+)\s+spend/i) || reasoning.match(/([A-Za-z]+)\s+spend/i);
    const holdChannel = holdChannelMatch ? holdChannelMatch[1] : "this channel";
    return `Keeping your spend on ${holdChannel} stable is recommended to avoid diminishing returns, as it has reached its optimal profit point.`;
  }

  return reasoning;
}

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
        <h1 className="text-3xl font-black tracking-tight font-noto-bengali text-[#0A0A0A] uppercase">
          {tReport("title")}
        </h1>
        <div className="flex items-center gap-2 rounded-full bg-[#0A0A0A] px-3 py-1.5 text-xs text-white font-bold">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FACC15] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FACC15]" />
          </span>
          {tReport("live_badge")}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] font-noto-bengali">
              {t("estimated_revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#0A0A0A]">
              ৳{estimatedRevenue.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              {(confidence_level * 100).toFixed(0)}% CI: ৳
              {lower_bound.toLocaleString()} – ৳{upper_bound.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] font-noto-bengali">
              {t("total_spend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#0A0A0A]">৳{totalSpend.toLocaleString()}</div>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              {t("across_channels", {
                count: optimization_result.optimized_allocations.length,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] font-noto-bengali">
              {tReport("roi")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#0A0A0A]">
              {totalSpend > 0
                ? ((estimatedRevenue / totalSpend) * 100).toFixed(1)
                : "0"}
              %
            </div>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              {tReport("roi_desc")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="font-noto-bengali text-[#0A0A0A] font-bold uppercase tracking-wider text-sm">
            {tReport("allocation_breakdown")}
          </CardTitle>
          <CardDescription className="font-noto-bengali text-[#6B6B6B]">
            {tReport("allocation_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-[#E5E5E5] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5]">
                  <th className="h-10 px-4 text-left font-bold uppercase tracking-wider text-xs text-[#6B6B6B] bg-[#F5F5F0] font-noto-bengali">
                    {t("channel")}
                  </th>
                  <th className="h-10 px-4 text-right font-bold uppercase tracking-wider text-xs text-[#6B6B6B] bg-[#F5F5F0] font-noto-bengali">
                    {t("spend")}
                  </th>
                  <th className="h-10 px-4 text-right font-bold uppercase tracking-wider text-xs text-[#6B6B6B] bg-[#F5F5F0] font-noto-bengali">
                    {tReport("share")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {optimization_result.optimized_allocations.map((alloc) => (
                  <tr
                    key={alloc.channel_name}
                    className="border-b border-[#E5E5E5] transition-colors last:border-0 hover:bg-[#F5F5F0]"
                  >
                    <td className="p-4 capitalize font-semibold text-[#0A0A0A]">{alloc.channel_name}</td>
                    <td className="p-4 text-right font-bold text-[#0A0A0A]">
                      ৳{alloc.spend.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-[#6B6B6B]">
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
        <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="font-noto-bengali text-[#0A0A0A] font-bold uppercase tracking-wider text-sm">
              {t("recommendations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimization_result.recommendations.map((rec) => (
                <div key={rec.recommendation_id} className="flex items-center justify-between rounded-xl bg-[#F5F5F0] p-3 border border-[#E5E5E5] hover:border-[#0A0A0A] transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${rec.action === 'shift_budget' ? 'bg-[#FACC15] text-[#0A0A0A]' : 'bg-[#0A0A0A] text-white'}`}>
                      {rec.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-[#0A0A0A]">{formatConversationalRecommendation(rec.recommendation_reasoning)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
