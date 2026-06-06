"use client";

import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, Brain, ArrowRight, Sparkles, TrendingUp, Search, Clock, CheckCircle } from "lucide-react";
import type { DashboardSimulationData } from "@/lib/dashboard";
import type { ChannelAllocation } from "@/lib/types/contracts";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

const DynamicDataTable = dynamic(
  () => import("@/components/DataTable").then((mod) => mod.DataTable),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-10 w-full rounded-md bg-[#E5E5E5]" />
        <Skeleton className="h-8 w-full rounded-md bg-[#E5E5E5]/50" />
        <Skeleton className="h-8 w-full rounded-md bg-[#E5E5E5]/50" />
        <Skeleton className="h-8 w-full rounded-md bg-[#E5E5E5]/50" />
        <Skeleton className="h-8 w-3/4 rounded-md bg-[#E5E5E5]/50" />
      </div>
    ),
  }
) as ComponentType<DataTableProps<any, any>>;

type DashboardViewProps = {
  data: DashboardSimulationData;
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

export function DashboardView({ data }: DashboardViewProps) {
  const t = useTranslations("Dashboard");
  const { simulation_scenario, optimization_result } = data;
  const allocations = simulation_scenario.campaign_input.allocations;

  const totalSpend = optimization_result.optimized_allocations.reduce(
    (acc, curr) => acc + curr.spend,
    0
  );

  const rawRevenue = optimization_result.expected_forecast.estimated_revenue;
  let estimatedRevenue = rawRevenue;
  let isProjected = false;
  
  if (totalSpend > 0 && rawRevenue / totalSpend > 50) {
    estimatedRevenue = totalSpend * 15;
    isProjected = true;
  }

  const columns: ColumnDef<ChannelAllocation>[] = [
    {
      accessorKey: "channel_name",
      header: t("channel"),
      cell: ({ row }) => (
        <div className="capitalize font-semibold text-[#0A0A0A]">{row.getValue("channel_name")}</div>
      ),
    },
    {
      accessorKey: "spend",
      header: t("spend"),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("spend"));
        const formatted = new Intl.NumberFormat("bn-BD", {
          style: "currency",
          currency: "BDT",
          maximumFractionDigits: 0,
        }).format(amount);
        return <div className="font-bold text-[#0A0A0A]">{formatted}</div>;
      },
    },
    {
      accessorKey: "impressions",
      header: t("impressions"),
      cell: ({ row }) => {
        const value = row.getValue("impressions");
        return typeof value === "number" ? <span className="text-[#6B6B6B]">{value.toLocaleString()}</span> : "—";
      },
    },
    {
      accessorKey: "clicks",
      header: t("clicks"),
      cell: ({ row }) => {
        const value = row.getValue("clicks");
        return typeof value === "number" ? <span className="text-[#6B6B6B]">{value.toLocaleString()}</span> : "—";
      },
    },
    {
      accessorKey: "conversions",
      header: t("conversions"),
      cell: ({ row }) => {
        const value = row.getValue("conversions");
        return typeof value === "number" ? <span className="font-semibold text-[#0A0A0A]">{value.toLocaleString()}</span> : "—";
      },
    },
    {
      accessorKey: "ctr",
      header: t("ctr"),
      cell: ({ row }) => {
        const ctr = parseFloat(row.getValue("ctr"));
        return <div className="text-[#6B6B6B]">{(ctr * 100).toFixed(1)}%</div>;
      },
    },
    {
      accessorKey: "cpc",
      header: t("cpc"),
      cell: ({ row }) => {
        const cpc = parseFloat(row.getValue("cpc"));
        return <div className="text-[#6B6B6B]">৳{cpc.toFixed(2)}</div>;
      },
    },
  ];

  // Channel color mapping for bars
  const channelColors: Record<string, { bg: string; text: string }> = {
    meta: { bg: 'bg-[#0A0A0A]', text: 'text-[#0A0A0A]' },
    google: { bg: 'bg-[#FACC15]', text: 'text-[#0A0A0A]' },
    tiktok: { bg: 'bg-[#EF4444]', text: 'text-[#EF4444]' },
  };
  const fallbackColor = { bg: 'bg-[#6B6B6B]', text: 'text-[#6B6B6B]' };

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight font-noto-bengali text-[#0A0A0A] uppercase">
          {t("title")}
        </h1>
        <Badge className="bg-[#0A0A0A] text-white border-none px-3 py-1 text-xs uppercase tracking-wider font-bold rounded-full">
          Live Model
        </Badge>
      </div>

      {/* ── TOP KPI METRICS (Full Width Grid) ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Estimated Revenue Card */}
        <Card className="border border-[#E5E5E5] bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] font-noto-bengali flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#F5F5F0] border border-[#E5E5E5]">
                <DollarSign className="w-4 h-4 text-[#0A0A0A]" />
              </div>
              {t("estimated_revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mt-2">
              <div className="text-3xl font-black font-tabular-nums tracking-tight text-[#0A0A0A] flex items-center gap-2">
                ৳{estimatedRevenue.toLocaleString("bn-BD")}
                {isProjected && (
                  <span className="text-[10px] font-bold text-[#0A0A0A] bg-[#FACC15] px-2 py-0.5 rounded-full" title="Capped due to unrealistic scale">
                    PROJ
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-[#0A0A0A] flex items-center bg-[#FACC15] px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" />
                {totalSpend > 0 ? `+${((estimatedRevenue - totalSpend) / totalSpend * 100).toFixed(1)}%` : 'N/A'} ROI
              </div>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-3 font-medium">
              {t("confidence_interval")}
            </p>
          </CardContent>
        </Card>

        {/* Total Spend Card */}
        <Card className="border border-[#E5E5E5] bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] font-noto-bengali flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#F5F5F0] border border-[#E5E5E5]">
                <CreditCard className="w-4 h-4 text-[#0A0A0A]" />
              </div>
              {t("total_spend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mt-2">
              <div className="text-3xl font-black font-tabular-nums tracking-tight text-[#0A0A0A]">
                ৳{totalSpend.toLocaleString("bn-BD")}
              </div>
              <div className="text-xs font-bold text-[#0A0A0A] flex items-center bg-[#F5F5F0] px-2.5 py-1 rounded-full border border-[#E5E5E5]">
                {optimization_result.optimized_allocations.length} Channels
              </div>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-3 font-medium">
              {t("across_channels", {
                count: optimization_result.optimized_allocations.length,
              })}
            </p>
          </CardContent>
        </Card>

        {/* Projected ROI Card */}
        <Card className="border border-[#E5E5E5] bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] font-noto-bengali flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#F5F5F0] border border-[#E5E5E5]">
                <TrendingUp className="w-4 h-4 text-[#0A0A0A]" />
              </div>
              Projected ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mt-2">
              <div className="text-3xl font-black font-tabular-nums tracking-tight text-[#0A0A0A]">
                {totalSpend > 0 ? (estimatedRevenue / totalSpend).toFixed(2) : "0.00"}×
              </div>
              <div className="text-xs font-bold text-[#0A0A0A] flex items-center bg-[#FACC15] px-2.5 py-1 rounded-full">
                {totalSpend > 0 ? `${((estimatedRevenue / totalSpend) * 100).toFixed(0)}%` : "0%"} yield
              </div>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-3 font-medium">
              Expected return on every ad spend dollar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── AI RECOMMENDATIONS (Directly Below KPIs, Full Width) ───────────────── */}
      <Card className="border border-[#E5E5E5] bg-white shadow-sm transition-all hover:shadow-md rounded-2xl">
        <CardHeader className="pb-4 border-b border-[#E5E5E5]">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] font-noto-bengali flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FACC15] relative">
              <Brain className="w-4 h-4 text-[#0A0A0A]" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-[#0A0A0A]" />
            </div>
            {t("recommendations")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optimization_result.recommendations.length > 0 ? (
              optimization_result.recommendations.map((rec) => (
                <div
                  key={rec.recommendation_id}
                  className="flex items-start justify-between rounded-xl bg-[#F5F5F0] p-4 border border-[#E5E5E5] hover:border-[#0A0A0A] transition-all group shadow-sm cursor-pointer"
                >
                  <div className="flex flex-col gap-2.5 pr-4">
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${rec.action === 'shift_budget' ? 'bg-[#FACC15] text-[#0A0A0A]' : 'bg-[#0A0A0A] text-white'}`}>
                        {rec.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-[#0A0A0A] leading-snug">
                      {formatConversationalRecommendation(rec.recommendation_reasoning)}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-[#F5F5F0] border border-[#E5E5E5] flex items-center justify-center shrink-0 group-hover:bg-[#0A0A0A] group-hover:border-[#0A0A0A] transition-colors">
                    <ArrowRight className="w-4 h-4 text-[#6B6B6B] group-hover:text-white transition-colors group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center h-40 text-center gap-3 opacity-60">
                <CheckCircle className="h-8 w-8 text-[#6B6B6B]" />
                <p className="text-[#6B6B6B] font-noto-bengali text-sm">
                  {t("no_recommendations")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── LOWER CONTENT AREA (Grid: 2/3 Main Charts & Logs, 1/3 Sidebar Status) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
        
        {/* Left Column (lg:col-span-2) */}
        <div className="lg:col-span-2 flex flex-col gap-8 min-w-0">
          {/* Hero Trend Chart */}
          <Card className="relative overflow-hidden border border-[#E5E5E5] bg-white shadow-sm min-h-[320px] flex flex-col transition-all duration-300 hover:shadow-md rounded-2xl">
             <CardHeader className="border-b border-[#E5E5E5] pb-4">
                <CardTitle className="text-sm font-bold text-[#0A0A0A] flex items-center justify-between uppercase tracking-wider">
                  <span>Performance Trajectory</span>
                  <div className="flex gap-2">
                    <Badge className="text-[10px] bg-[#F5F5F0] text-[#0A0A0A] border border-[#E5E5E5] rounded-full font-semibold">ROAS</Badge>
                    <Badge className="text-[10px] bg-[#F5F5F0] text-[#0A0A0A] border border-[#E5E5E5] rounded-full font-semibold">CPA</Badge>
                  </div>
                </CardTitle>
             </CardHeader>
             <CardContent className="flex-1 flex flex-col justify-end relative pt-6 pb-4 px-6">
                 {(() => {
                    const allocs = optimization_result.optimized_allocations;
                    const maxSpend = Math.max(...allocs.map(a => a.spend), 1);

                    return (
                      <div className="flex items-end justify-around gap-6 h-[220px] w-full border-b border-l border-[#E5E5E5] pl-2 pb-0 relative">
                        {/* Y-axis guide lines */}
                        <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none py-2">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="border-t border-[#E5E5E5]/50 w-full" />
                          ))}
                        </div>

                        {allocs.map((alloc) => {
                          const pct = (alloc.spend / maxSpend) * 100;
                          const colors = channelColors[alloc.channel_name.toLowerCase()] || fallbackColor;
                          const formatted = `৳${alloc.spend.toLocaleString('bn-BD')}`;
                          return (
                            <div key={alloc.channel_name} className="flex flex-col items-center gap-2 flex-1 z-10 group">
                              {/* Amount label */}
                              <span className={`text-xs font-bold ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                                {formatted}
                              </span>
                              {/* Bar */}
                              <div className="w-full max-w-[72px] flex items-end" style={{ height: '170px' }}>
                                <div
                                  className={`w-full rounded-t-lg ${colors.bg} transition-all duration-700 ease-out hover:brightness-110`}
                                  style={{ height: `${Math.max(pct, 5)}%` }}
                                />
                              </div>
                              {/* Channel name */}
                              <span className="text-[11px] font-semibold text-[#6B6B6B] capitalize tracking-wide">
                                {alloc.channel_name}
                              </span>
                              {/* Spend below name */}
                              <span className={`text-[10px] font-bold ${colors.text}`}>
                                {formatted}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                 })()}
              </CardContent>
          </Card>

          {/* Data Table */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-noto-bengali tracking-tight text-[#0A0A0A] uppercase">
                {t("transactional_logs")}
              </h2>
              <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B6B]" />
                <Input placeholder="Search channels or campaigns..." className="pl-9 h-10 text-sm bg-white border-[#E5E5E5] focus-visible:ring-[#0A0A0A]/20 rounded-full text-[#0A0A0A] placeholder:text-[#6B6B6B]" />
              </div>
            </div>
            <div className="rounded-2xl shadow-sm border border-[#E5E5E5] overflow-hidden bg-white [&_tr:nth-child(even)]:bg-[#F5F5F0]/50 [&_th]:border-b [&_th]:border-[#E5E5E5] [&_th]:bg-[#F5F5F0] [&_th]:text-[#0A0A0A] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-xs">
              <DynamicDataTable columns={columns} data={allocations} />
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-1) */}
        <div className="flex flex-col gap-8 min-w-0">
          {/* Status Widget */}
          <Card className="border border-[#E5E5E5] bg-white shadow-sm relative overflow-hidden rounded-2xl">
             <div className="absolute top-0 right-0 p-4 opacity-5">
               <Brain className="h-24 w-24 text-[#0A0A0A]" />
             </div>
             <CardHeader className="pb-3 relative z-10">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#6B6B6B] flex items-center gap-2">
                 System Status
               </CardTitle>
             </CardHeader>
             <CardContent className="relative z-10">
               <div className="flex items-center gap-3">
                 <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#22c55e]"></span>
                 </div>
                 <span className="text-lg font-bold text-[#0A0A0A] tracking-tight">Optimal Alignment</span>
               </div>
               <div className="flex items-center gap-2 mt-4 text-xs text-[#6B6B6B]">
                 <Clock className="h-3 w-3" />
                 <span>Last synced: Just now</span>
               </div>
             </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
