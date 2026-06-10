"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

import { ExecutiveReport } from "@/components/ExecutiveReport";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
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
import { generateDemoROIData, generateDemoMarkovData } from "@/lib/demo-data";

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
        toast.success("Simulation Complete", { description: "Charts have been updated." });
      }
      setActiveTaskId(null);
      setSimulationError(null);
    },
    onError: (errMsg) => {
      setSimulationError(errMsg);
      toast.error("Simulation Error", { description: errMsg });
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
          toast.error("Request Failed", { description: errorText });
          return;
        }

        const data = await res.json();

        // Show soft warning if backend was unavailable (fallback mode)
        if (data._fallback) {
          setSimulationError(data._warning ?? "Using client-side estimate — backend is temporarily unavailable.");
        }

        if (data.task_id) {
          // Backend returned a Celery task — poll for result
          setActiveTaskId(data.task_id);
          toast.info("Simulation Running", { description: "Task dispatched to worker." });
        } else if (data.optimization_result || data.optimized_allocations) {
          // Synchronous result (or fallback) — merge immediately
          setSimulationData((prev) => ({
            ...prev,
            optimization_result: {
              ...prev.optimization_result,
              ...data,
            },
          }));
          if (data._fallback) {
             toast.warning("Fallback Mode", { description: "Using client-side estimate." });
          } else {
             toast.success("Simulation Complete", { description: "Charts updated immediately." });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        setSimulationError(msg);
        toast.error("Error", { description: msg });
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

  // ── Fetch ROI analytics (falls back to demo data if backend unreachable) ──
  useEffect(() => {
    if (!campaignId) {
      // No campaign yet — use demo data immediately
      setRoiDataPoints(generateDemoROIData());
      return;
    }

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
      .catch(() => {
        // Graceful fallback: use realistic demo data instead of showing error
        if (!cancelled) {
          console.warn("ROI backend unreachable — using demo data for display.");
          setRoiDataPoints(generateDemoROIData());
          setRoiError(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingROI(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, simulationData]);

  // ── Fetch Markov analytics (falls back to demo data if backend unreachable)
  useEffect(() => {
    if (!campaignId) {
      // No campaign yet — use demo data immediately
      setMarkovData(generateDemoMarkovData());
      return;
    }

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
      .catch(() => {
        // Graceful fallback: use realistic demo data instead of showing error
        if (!cancelled) {
          console.warn("Markov backend unreachable — using demo data for display.");
          setMarkovData(generateDemoMarkovData());
          setMarkovError(null);
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
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="text-xs text-[#6B6B6B] font-semibold uppercase tracking-wider">
          Dashboard &gt; Analytics
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight font-noto-bengali text-[#0A0A0A] uppercase">
            {t("advanced_visualizations")}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-2.5 py-0.5 text-xs font-bold text-white">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FACC15] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FACC15]"></span>
            </span>
            Live
          </span>
        </div>
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
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          simulationError.includes("client-side estimate") || simulationError.includes("temporarily unavailable")
            ? "border-[#FACC15] bg-[#FACC15]/10 text-[#0A0A0A]"
            : "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
        }`}>
          {simulationError.includes("client-side estimate") ? "⚡ " : ""}{simulationError}
        </div>
      )}

      {isSimulating && (
        <div className="rounded-xl border border-[#E5E5E5] bg-[#F5F5F0] px-4 py-3 text-sm text-[#0A0A0A]">
          ⏳ Simulation is running… Charts will update automatically when
          results are ready.
        </div>
      )}

      {/* ── Row 1: Allocation + Saturation (existing) ───────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-1 animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-noto-bengali">
                {t("pareto_optimal")}
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-help">
                    <Info size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Optimal budget distribution across channels simulated to maximize target outcomes.</span>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription className="font-noto-bengali">
              {t("pareto_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationDonutChart allocations={optimizedAllocations} />
          </CardContent>
        </Card>

        <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-1 animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-noto-bengali">
                {t("saturation_curve")}
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-help">
                    <Info size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Diminishing returns curve showing revenue projection relative to varying spend levels.</span>
                </TooltipContent>
              </Tooltip>
            </div>
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

      {/* Gradient Separator */}
      <div className="h-[1px] w-full bg-[#E5E5E5]" />

      {/* ── Row 2: ROI / iROAS tracking (NEW — Day 3) ───────────────────── */}
      <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-1 animate-fade-in">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-noto-bengali">
                  {t("roi_tracking_title")}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-help">
                      <Info size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="text-xs">Projected true profit per ad dollar and expected range over a 12-month period.</span>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription className="font-noto-bengali">
                {t("roi_tracking_desc")}
              </CardDescription>
            </div>
            {/* iROAS KPI badge */}
            <div className={`shrink-0 rounded-xl border px-4 py-2 text-center transition-all duration-300 ${
              latestIROAS >= 1.0 
                ? "bg-[#FACC15]/10 border-[#FACC15] text-[#0A0A0A]" 
                : "bg-[#EF4444]/10 border-[#EF4444] text-[#EF4444]"
            }`}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                True Profit per Ad Dollar
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-2xl font-black font-sans text-[#0A0A0A]">
                  {isLoadingROI ? "—" : `${latestIROAS.toFixed(2)}×`}
                </span>
                {!isLoadingROI && (
                  latestIROAS >= 1.0 
                    ? <TrendingUp className="h-5 w-5 text-[#0A0A0A]" />
                    : <TrendingDown className="h-5 w-5 text-[#EF4444]" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingROI ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-3">
              <Skeleton className="h-[270px] w-full rounded-xl" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ) : (
            <ROITrackingChart dataPoints={roiDataPoints} breakEvenThreshold={1.0} />
          )}
        </CardContent>
      </Card>

      {/* Gradient Separator */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* ── Row 3: Markov Funnel Journey (NEW — Day 3) ──────────────────── */}
      <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-1 animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="font-noto-bengali">
                {t("markov_funnel_title")}
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-help">
                    <Info size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Markov chain analysis modeling customer transitions and channel removal effects.</span>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <CardDescription className="font-noto-bengali">
            {t("markov_funnel_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoadingMarkov ? (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : (
            <MarkovFunnelChart data={markovData} height={240} />
          )}
        </CardContent>
      </Card>

      {/* ── Executive Report ─────────────────────────────────────────────── */}
      <ExecutiveReport simulationData={simulationData} />
    </div>
  );
}
