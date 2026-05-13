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
        label: 'Optimized Spend ($)',
        data: allocations.map(a => a.spend),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // blue-500
          'rgba(16, 185, 129, 0.8)', // emerald-500
          'rgba(245, 158, 11, 0.8)', // amber-500
          'rgba(239, 68, 68, 0.8)',  // red-500
          'rgba(139, 92, 246, 0.8)', // violet-500
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
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'doughnut'>) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
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
