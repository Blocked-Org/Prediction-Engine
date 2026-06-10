"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, FlaskConical, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const [initialBudgets, setInitialBudgets] = useState<ChannelBudgets>({
    Meta: Math.round(totalSpend * 0.4),
    Google: Math.round(totalSpend * 0.35),
    TikTok: Math.round(totalSpend * 0.25),
  });

  const totalAllocated = budgets.Meta + budgets.Google + budgets.TikTok;

  // Reset references when totalSpend changes
  useEffect(() => {
    const base = {
      Meta: Math.round(totalSpend * 0.4),
      Google: Math.round(totalSpend * 0.35),
      TikTok: Math.round(totalSpend * 0.25),
    };
    setInitialBudgets(base);
    setBudgets(base);
  }, [totalSpend]);

  // Pre-calculated target states for the quick action buttons
  const presets = {
    profit: {
      Meta: Math.round(totalSpend * 0.65),
      Google: Math.round(totalSpend * 0.20),
      TikTok: Math.round(totalSpend * 0.15),
    },
    traffic: {
      Meta: Math.round(totalSpend * 0.25),
      Google: Math.round(totalSpend * 0.45),
      TikTok: Math.round(totalSpend * 0.30),
    },
    risk: {
      Meta: Math.round(totalSpend * 0.35),
      Google: Math.round(totalSpend * 0.45),
      TikTok: Math.round(totalSpend * 0.20),
    },
  };

  const handleApplyPreset = (type: "profit" | "traffic" | "risk") => {
    setBudgets(presets[type]);
  };

  const isPresetActive = (type: "profit" | "traffic" | "risk") => {
    const p = presets[type];
    return (
      Math.abs(budgets.Meta - p.Meta) < 100 &&
      Math.abs(budgets.Google - p.Google) < 100 &&
      Math.abs(budgets.TikTok - p.TikTok) < 100
    );
  };

  // CPC and CPA constants computed from the baseline metrics
  const channelMetrics = {
    Meta: { cpc: 4.0, cpa: 62.5 },
    Google: { cpc: 4.0, cpa: 61.5 },
    TikTok: { cpc: 4.0, cpa: 66.7 },
  };

  const getDeltaDisplay = (channel: keyof ChannelBudgets) => {
    const deltaSpend = budgets[channel] - initialBudgets[channel];
    if (deltaSpend === 0) return null;

    const metrics = channelMetrics[channel];
    const deltaClicks = Math.round(deltaSpend / metrics.cpc);
    const deltaConversions = Math.round(deltaSpend / metrics.cpa);

    const clickText = deltaClicks >= 0 ? `+${deltaClicks}` : `${deltaClicks}`;
    const convText = deltaConversions >= 0 ? `+${deltaConversions}` : `${deltaConversions}`;
    const isPositive = deltaSpend >= 0;

    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all duration-300 ${
        isPositive 
          ? "bg-green-50 text-green-700 border-green-200" 
          : "bg-red-50 text-red-700 border-red-200"
      }`}>
        {clickText} clicks, {convText} expected conversions
      </span>
    );
  };

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
        
        {/* ── Quick-action Preset Buttons ───────────────────────────────── */}
        <div className="space-y-2 pb-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">
              Goal-Oriented Presets
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBudgets(initialBudgets)}
              className="h-6 px-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </div>
          <TooltipProvider>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div whileHover={isLoading ? {} : { scale: 1.02 }} whileTap={isLoading ? {} : { scale: 0.98 }}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => handleApplyPreset("profit")}
                      className={`w-full text-xs font-bold uppercase tracking-wider h-9 rounded-full transition-all duration-300 ${
                        isPresetActive("profit")
                          ? "bg-[#0A0A0A] text-white border-[#0A0A0A] shadow-sm"
                          : "bg-white text-[#0A0A0A] border-[#E5E5E5] hover:bg-[#F5F5F0]"
                      }`}
                    >
                      📈 Maximize Profit
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Prioritizes high-ROAS channels (Meta) over sheer volume.</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div whileHover={isLoading ? {} : { scale: 1.02 }} whileTap={isLoading ? {} : { scale: 0.98 }}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => handleApplyPreset("traffic")}
                      className={`w-full text-xs font-bold uppercase tracking-wider h-9 rounded-full transition-all duration-300 ${
                        isPresetActive("traffic")
                          ? "bg-[#0A0A0A] text-white border-[#0A0A0A] shadow-sm"
                          : "bg-white text-[#0A0A0A] border-[#E5E5E5] hover:bg-[#F5F5F0]"
                      }`}
                    >
                      ⚡ Maximize Traffic
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Allocates heavily to Search (Google) for high-intent clicks.</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div whileHover={isLoading ? {} : { scale: 1.02 }} whileTap={isLoading ? {} : { scale: 0.98 }}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => handleApplyPreset("risk")}
                      className={`w-full text-xs font-bold uppercase tracking-wider h-9 rounded-full transition-all duration-300 ${
                        isPresetActive("risk")
                          ? "bg-[#0A0A0A] text-white border-[#0A0A0A] shadow-sm"
                          : "bg-white text-[#0A0A0A] border-[#E5E5E5] hover:bg-[#F5F5F0]"
                      }`}
                    >
                      🛡️ Lowest Risk
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Balanced portfolio spreading budget to minimize variance.</span>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* ── Slider controls ──────────────────────────────────────────── */}
        {CHANNELS.map(({ key, label, color, icon }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label
                  htmlFor={`slider-${key}`}
                  className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]"
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </Label>
                {getDeltaDisplay(key)}
              </div>
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
        <motion.div whileHover={isLoading || totalAllocated === 0 ? {} : { scale: 1.02 }} whileTap={isLoading || totalAllocated === 0 ? {} : { scale: 0.98 }}>
          <Button
            id="run-simulation-btn"
            onClick={handleRun}
            disabled={isLoading || totalAllocated === 0}
            className="w-full bg-[#0A0A0A] text-white shadow-sm transition-all hover:bg-[#333] disabled:opacity-60 rounded-full font-bold text-sm uppercase tracking-wide h-11"
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
        </motion.div>
        <p className="text-center text-xs text-[#6B6B6B] mt-1">
          Sliders update the preview curve instantly. This button runs a full Bayesian re-optimization on the server.
        </p>
      </CardContent>
    </Card>
  );
}
