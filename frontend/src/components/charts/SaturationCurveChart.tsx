"use client"

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, LineSeries, AreaSeries, type ISeriesApi, type IChartApi } from 'lightweight-charts';

// ── Hill Function Utility ─────────────────────────────────────────────────────

/**
 * Computes the Hill (sigmoidal) saturation response.
 *
 * Formula:  response = maxRevenue × (spend^S) / (K^S + spend^S)
 *
 * @param spend     - Input spend value
 * @param S         - Shape parameter (steepness). Higher = sharper transition.
 * @param K         - Half-saturation constant (spend at which response = 50%).
 * @param maxRevenue - Asymptotic maximum revenue (ceiling of the S-curve).
 * @returns           Predicted revenue for the given spend level.
 */
function hillResponse(
  spend: number,
  S: number,
  K: number,
  maxRevenue: number
): number {
  if (spend <= 0) return 0;
  const spendPowS = Math.pow(spend, S);
  const kPowS = Math.pow(K, S);
  return maxRevenue * (spendPowS / (kPowS + spendPowS));
}

/**
 * Generates an array of { time, value } data points along the Hill curve.
 * Uses synthetic dates as the x-axis (lightweight-charts requires time).
 */
function generateHillCurveData(
  maxSpend: number,
  estimatedRevenue: number,
  S: number,
  K: number,
  pointsCount: number = 120
): { time: string; value: number; spend: number }[] {
  const maxRevenue = estimatedRevenue * 1.2; // Asymptotic ceiling
  const plotMax = maxSpend * 1.5; // Show saturation tail beyond current spend
  const startDate = new Date('2024-01-01').getTime();

  const data: { time: string; value: number; spend: number }[] = [];

  for (let i = 0; i <= pointsCount; i++) {
    const spend = (i / pointsCount) * plotMax;
    const revenue = hillResponse(spend, S, K, maxRevenue);
    const d = new Date(startDate + i * 86400000);
    data.push({
      time: d.toISOString().split('T')[0],
      value: revenue,
      spend: spend,
    });
  }

  return data;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SaturationCurveChartProps {
  maxSpend: number;
  estimatedRevenue: number;
  /**
   * When provided (e.g. from the SimulationControls slider total),
   * the chart instantly re-computes the Hill curve client-side
   * and draws a second "override" series showing the projected shift.
   */
  overrideSpend?: number;
  /**
   * Hill shape parameter from the backend. Controls steepness.
   * Falls back to 2.0 (moderate S-curve) if not provided.
   */
  hillS?: number;
  /**
   * Hill half-saturation constant from the backend.
   * Falls back to 40% of maxSpend if not provided.
   */
  hillK?: number;
}

export function SaturationCurveChart({
  maxSpend,
  estimatedRevenue,
  overrideSpend,
  hillS,
  hillK,
}: SaturationCurveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Refs to hold chart + series instances so we can update without re-creating
  const chartRef = useRef<IChartApi | null>(null);
  const greenSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const yellowSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const redSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const overrideSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const overrideMarkerRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Resolve Hill parameters with sensible fallbacks
  const S = hillS ?? 2.0;
  const K = hillK ?? maxSpend * 0.4;

  // ── Baseline curve (memoised — only changes when maxSpend / revenue / params change)
  const baselineData = useMemo(
    () => generateHillCurveData(maxSpend, estimatedRevenue, S, K),
    [maxSpend, estimatedRevenue, S, K]
  );

  // ── Override curve (re-computed on every slider drag — pure client-side)
  const overrideData = useMemo(() => {
    if (overrideSpend == null) return null;
    return generateHillCurveData(overrideSpend, estimatedRevenue, S, K);
  }, [overrideSpend, estimatedRevenue, S, K]);

  // ── Create the chart once ───────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth,
      });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#333',
        fontFamily:
          'var(--font-noto-bengali), ui-sans-serif, system-ui, sans-serif',
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.5)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.5)' },
      },
      timeScale: {
        timeVisible: false,
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    // ── 1. Green Series ("Safe to scale") ──────────────────────────────
    const greenSeries = chart.addSeries(LineSeries, {
      color: '#22C55E', // Green
      lineWidth: 3,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // ── 2. Yellow Series ("Approaching limits") ──────────────────────────
    const yellowSeries = chart.addSeries(LineSeries, {
      color: '#EAB308', // Yellow
      lineWidth: 3,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // ── 3. Red Series ("Diminishing returns - stop spending") ────────────
    const redSeries = chart.addSeries(LineSeries, {
      color: '#EF4444', // Red
      lineWidth: 3,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // ── Override area series (yellow translucent fill) ─────────────────
    const overrideSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(250, 204, 21, 0.35)',    // yellow @ 35%
      bottomColor: 'rgba(250, 204, 21, 0.05)', // yellow @ 5%
      lineColor: '#FACC15',                     // yellow
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // ── Override marker line (dashed-feel thin accent) ─────────────────
    const overrideMarker = chart.addSeries(LineSeries, {
      color: '#FACC15', // yellow
      lineWidth: 1,
      lineStyle: 2, // dashed
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    greenSeriesRef.current = greenSeries;
    yellowSeriesRef.current = yellowSeries;
    redSeriesRef.current = redSeries;
    overrideSeriesRef.current = overrideSeries;
    overrideMarkerRef.current = overrideMarker;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      greenSeriesRef.current = null;
      yellowSeriesRef.current = null;
      redSeriesRef.current = null;
      overrideSeriesRef.current = null;
      overrideMarkerRef.current = null;
    };
    // Chart is created once — data updates go through the refs below
     
  }, []);

  // ── Update baseline data when source props change ───────────────────────
  useEffect(() => {
    if (!baselineData || !greenSeriesRef.current) return;

    // Partition baselineData based on spend vs K
    // To ensure continuity, segments should overlap at boundary points
    const greenData = baselineData.filter((d: any) => d.spend <= K);
    const yellowData = baselineData.filter((d: any) => d.spend >= K && d.spend <= K * 1.5);
    const redData = baselineData.filter((d: any) => d.spend >= K * 1.5);

    greenSeriesRef.current.setData(greenData.map(d => ({ time: d.time, value: d.value })));
    yellowSeriesRef.current?.setData(yellowData.map(d => ({ time: d.time, value: d.value })));
    redSeriesRef.current?.setData(redData.map(d => ({ time: d.time, value: d.value })));
  }, [baselineData, K]);

  // ── Update override data in real-time (slider drag) ─────────────────────
  useEffect(() => {
    if (overrideData) {
      overrideSeriesRef.current?.setData(overrideData.map(d => ({ time: d.time, value: d.value })));
      overrideMarkerRef.current?.setData(overrideData.map(d => ({ time: d.time, value: d.value })));
    } else {
      // Clear override series when no override is active
      overrideSeriesRef.current?.setData([]);
      overrideMarkerRef.current?.setData([]);
    }
  }, [overrideData]);

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} style={{ width: '100%' }} />
      {/* Traffic Light Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#6B6B6B] font-noto-bengali">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#22C55E]" />
          Safe to scale (early/steep curve)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#EAB308]" />
          Approaching limits (middle curve)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#EF4444]" />
          Diminishing returns - stop spending (plateau)
        </span>
      </div>
    </div>
  );
}
