/**
 * @file ReportingCharts.tsx
 * @description Client-side shell for dynamically importing heavy chart libraries.
 * Used by the ISR reporting page so that chart JS bundles don't block
 * the server-rendered HTML delivery.
 */
"use client"

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslations } from 'next-intl'

const AllocationDonutChart = dynamic(
  () => import('@/components/charts/AllocationDonutChart').then((mod) => mod.AllocationDonutChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3">
        <Skeleton className="h-[250px] w-full rounded-xl bg-[#E5E5E5]" />
        <Skeleton className="h-4 w-1/3 bg-[#E5E5E5]" />
      </div>
    )
  }
)

const SaturationCurveChart = dynamic(
  () => import('@/components/charts/SaturationCurveChart').then((mod) => mod.SaturationCurveChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3">
        <Skeleton className="h-[250px] w-full rounded-xl bg-[#E5E5E5]" />
        <Skeleton className="h-4 w-1/3 bg-[#E5E5E5]" />
      </div>
    )
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
      <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
        <CardHeader>
          <CardTitle className="font-noto-bengali text-[#0A0A0A] font-bold uppercase tracking-wider text-sm">{t('pareto_optimal')}</CardTitle>
          <CardDescription className="font-noto-bengali text-[#6B6B6B]">{t('pareto_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AllocationDonutChart allocations={allocations} />
        </CardContent>
      </Card>

      <Card className="border border-[#E5E5E5] bg-white shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
        <CardHeader>
          <CardTitle className="font-noto-bengali text-[#0A0A0A] font-bold uppercase tracking-wider text-sm">{t('saturation_curve')}</CardTitle>
          <CardDescription className="font-noto-bengali text-[#6B6B6B]">{t('saturation_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SaturationCurveChart maxSpend={totalSpend} estimatedRevenue={estimatedRevenue} />
        </CardContent>
      </Card>
    </div>
  )
}
