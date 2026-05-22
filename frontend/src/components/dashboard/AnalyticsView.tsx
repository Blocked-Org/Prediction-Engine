"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";

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
import type {
  ROIAnalyticsResponse,
  MarkovAnalyticsResponse,
} from "@/lib/types/contracts";
import type { ROIDataPoint } from "@/components/charts/ROITrackingChart";
import type { MarkovFunnelData } from "@/components/charts/MarkovFunnelChart";
import {
  SimulationControls,
  type ChannelBudgets,
} from "@/components/dashboard/SimulationControls";
import { useTaskPoller, type TaskState } from "@/hooks/useTaskPoller";

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

export function AnalyticsView({ data: initialData }: AnalyticsViewProps) {
  const t = useTranslations("Dashboard");
  const { userId } = useAuth();

  // ── Lifted simulation data state (can be updated by what-if runs) ───────
  const [simulationData, setSimulationData] =
    useState<DashboardSimulationData>(initialData);

  // ── Task poller state for what-if simulation ────────────────────────────
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const { status: taskStatus } = useTaskPoller(activeTaskId, {
    onSuccess: (result) => {
      // Merge the what-if result back into simulation data.
      // The backend returns optimized_allocations / forecast — overlay them.
      if (result && typeof result === "object") {
        setSimulationData((prev) => ({
          ...prev,
          optimization_result: {
            ...prev.optimization_result,
            ...(result as Record<string, unknown>),
          },
        }));
      }
      setActiveTaskId(null);
      setSimulationError(null);
    },
    onError: (errMsg) => {
      setSimulationError(errMsg);
      setActiveTaskId(null);
    },
  });

  const isSimulating =
    taskStatus === "PENDING" || taskStatus === "PROCESSING";

  // ── Live slider budgets for instant chart preview ───────────────────────
  const [liveBudgets, setLiveBudgets] = useState<ChannelBudgets | null>(null);

  const handleBudgetsChange = useCallback((budgets: ChannelBudgets) => {
    setLiveBudgets(budgets);
  }, []);

  // Derive override spend total from live slider values
  const liveOverrideSpend = liveBudgets
    ? liveBudgets.Meta + liveBudgets.Google + liveBudgets.TikTok
    : undefined;

  // ── Kick off a what-if simulation ───────────────────────────────────────
  const handleRunSimulation = useCallback(
    async (budgets: ChannelBudgets) => {
      setSimulationError(null);

      const payload = {
        clerk_user_id: userId ?? "",
        endogenous: {
          Impressions:
            simulationData.optimization_result.optimized_allocations.reduce(
              (sum: number, a: ChannelAllocation) =>
                sum + (a.impressions ?? 0),
              0
            ),
          Clicks:
            simulationData.optimization_result.optimized_allocations.reduce(
              (sum: number, a: ChannelAllocation) => sum + (a.clicks ?? 0),
              0
            ),
          Spent: budgets.Meta + budgets.Google + budgets.TikTok,
        },
        transactional: {
          Total_Conversion:
            simulationData.optimization_result.optimized_allocations.reduce(
              (sum: number, a: ChannelAllocation) =>
                sum + (a.conversions ?? 0),
              0
            ),
        },
        audience: {
          age: "25-34",
          gender: "M",
          interest: "Tech",
        },
        // Pass budget breakdown so the backend can decompose per-channel
        budget_overrides: {
          Meta: budgets.Meta,
          Google: budgets.Google,
          TikTok: budgets.TikTok,
        },
      };

      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          setSimulationError(`Simulation request failed: ${errorText}`);
          return;
        }

        const data = await res.json();

        if (data.task_id) {
          // Backend returned a Celery task — poll for result
          setActiveTaskId(data.task_id);
        } else if (data.optimization_result || data.optimized_allocations) {
          // Synchronous result — merge immediately
          setSimulationData((prev) => ({
            ...prev,
            optimization_result: {
              ...prev.optimization_result,
              ...data,
            },
          }));
        }
      } catch (err) {
        setSimulationError(
          err instanceof Error ? err.message : "Network error"
        );
      }
    },
    [userId, simulationData]
  );

  // ── Derived values from (possibly updated) simulation data ──────────────
  const { optimization_result } = simulationData;
  const optimizedAllocations = optimization_result.optimized_allocations;

  const totalSpend = optimizedAllocations.reduce(
    (acc: number, curr: ChannelAllocation) => acc + curr.spend,
    0
  );
  const estimatedRevenue =
    optimization_result.expected_forecast.estimated_revenue;

  // ── Campaign ID for analytics API calls ─────────────────────────────────
  const campaignId =
    simulationData.simulation_scenario?.campaign_input?.campaign_id ?? null;

  // ── ROI data: fetched from backend ──────────────────────────────────────
  const [roiDataPoints, setRoiDataPoints] = useState<ROIDataPoint[]>([]);
  const [isLoadingROI, setIsLoadingROI] = useState(false);
  const [roiError, setRoiError] = useState<string | null>(null);

  // ── Markov data: fetched from backend ───────────────────────────────────
  const [markovData, setMarkovData] = useState<MarkovFunnelData>({
    nodes: [],
    edges: [],
  });
  const [isLoadingMarkov, setIsLoadingMarkov] = useState(false);
  const [markovError, setMarkovError] = useState<string | null>(null);

  // ── Fetch ROI analytics ─────────────────────────────────────────────────
  useEffect(() => {
    if (!campaignId) return;

    let cancelled = false;
    setIsLoadingROI(true);
    setRoiError(null);

    fetch(`/api/analytics/roi/${encodeURIComponent(campaignId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ROIAnalyticsResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          setRoiDataPoints(data.data_points);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRoiError(err instanceof Error ? err.message : "Failed to load ROI data");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingROI(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, simulationData]);

  // ── Fetch Markov analytics ──────────────────────────────────────────────
  useEffect(() => {
    if (!campaignId) return;

    let cancelled = false;
    setIsLoadingMarkov(true);
    setMarkovError(null);

    fetch(`/api/analytics/markov/${encodeURIComponent(campaignId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MarkovAnalyticsResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          setMarkovData({ nodes: data.nodes, edges: data.edges });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMarkovError(err instanceof Error ? err.message : "Failed to load Markov data");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMarkov(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, simulationData]);

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

      {/* ── Simulation Controls (What-If Sandbox) ─────────────────────── */}
      <SimulationControls
        onRunSimulation={handleRunSimulation}
        onBudgetsChange={handleBudgetsChange}
        isLoading={isSimulating}
        totalSpend={totalSpend}
      />

      {/* ── Simulation status feedback ────────────────────────────────── */}
      {simulationError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {simulationError}
        </div>
      )}

      {isSimulating && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          ⏳ Simulation is running… Charts will update automatically when
          results are ready.
        </div>
      )}

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
              overrideSpend={liveOverrideSpend}
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
                {isLoadingROI ? "—" : `${latestIROAS.toFixed(2)}×`}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingROI ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-3">
              <Skeleton className="h-[270px] w-full rounded-xl" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ) : roiError ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              Failed to load ROI data. Please try again.
            </div>
          ) : (
            <ROITrackingChart dataPoints={roiDataPoints} breakEvenThreshold={1.0} />
          )}
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
          {isLoadingMarkov ? (
            <div className="flex h-[340px] flex-col items-center justify-center gap-3">
              <Skeleton className="h-[290px] w-full rounded-xl" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : markovError ? (
            <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
              Failed to load Markov data. Please try again.
            </div>
          ) : (
            <MarkovFunnelChart data={markovData} height={340} />
          )}
        </CardContent>
      </Card>

      {/* ── Executive Report ─────────────────────────────────────────────── */}
      <ExecutiveReport simulationData={simulationData} />
    </div>
  );
}
