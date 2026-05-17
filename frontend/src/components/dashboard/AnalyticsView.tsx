"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { ExecutiveReport } from "@/components/ExecutiveReport";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardSimulationData } from "@/lib/dashboard";
import type { ChannelAllocation } from "@/lib/types/contracts";
import {
  generateMockROIData,
  type ROIDataPoint,
} from "@/components/charts/ROITrackingChart";
import {
  generateMockMarkovData,
  type MarkovFunnelData,
} from "@/components/charts/MarkovFunnelChart";

// ── Dynamic imports (SSR-safe, lazy-loaded) ──────────────────────────────────

const AllocationDonutChart = dynamic(
  () =>
    import("@/components/charts/AllocationDonutChart").then(
      (mod) => mod.AllocationDonutChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3">
        <Skeleton className="h-[250px] w-full rounded-xl" />
        <Skeleton className="h-4 w-1/3" />
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
      <div className="flex h-[300px] flex-col items-center justify-center gap-3">
        <Skeleton className="h-[250px] w-full rounded-xl" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    ),
  }
);

const ROITrackingChart = dynamic(
  () =>
    import("@/components/charts/ROITrackingChart").then(
      (mod) => mod.ROITrackingChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] flex-col items-center justify-center gap-3">
        <Skeleton className="h-[270px] w-full rounded-xl" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    ),
  }
);

const MarkovFunnelChart = dynamic(
  () =>
    import("@/components/charts/MarkovFunnelChart").then(
      (mod) => mod.MarkovFunnelChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] flex-col items-center justify-center gap-3">
        <Skeleton className="h-[290px] w-full rounded-xl" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    ),
  }
);

// ── Component ─────────────────────────────────────────────────────────────────

type AnalyticsViewProps = {
  data: DashboardSimulationData;
};

export function AnalyticsView({ data }: AnalyticsViewProps) {
  const t = useTranslations("Dashboard");
  const { optimization_result, simulation_scenario } = data;
  const optimizedAllocations = optimization_result.optimized_allocations;

  const totalSpend = optimizedAllocations.reduce(
    (acc: number, curr: ChannelAllocation) => acc + curr.spend,
    0
  );
  const estimatedRevenue =
    optimization_result.expected_forecast.estimated_revenue;

  // ── Derive channel spend map for ROI + Markov mock generators ───────────
  const channelSpendMap = useMemo<Record<string, number>>(
    () =>
      Object.fromEntries(
        optimizedAllocations.map((a) => [a.channel_name, a.spend])
      ),
    [optimizedAllocations]
  );

  const channelNames = useMemo(
    () => optimizedAllocations.map((a) => a.channel_name),
    [optimizedAllocations]
  );

  // ── ROI data: use real backend data when available, else derive mock ─────
  const roiDataPoints = useMemo<ROIDataPoint[]>(() => {
    return generateMockROIData(channelSpendMap);
  }, [channelSpendMap]);

  // ── Markov data: use real backend data when available, else derive mock ──
  const markovData = useMemo<MarkovFunnelData>(() => {
    return generateMockMarkovData(channelNames);
  }, [channelNames]);

  // Derive a single iROAS figure for the KPI card
  const latestIROAS =
    roiDataPoints.length > 0
      ? roiDataPoints[roiDataPoints.length - 1].iroas
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-noto-bengali">
          {t("advanced_visualizations")}
        </h1>
      </div>

      {/* ── Row 1: Allocation + Saturation (existing) ───────────────────── */}
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

      {/* ── Row 2: ROI / iROAS tracking (NEW — Day 3) ───────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="font-noto-bengali">
                {t("roi_tracking_title")}
              </CardTitle>
              <CardDescription className="font-noto-bengali">
                {t("roi_tracking_desc")}
              </CardDescription>
            </div>
            {/* iROAS KPI badge */}
            <div className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-center">
              <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide">
                iROAS
              </p>
              <p className="text-2xl font-bold text-indigo-700">
                {latestIROAS.toFixed(2)}×
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ROITrackingChart dataPoints={roiDataPoints} breakEvenThreshold={1.0} />
        </CardContent>
      </Card>

      {/* ── Row 3: Markov Funnel Journey (NEW — Day 3) ──────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="font-noto-bengali">
            {t("markov_funnel_title")}
          </CardTitle>
          <CardDescription className="font-noto-bengali">
            {t("markov_funnel_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <MarkovFunnelChart data={markovData} height={340} />
        </CardContent>
      </Card>

      {/* ── Executive Report ─────────────────────────────────────────────── */}
      <ExecutiveReport simulationData={data} />
    </div>
  );
}
