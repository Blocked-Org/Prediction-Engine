/**
 * @file ReportingCharts.tsx
 * @description Client-side shell for dynamically importing heavy chart libraries.
 * Used by the ISR reporting page so that chart JS bundles don't block
 * the server-rendered HTML delivery.
 */
"use client"

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useTranslations } from 'next-intl'

const AllocationDonutChart = dynamic(
  () => import('@/components/charts/AllocationDonutChart').then((mod) => mod.AllocationDonutChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground animate-pulse">Loading chart...</div>
  }
)

const SaturationCurveChart = dynamic(
  () => import('@/components/charts/SaturationCurveChart').then((mod) => mod.SaturationCurveChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground animate-pulse">Loading chart...</div>
  }
)

interface ReportingChartsProps {
  allocations: { channel_name: string; spend: number }[]
  totalSpend: number
  estimatedRevenue: number
}

export function ReportingCharts({ allocations, totalSpend, estimatedRevenue }: ReportingChartsProps) {
  const t = useTranslations('Dashboard')

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-noto-bengali">{t('pareto_optimal')}</CardTitle>
          <CardDescription className="font-noto-bengali">{t('pareto_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AllocationDonutChart allocations={allocations} />
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
  )
}
