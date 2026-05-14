/**
 * @file page.tsx
 * @description Analytics dashboard page displaying complex visualisations using 
 * dynamically imported Chart.js and Lightweight Charts components to avoid SSR errors.
 */
"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import dynamic from 'next/dynamic'
import { SimulationScenario, OptimizationResult, ChannelAllocation } from '@/lib/types/contracts'
import { ExecutiveReport } from '@/components/ExecutiveReport'

type SimulationData = {
  simulation_scenario: SimulationScenario;
  optimization_result: OptimizationResult;
}

// Dynamically import charts with SSR disabled
const AllocationDonutChart = dynamic(
  () => import('@/components/charts/AllocationDonutChart').then((mod) => mod.AllocationDonutChart),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center">Loading chart...</div> }
)

const SaturationCurveChart = dynamic(
  () => import('@/components/charts/SaturationCurveChart').then((mod) => mod.SaturationCurveChart),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center">Loading chart...</div> }
)

export default function AnalyticsPage() {
  const t = useTranslations('Dashboard');
  const [data, setData] = useState<SimulationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/forecast')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error("Failed to fetch mock API", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="flex h-full items-center justify-center font-noto-bengali">{t('loading_analytics')}</div>
  }

  if (!data) {
    return <div className="flex h-full items-center justify-center text-destructive font-noto-bengali">{t('load_failed')}</div>
  }

  const { optimization_result } = data
  const optimizedAllocations = optimization_result.optimized_allocations
  
  // Calculate total optimal spend
  const totalSpend = optimizedAllocations.reduce((acc: number, curr: ChannelAllocation) => acc + curr.spend, 0)
  const estimatedRevenue = optimization_result.expected_forecast.estimated_revenue

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight font-noto-bengali">{t('advanced_visualizations')}</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-noto-bengali">{t('pareto_optimal')}</CardTitle>
            <CardDescription className="font-noto-bengali">{t('pareto_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationDonutChart allocations={optimizedAllocations} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="font-noto-bengali">{t('saturation_curve')}</CardTitle>
            <CardDescription className="font-noto-bengali">{t('saturation_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <SaturationCurveChart maxSpend={totalSpend} estimatedRevenue={estimatedRevenue} />
          </CardContent>
        </Card>
      </div>

      <ExecutiveReport simulationData={data} />
    </div>
  )
}
