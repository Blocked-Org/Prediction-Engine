"use client"

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AllocationDonutChartProps {
  allocations: { channel_name: string; spend: number }[];
}

export function AllocationDonutChart({ allocations }: AllocationDonutChartProps) {
  const data = {
    labels: allocations.map(a => a.channel_name.charAt(0).toUpperCase() + a.channel_name.slice(1)),
    datasets: [
      {
        label: 'Optimized Spend (৳)',
        data: allocations.map(a => a.spend),
        backgroundColor: [
          'rgba(10, 10, 10, 1)',      // black
          'rgba(250, 204, 21, 1)',    // yellow
          'rgba(107, 107, 107, 1)',   // gray
          'rgba(229, 229, 229, 1)',   // light gray
          'rgba(245, 245, 240, 1)',   // off-white
        ],
        borderColor: [
          'rgba(255, 255, 255, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            family: 'var(--font-noto-bengali), ui-sans-serif, system-ui, sans-serif',
          }
        }
      },
      tooltip: {
        titleFont: {
          family: 'var(--font-noto-bengali), ui-sans-serif, system-ui, sans-serif',
        },
        bodyFont: {
          family: 'var(--font-noto-bengali), ui-sans-serif, system-ui, sans-serif',
        },
        callbacks: {
          label: function(context: TooltipItem<'doughnut'>) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat('bn-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(context.parsed);
            }
            return label;
          }
        }
      }
    },
  };

  return (
    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}
