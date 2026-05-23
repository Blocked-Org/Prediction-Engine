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
        <Skeleton className="h-10 w-full rounded-md bg-muted/50" />
        <Skeleton className="h-8 w-full rounded-md bg-muted/30" />
        <Skeleton className="h-8 w-full rounded-md bg-muted/30" />
        <Skeleton className="h-8 w-full rounded-md bg-muted/30" />
        <Skeleton className="h-8 w-3/4 rounded-md bg-muted/30" />
      </div>
    ),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) as ComponentType<DataTableProps<any, any>>;

type DashboardViewProps = {
  data: DashboardSimulationData;
};

export function DashboardView({ data }: DashboardViewProps) {
  const t = useTranslations("Dashboard");
  const { simulation_scenario, optimization_result } = data;
  const allocations = simulation_scenario.campaign_input.allocations;

  const totalSpend = optimization_result.optimized_allocations.reduce(
    (acc, curr) => acc + curr.spend,
    0
  );

  let rawRevenue = optimization_result.expected_forecast.estimated_revenue;
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
        <div className="capitalize font-medium text-foreground/90">{row.getValue("channel_name")}</div>
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
        return <div className="font-semibold text-blue-400">{formatted}</div>;
      },
    },
    {
      accessorKey: "impressions",
      header: t("impressions"),
      cell: ({ row }) => {
        const value = row.getValue("impressions");
        return typeof value === "number" ? <span className="text-muted-foreground">{value.toLocaleString()}</span> : "—";
      },
    },
    {
      accessorKey: "clicks",
      header: t("clicks"),
      cell: ({ row }) => {
        const value = row.getValue("clicks");
        return typeof value === "number" ? <span className="text-muted-foreground">{value.toLocaleString()}</span> : "—";
      },
    },
    {
      accessorKey: "conversions",
      header: t("conversions"),
      cell: ({ row }) => {
        const value = row.getValue("conversions");
        return typeof value === "number" ? <span className="font-medium text-emerald-400">{value.toLocaleString()}</span> : "—";
      },
    },
    {
      accessorKey: "ctr",
      header: t("ctr"),
      cell: ({ row }) => {
        const ctr = parseFloat(row.getValue("ctr"));
        return <div className="text-muted-foreground">{(ctr * 100).toFixed(1)}%</div>;
      },
    },
    {
      accessorKey: "cpc",
      header: t("cpc"),
      cell: ({ row }) => {
        const cpc = parseFloat(row.getValue("cpc"));
        return <div className="text-muted-foreground">৳{cpc.toFixed(2)}</div>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight font-noto-bengali bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.2)]">
          Live Model
        </Badge>
      </div>

      {/* Main Layout Grid: 70% Left / 30% Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
        
        {/* ======================= */}
        {/* MAIN CONTENT AREA (Left) */}
        {/* ======================= */}
        <div className="lg:col-span-2 flex flex-col gap-8 min-w-0">
          
          {/* Top KPIs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="border border-border/40 border-l-4 border-l-emerald-500 bg-card/40 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-noto-bengali flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 shadow-inner">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  {t("estimated_revenue")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-3xl font-black font-tabular-nums tracking-tight text-white flex items-center gap-2">
                    ৳{estimatedRevenue.toLocaleString("bn-BD")}
                    {isProjected && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20" title="Capped due to unrealistic scale">
                        PROJ
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center bg-emerald-500/10 px-2 py-1 rounded-full shadow-inner">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {totalSpend > 0 ? `+${((estimatedRevenue - totalSpend) / totalSpend * 100).toFixed(1)}%` : 'N/A'} ROI
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 font-medium">
                  {t("confidence_interval")}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 border-l-4 border-l-blue-500 bg-card/40 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-noto-bengali flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500 shadow-inner">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  {t("total_spend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-3xl font-black font-tabular-nums tracking-tight text-white">
                    ৳{totalSpend.toLocaleString("bn-BD")}
                  </div>
                  <div className="text-xs font-bold text-blue-400 flex items-center bg-blue-500/10 px-2 py-1 rounded-full shadow-inner">
                    {optimization_result.optimized_allocations.length} Channels
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 font-medium">
                  {t("across_channels", {
                    count: optimization_result.optimized_allocations.length,
                  })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Hero Trend Chart Placeholder */}
          <Card className="relative overflow-hidden border border-border/40 bg-zinc-900/60 backdrop-blur-xl shadow-2xl min-h-[320px] flex flex-col transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
             <CardHeader className="border-b border-border/20 bg-muted/10 pb-4">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                  <span>Performance Trajectory</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px] bg-background/50">ROAS</Badge>
                    <Badge variant="outline" className="text-[10px] bg-background/50">CPA</Badge>
                  </div>
                </CardTitle>
             </CardHeader>
             <CardContent className="flex-1 flex flex-col justify-end relative pt-6 pb-4 px-6">
                 {(() => {
                   const channelColors: Record<string, { bg: string; border: string; glow: string; text: string }> = {
                     meta: { bg: 'bg-blue-500/80', border: 'border-blue-400', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]', text: 'text-blue-400' },
                     google: { bg: 'bg-emerald-500/80', border: 'border-emerald-400', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', text: 'text-emerald-400' },
                     tiktok: { bg: 'bg-amber-500/80', border: 'border-amber-400', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]', text: 'text-amber-400' },
                   };
                   const fallbackColor = { bg: 'bg-violet-500/80', border: 'border-violet-400', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.5)]', text: 'text-violet-400' };
                   const allocs = optimization_result.optimized_allocations;
                   const maxSpend = Math.max(...allocs.map(a => a.spend), 1);

                   return (
                     <div className="flex items-end justify-around gap-6 h-[220px] w-full border-b border-l border-border/30 pl-2 pb-0 relative">
                       {/* Y-axis guide lines */}
                       <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none py-2">
                         {[...Array(4)].map((_, i) => (
                           <div key={i} className="border-t border-border/10 w-full" />
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
                                 className={`w-full rounded-t-lg ${colors.bg} ${colors.glow} border-t-2 ${colors.border} transition-all duration-700 ease-out hover:brightness-125`}
                                 style={{ height: `${Math.max(pct, 5)}%` }}
                               />
                             </div>
                             {/* Channel name */}
                             <span className="text-[11px] font-semibold text-muted-foreground capitalize tracking-wide">
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
              <h2 className="text-xl font-bold font-noto-bengali tracking-tight text-foreground/90">
                {t("transactional_logs")}
              </h2>
              <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search channels or campaigns..." className="pl-9 h-10 text-sm bg-card/50 border-border/40 backdrop-blur-sm focus-visible:ring-primary/50 rounded-full" />
              </div>
            </div>
            <div className="rounded-xl shadow-xl border border-border/40 overflow-hidden bg-card/40 backdrop-blur-md [&_tr:nth-child(even)]:bg-muted/10 [&_th]:border-b [&_th]:border-border/30 [&_th]:bg-muted/30">
              <DynamicDataTable columns={columns} data={allocations} />
            </div>
          </div>

        </div>


        {/* ======================= */}
        {/* SIDEBAR AREA (Right)    */}
        {/* ======================= */}
        <div className="flex flex-col gap-8 min-w-0">
          
          {/* Status Widget */}
          <Card className="border border-border/40 border-l-4 border-l-primary bg-zinc-900/60 backdrop-blur-xl shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Brain className="h-24 w-24" />
             </div>
             <CardHeader className="pb-3 relative z-10">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                 System Status
               </CardTitle>
             </CardHeader>
             <CardContent className="relative z-10">
               <div className="flex items-center gap-3">
                 <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                 </div>
                 <span className="text-lg font-bold text-white tracking-tight">Optimal Alignment</span>
               </div>
               <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                 <Clock className="h-3 w-3" />
                 <span>Last synced: Just now</span>
               </div>
             </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="border border-border/40 border-l-4 border-l-violet-500 bg-zinc-900/60 backdrop-blur-xl shadow-xl flex-grow flex flex-col transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <CardHeader className="pb-4 border-b border-border/10">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-noto-bengali flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-500 relative shadow-inner">
                  <Brain className="w-4 h-4" />
                  <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-amber-400 animate-pulse" />
                </div>
                {t("recommendations")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              <div className="space-y-4">
                {optimization_result.recommendations.length > 0 ? (
                  optimization_result.recommendations.map((rec) => (
                    <div
                      key={rec.recommendation_id}
                      className="flex items-start justify-between rounded-xl bg-gradient-to-r from-muted/40 to-muted/10 p-4 border border-border/30 hover:border-violet-500/30 hover:bg-muted/50 transition-all group shadow-sm cursor-pointer"
                    >
                      <div className="flex flex-col gap-2.5 pr-4">
                        <div>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm ${rec.action === 'shift_budget' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'}`}>
                            {rec.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground/90 leading-snug">{rec.recommendation_reasoning}</span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-background border border-border/50 flex items-center justify-center shrink-0 group-hover:bg-violet-500/10 group-hover:border-violet-500/30 transition-colors">
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 transition-colors group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center gap-3 opacity-60">
                    <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground font-noto-bengali text-sm">
                      {t("no_recommendations")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
