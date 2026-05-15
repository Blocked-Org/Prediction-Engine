"use client"

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';

interface SaturationCurveChartProps {
  maxSpend: number;
  estimatedRevenue: number;
}

export function SaturationCurveChart({ maxSpend, estimatedRevenue }: SaturationCurveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#333',
        fontFamily: 'var(--font-noto-bengali), ui-sans-serif, system-ui, sans-serif',
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

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#2563eb', // blue-600
      lineWidth: 3,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const dataPoints = [];
    const pointsCount = 100;
    
    // Mathematical simulation of diminishing returns S-Curve (Logistic function)
    for (let i = 0; i <= pointsCount; i++) {
      const spend = (i / pointsCount) * maxSpend * 1.5; // plot up to 150% of max spend to show saturation
      
      const L = estimatedRevenue * 1.2; // Max possible revenue limit
      const k = 0.00005; // Steepness
      const x0 = maxSpend * 0.4; // Midpoint
      
      let revenue = L / (1 + Math.exp(-k * (spend - x0)));
      
      // Zero out the start mathematically
      if(i === 0) revenue = 0;

      dataPoints.push({
        value: revenue,
      });
    }

    const startDate = new Date('2024-01-01').getTime();
    const formattedData = dataPoints.map((dp, index) => {
      const d = new Date(startDate + index * 86400000);
      return {
        time: d.toISOString().split('T')[0],
        value: dp.value
      };
    });

    lineSeries.setData(formattedData);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [maxSpend, estimatedRevenue]);

  return <div ref={chartContainerRef} style={{ width: '100%' }} />;
}
