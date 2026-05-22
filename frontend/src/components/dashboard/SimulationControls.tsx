"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, FlaskConical } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChannelBudgets = {
  Meta: number;
  Google: number;
  TikTok: number;
};

type SimulationControlsProps = {
  /** Called when the user clicks "Run What-If Simulation" */
  onRunSimulation: (budgets: ChannelBudgets) => void;
  /** Called on every slider change for live preview (e.g. saturation curve). */
  onBudgetsChange?: (budgets: ChannelBudgets) => void;
  /** Whether a simulation is currently in progress */
  isLoading: boolean;
  /** Initial total spend to derive default slider max/values */
  totalSpend?: number;
};

// ── Channel metadata for rendering ────────────────────────────────────────────

const CHANNELS = [
  {
    key: "Meta" as const,
    label: "Meta",
    color: "bg-blue-500",
    trackColor: "text-blue-500",
    icon: "📘",
  },
  {
    key: "Google" as const,
    label: "Google",
    color: "bg-emerald-500",
    trackColor: "text-emerald-500",
    icon: "🔍",
  },
  {
    key: "TikTok" as const,
    label: "TikTok",
    color: "bg-pink-500",
    trackColor: "text-pink-500",
    icon: "🎵",
  },
] as const;

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `৳${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `৳${(value / 1_000).toFixed(1)}K`;
  return `৳${value.toFixed(0)}`;
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(0)}%`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SimulationControls({
  onRunSimulation,
  onBudgetsChange,
  isLoading,
  totalSpend = 15000,
}: SimulationControlsProps) {
  const maxPerChannel = Math.max(totalSpend * 2, 50000);

  const [budgets, setBudgets] = useState<ChannelBudgets>({
    Meta: Math.round(totalSpend * 0.4),
    Google: Math.round(totalSpend * 0.35),
    TikTok: Math.round(totalSpend * 0.25),
  });

  const totalAllocated = budgets.Meta + budgets.Google + budgets.TikTok;

  const handleSliderChange = useCallback(
    (channel: keyof ChannelBudgets, values: number[]) => {
      setBudgets((prev) => ({ ...prev, [channel]: values[0] }));
    },
    []
  );

  // Propagate budget changes to parent *after* the render commits,
  // avoiding the "Cannot update a component while rendering" warning.
  useEffect(() => {
    onBudgetsChange?.(budgets);
  }, [budgets, onBudgetsChange]);

  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    setIsPulsing(true);
    const timer = setTimeout(() => setIsPulsing(false), 500);
    return () => clearTimeout(timer);
  }, [totalAllocated]);

  const handleRun = useCallback(() => {
    onRunSimulation(budgets);
  }, [budgets, onRunSimulation]);

  return (
    <Card
      id="simulation-controls"
      className="relative overflow-hidden border-dashed border-indigo-300/50"
    >
      {/* Decorative gradient accent */}
      <div 
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-pink-500"
        style={{
          backgroundSize: '200% 100%',
          animation: 'shimmer 4s linear infinite',
        }}
      />

      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-indigo-500" />
          <CardTitle className="font-noto-bengali text-lg">
            What-If Simulation
          </CardTitle>
        </div>
        <CardDescription className="font-noto-bengali">
          Adjust budget allocations per channel and run a scenario simulation.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Slider controls ──────────────────────────────────────────── */}
        {CHANNELS.map(({ key, label, color, icon }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor={`slider-${key}`}
                className="flex items-center gap-2 text-sm font-medium"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(budgets[key])}
                </span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">
                  {formatPercent(budgets[key], totalAllocated)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
              />
              <Slider
                id={`slider-${key}`}
                min={0}
                max={maxPerChannel}
                step={100}
                value={[budgets[key]]}
                onValueChange={(v) => handleSliderChange(key, v)}
                disabled={isLoading}
                className="flex-1"
              />
            </div>
          </div>
        ))}

        {/* ── Total allocation summary ─────────────────────────────────── */}
        <div className={`flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3 transition-all duration-300 ${
          isPulsing ? "animate-pulse border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] bg-indigo-500/5" : ""
        }`}>
          <span className="text-sm font-medium text-muted-foreground">
            Total Allocated
          </span>
          <span className="text-lg font-bold tabular-nums">
            {formatCurrency(totalAllocated)}
          </span>
        </div>

        {/* ── Run button ───────────────────────────────────────────────── */}
        <Button
          id="run-simulation-btn"
          onClick={handleRun}
          disabled={isLoading || totalAllocated === 0}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-200/50 active:scale-[0.98] disabled:opacity-60"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Running Simulation…
            </>
          ) : (
            <>
              <FlaskConical className="mr-2 size-4" />
              Run What-If Simulation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
