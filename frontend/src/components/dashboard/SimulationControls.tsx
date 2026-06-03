"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";

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
    color: "bg-[#0A0A0A]",
    trackColor: "text-[#0A0A0A]",
    icon: "📘",
  },
  {
    key: "Google" as const,
    label: "Google",
    color: "bg-[#FACC15]",
    trackColor: "text-[#0A0A0A]",
    icon: "🔍",
  },
  {
    key: "TikTok" as const,
    label: "TikTok",
    color: "bg-[#EF4444]",
    trackColor: "text-[#EF4444]",
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
  const t = useTranslations("Simulation");
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
      className="relative overflow-hidden border border-[#E5E5E5] bg-white shadow-sm rounded-2xl"
    >
      {/* Top accent bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#FACC15]" />

      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FACC15]">
            <FlaskConical className="size-4 text-[#0A0A0A]" />
          </div>
          <CardTitle className="font-noto-bengali text-lg text-[#0A0A0A] font-bold">
            {t("title")}
          </CardTitle>
        </div>
        <CardDescription className="font-noto-bengali text-[#6B6B6B]">
          {t("description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Slider controls ──────────────────────────────────────────── */}
        {CHANNELS.map(({ key, label, color, icon }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor={`slider-${key}`}
                className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tabular-nums text-[#0A0A0A]">
                  {formatCurrency(budgets[key])}
                </span>
                <span className="rounded-full bg-[#F5F5F0] border border-[#E5E5E5] px-2 py-0.5 text-xs font-semibold text-[#6B6B6B] tabular-nums">
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
        <div className={`flex items-center justify-between rounded-xl border bg-[#F5F5F0] px-4 py-3 transition-all duration-300 ${
          isPulsing ? "border-[#FACC15] shadow-sm bg-[#FACC15]/5" : "border-[#E5E5E5]"
        }`}>
          <span className="text-sm font-medium text-[#6B6B6B]">
            {t("total_allocated")}
          </span>
          <span className="text-lg font-black tabular-nums text-[#0A0A0A]">
            {formatCurrency(totalAllocated)}
          </span>
        </div>

        {/* ── Run button ───────────────────────────────────────────────── */}
        <Button
          id="run-simulation-btn"
          onClick={handleRun}
          disabled={isLoading || totalAllocated === 0}
          className="w-full bg-[#0A0A0A] text-white shadow-sm transition-all hover:bg-[#333] active:scale-[0.98] disabled:opacity-60 rounded-full font-bold text-sm uppercase tracking-wide h-11"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("running")}
            </>
          ) : (
            <>
              <FlaskConical className="mr-2 size-4" />
              {t("run_button")}
            </>
          )}
        </Button>
        <p className="text-center text-xs text-[#6B6B6B] mt-1">
          Sliders update the preview curve instantly. This button runs a full Bayesian re-optimization on the server.
        </p>
      </CardContent>
    </Card>
  );
}
