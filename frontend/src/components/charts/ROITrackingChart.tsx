"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineSeries,
  AreaSeries,
} from "lightweight-charts";

export interface ROIDataPoint {
  /** ISO date string, e.g. "2024-01-15" */
  date: string;
  /** Incremental Return on Ad Spend for that period */
  iroas: number;
  /** Lower bound of the 90 % confidence interval */
  lower: number;
  /** Upper bound of the 90 % confidence interval */
  upper: number;
}

interface ROITrackingChartProps {
  /** Historical / projected iROAS time-series from the simulation engine */
  dataPoints: ROIDataPoint[];
  /** Baseline iROAS threshold to render as a reference line (default: 1.0) */
  breakEvenThreshold?: number;
}

/**
 * ROITrackingChart — Lightweight Charts (Canvas) component.
 *
 * Renders three series:
 *   1. A shaded AreaSeries for the 90 % credible interval (uncertainty band)
 *   2. A solid LineSeries for the iROAS point estimate
 *   3. A dashed LineSeries for the break-even threshold
 *
 * Re-renders whenever `dataPoints` or `breakEvenThreshold` changes, satisfying
 * the Day-3 requirement: "charts react to state changes".
 */
export function ROITrackingChart({
  dataPoints,
  breakEvenThreshold = 1.0,
}: ROITrackingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || dataPoints.length === 0) return;

    const container = containerRef.current;

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };

    // ── Chart instance ──────────────────────────────────────────────────────
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748b", // slate-500
        fontFamily:
          "var(--font-noto-bengali), ui-sans-serif, system-ui, sans-serif",
        fontSize: 12,
      },
      width: container.clientWidth,
      height: 320,
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.15)" },
        horzLines: { color: "rgba(148, 163, 184, 0.15)" },
      },
      crosshair: {
        vertLine: { color: "rgba(99, 102, 241, 0.6)", width: 1 },
        horzLine: { color: "rgba(99, 102, 241, 0.6)", width: 1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
    });

    // ── 1. Confidence interval band (upper) ─────────────────────────────────
    const upperBand = chart.addSeries(AreaSeries, {
      lineColor: "transparent",
      topColor: "rgba(99, 102, 241, 0.18)",
      bottomColor: "rgba(99, 102, 241, 0.04)",
      lineWidth: 0,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    // ── 2. Confidence interval band (lower — solid baseline for the fill) ───
    const lowerBand = chart.addSeries(AreaSeries, {
      lineColor: "transparent",
      topColor: "rgba(99, 102, 241, 0.0)",
      bottomColor: "rgba(99, 102, 241, 0.0)",
      lineWidth: 0,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    // ── 3. iROAS point estimate ─────────────────────────────────────────────
    const iRoasLine = chart.addSeries(LineSeries, {
      color: "#6366f1", // indigo-500
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: "#ffffff",
      crosshairMarkerBackgroundColor: "#6366f1",
      lastValueVisible: true,
      priceLineVisible: false,
      title: "iROAS",
    });

    // ── 4. Break-even threshold (dashed reference) ──────────────────────────
    const thresholdLine = chart.addSeries(LineSeries, {
      color: "#f59e0b", // amber-400
      lineWidth: 1,
      lineStyle: 2, // Dashed
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      title: `Break-even (${breakEvenThreshold.toFixed(1)}×)`,
    });

    // ── Populate series ─────────────────────────────────────────────────────
    const sorted = [...dataPoints].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    upperBand.setData(
      sorted.map((p) => ({ time: p.date, value: p.upper }))
    );
    lowerBand.setData(
      sorted.map((p) => ({ time: p.date, value: p.lower }))
    );
    iRoasLine.setData(
      sorted.map((p) => ({ time: p.date, value: p.iroas }))
    );
    thresholdLine.setData(
      sorted.map((p) => ({ time: p.date, value: breakEvenThreshold }))
    );

    chart.timeScale().fitContent();

    // ── Resize observer ─────────────────────────────────────────────────────
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [dataPoints, breakEvenThreshold]);

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="w-full" />
      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full bg-indigo-500" />
          iROAS (point estimate)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-sm bg-indigo-200/60" />
          90% credible interval
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full bg-amber-400" style={{ borderTop: "2px dashed #f59e0b", height: 0, marginTop: 1 }} />
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-amber-400" />
          Break-even
        </span>
      </div>
    </div>
  );
}

// ── Mock-data generator (used when real backend data is not yet available) ──
export function generateMockROIData(
  channelSpend: Record<string, number>,
  startDate = "2024-01-01",
  weeks = 26
): ROIDataPoint[] {
  const totalSpend = Object.values(channelSpend).reduce((a, b) => a + b, 0);
  // Seed an iROAS trajectory that rises then levels off (diminishing returns)
  const baseIROAS = Math.min(2.5, Math.max(1.1, totalSpend / 8000));

  const points: ROIDataPoint[] = [];
  const start = new Date(startDate);

  for (let w = 0; w < weeks; w++) {
    const d = new Date(start);
    d.setDate(d.getDate() + w * 7);
    const dateStr = d.toISOString().split("T")[0];

    // Simulate gradual warm-up + plateau
    const progress = w / (weeks - 1);
    const warmUp = 1 - Math.exp(-5 * progress);
    const iroas = baseIROAS * warmUp + 0.4 * (1 - warmUp);

    // Uncertainty shrinks as more data accumulates
    const uncertainty = 0.35 * (1 - 0.6 * progress);

    points.push({
      date: dateStr,
      iroas: parseFloat(iroas.toFixed(3)),
      lower: parseFloat(Math.max(0, iroas - uncertainty).toFixed(3)),
      upper: parseFloat((iroas + uncertainty).toFixed(3)),
    });
  }

  return points;
}
