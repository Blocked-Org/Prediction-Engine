"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { ExecutiveReport } from "@/components/ExecutiveReport";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardSimulationData } from "@/lib/dashboard";
import type { ChannelAllocation } from "@/lib/types/contracts";

const AllocationDonutChart = dynamic(
  () =>
    import("@/components/charts/AllocationDonutChart").then(
      (mod) => mod.AllocationDonutChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] items-center justify-center">
        Loading chart...
      </div>
    ),
  }
);

const SaturationCurveChart = dynamic(
  () =>
    import("@/components/charts/SaturationCurveChart").then(
      (mod) => mod.SaturationCurveChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] items-center justify-center">
        Loading chart...
      </div>
    ),
  }
);

type AnalyticsViewProps = {
  data: DashboardSimulationData;
};

export function AnalyticsView({ data }: AnalyticsViewProps) {
  const t = useTranslations("Dashboard");
  const { optimization_result } = data;
  const optimizedAllocations = optimization_result.optimized_allocations;

  const totalSpend = optimizedAllocations.reduce(
    (acc: number, curr: ChannelAllocation) => acc + curr.spend,
    0
  );
  const estimatedRevenue =
    optimization_result.expected_forecast.estimated_revenue;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-noto-bengali">
          {t("advanced_visualizations")}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-noto-bengali">
              {t("pareto_optimal")}
            </CardTitle>
            <CardDescription className="font-noto-bengali">
              {t("pareto_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationDonutChart allocations={optimizedAllocations} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-noto-bengali">
              {t("saturation_curve")}
            </CardTitle>
            <CardDescription className="font-noto-bengali">
              {t("saturation_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SaturationCurveChart
              maxSpend={totalSpend}
              estimatedRevenue={estimatedRevenue}
            />
          </CardContent>
        </Card>
      </div>

      <ExecutiveReport simulationData={data} />
    </div>
  );
}
