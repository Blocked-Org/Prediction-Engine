"use client";

import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex h-48 items-center justify-center text-muted-foreground animate-pulse">
        Loading table...
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
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
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
        return <div>${cpc.toFixed(2)}</div>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-noto-bengali">
          {t("title")}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">
              {t("estimated_revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {optimization_result.expected_forecast.estimated_revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("confidence_interval")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">
              {t("total_spend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {optimization_result.optimized_allocations
                .reduce((acc, curr) => acc + curr.spend, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("across_channels", {
                count: optimization_result.optimized_allocations.length,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">
              {t("recommendations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {optimization_result.recommendations.length > 0 ? (
                optimization_result.recommendations.map((rec) => (
                  <div
                    key={rec.recommendation_id}
                    className="mt-2 rounded-md bg-muted p-3 first:mt-0"
                  >
                    <span className="font-semibold text-primary">
                      {rec.action}:{" "}
                    </span>
                    {rec.recommendation_reasoning}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground font-noto-bengali">
                  {t("no_recommendations")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <h2 className="mb-4 text-xl font-semibold font-noto-bengali">
          {t("transactional_logs")}
        </h2>
        <DynamicDataTable columns={columns} data={allocations} />
      </div>
    </div>
  );
}
