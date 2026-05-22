"use client";

import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DollarSign, CreditCard, Brain, ArrowRight, Sparkles, TrendingUp, Search } from "lucide-react";
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
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-3/4 rounded-md" />
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
        <div className="capitalize">{row.getValue("channel_name")}</div>
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
        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "impressions",
      header: t("impressions"),
      cell: ({ row }) => {
        const value = row.getValue("impressions");
        return typeof value === "number" ? value.toLocaleString() : "—";
      },
    },
    {
      accessorKey: "clicks",
      header: t("clicks"),
      cell: ({ row }) => {
        const value = row.getValue("clicks");
        return typeof value === "number" ? value.toLocaleString() : "—";
      },
    },
    {
      accessorKey: "conversions",
      header: t("conversions"),
      cell: ({ row }) => {
        const value = row.getValue("conversions");
        return typeof value === "number" ? value.toLocaleString() : "—";
      },
    },
    {
      accessorKey: "ctr",
      header: t("ctr"),
      cell: ({ row }) => {
        const ctr = parseFloat(row.getValue("ctr"));
        return <div>{(ctr * 100).toFixed(1)}%</div>;
      },
    },
    {
      accessorKey: "cpc",
      header: t("cpc"),
      cell: ({ row }) => {
        const cpc = parseFloat(row.getValue("cpc"));
        return <div>৳{cpc.toFixed(2)}</div>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-noto-bengali">
          {t("title")}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
        <Card className="border-l-2 border-l-emerald-500 card-hover-lift hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-noto-bengali flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                <DollarSign className="w-4 h-4" />
              </div>
              {t("estimated_revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold font-tabular-nums flex items-center gap-2 pulseGlow">
                ৳{estimatedRevenue.toLocaleString("bn-BD")}
                {isProjected && (
                  <span className="text-[10px] font-normal text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm border border-emerald-500/20" title="Capped due to unrealistic scale">
                    PROJECTED
                  </span>
                )}
              </div>
              <div className="text-xs font-medium text-emerald-500 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" />
                12%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("confidence_interval")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-2 border-l-blue-500 card-hover-lift hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-noto-bengali flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                <CreditCard className="w-4 h-4" />
              </div>
              {t("total_spend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold font-tabular-nums pulseGlow">
                ৳{totalSpend.toLocaleString("bn-BD")}
              </div>
              <div className="text-xs font-medium text-emerald-500 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" />
                4%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("across_channels", {
                count: optimization_result.optimized_allocations.length,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 border-l-2 border-l-violet-500 card-hover-lift hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-noto-bengali flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-500 relative">
                <Brain className="w-4 h-4" />
                <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-amber-400 animate-pulse" />
              </div>
              {t("recommendations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2 mt-1">
              {optimization_result.recommendations.length > 0 ? (
                optimization_result.recommendations.map((rec) => (
                  <div
                    key={rec.recommendation_id}
                    className="flex items-center justify-between rounded-lg bg-gradient-to-r from-muted/50 to-muted p-3 border-l-2 border-l-violet-500 hover:bg-muted transition-colors group"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${rec.action === 'shift_budget' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>
                          {rec.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-foreground/90">{rec.recommendation_reasoning}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 duration-200" />
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground font-noto-bengali text-xs">
                  {t("no_recommendations")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 card-hover-lift">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold font-noto-bengali">
            {t("transactional_logs")}
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search channels..." className="pl-8 h-9 text-sm bg-muted/50 focus-visible:ring-1" />
          </div>
        </div>
        <div className="rounded-md shadow-sm border [&_tr:nth-child(even)]:bg-muted/30 [&_th]:border-b-2 [&_th]:border-muted-foreground/20 overflow-hidden">
          <DynamicDataTable columns={columns} data={allocations} />
        </div>
      </div>
    </div>
  );
}
