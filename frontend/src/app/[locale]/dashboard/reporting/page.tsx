/**
 * @file page.tsx
 * @description ISR-enabled Reporting page for historical Pareto frontiers and cached analytics.
 * This page is a **server component** that fetches data at build/revalidation time,
 * then serves pre-rendered HTML from Vercel's Edge Network for sub-100ms responses.
 * Heavy chart libraries are dynamically imported client-side only.
 * 
 * Revalidation: Every 300 seconds (5 minutes).
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getTranslations } from 'next-intl/server'
import { ReportingCharts } from './ReportingCharts'

// ISR: revalidate every 5 minutes — pages are served from edge cache between revalidations
export const revalidate = 300

// Force dynamic params off — only known locales
export const dynamicParams = false

interface ForecastData {
  optimization_result: {
    optimized_allocations: { channel_name: string; spend: number }[]
    expected_forecast: {
      estimated_revenue: number
      uncertainty_bounds: { lower_bound: number; upper_bound: number; confidence_level: number }
    }
    recommendations: { recommendation_id: string; action: string; recommendation_reasoning: string }[]
  }
}

async function fetchForecastData(): Promise<ForecastData | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const res = await fetch(`${API_URL}/api/v1/forecast`, {
      method: 'GET',
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      // Fallback to the internal mock API route
      const fallback = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/forecast`, {
        next: { revalidate: 300 },
      })
      if (!fallback.ok) return null
      return fallback.json()
    }
    return res.json()
  } catch {
    // If backend is unreachable, try the internal mock
    try {
      const fallback = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/forecast`, {
        next: { revalidate: 300 },
      })
      if (!fallback.ok) return null
      return fallback.json()
    } catch {
      return null
    }
  }
}

export default async function ReportingPage() {
  const t = await getTranslations('Dashboard')
  const tReport = await getTranslations('Reporting')
  const data = await fetchForecastData()

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-destructive font-noto-bengali">
        {t('load_failed')}
      </div>
    )
  }

  const { optimization_result } = data
  const totalSpend = optimization_result.optimized_allocations.reduce((acc, curr) => acc + curr.spend, 0)
  const estimatedRevenue = optimization_result.expected_forecast.estimated_revenue
  const { lower_bound, upper_bound, confidence_level } = optimization_result.expected_forecast.uncertainty_bounds

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight font-noto-bengali">{tReport('title')}</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          {tReport('cached_badge')}
        </div>
      </div>

      {/* Summary KPI Cards — fully server-rendered, zero JS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">{t('estimated_revenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${estimatedRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(confidence_level * 100).toFixed(0)}% CI: ${lower_bound.toLocaleString()} – ${upper_bound.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">{t('total_spend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpend.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('across_channels', { count: optimization_result.optimized_allocations.length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">{tReport('roi')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSpend > 0 ? ((estimatedRevenue / totalSpend) * 100).toFixed(1) : '0'}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{tReport('roi_desc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown Table — server-rendered, no client JS */}
      <Card>
        <CardHeader>
          <CardTitle className="font-noto-bengali">{tReport('allocation_breakdown')}</CardTitle>
          <CardDescription className="font-noto-bengali">{tReport('allocation_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground font-noto-bengali">{t('channel')}</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground font-noto-bengali">{t('spend')}</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground font-noto-bengali">{tReport('share')}</th>
                </tr>
              </thead>
              <tbody>
                {optimization_result.optimized_allocations.map((alloc) => (
                  <tr key={alloc.channel_name} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="p-4 capitalize">{alloc.channel_name}</td>
                    <td className="p-4 text-right font-medium">
                      ${alloc.spend.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-muted-foreground">
                      {totalSpend > 0 ? ((alloc.spend / totalSpend) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Client-side charts — dynamically imported, zero impact on ISR HTML payload */}
      <ReportingCharts
        allocations={optimization_result.optimized_allocations}
        totalSpend={totalSpend}
        estimatedRevenue={estimatedRevenue}
      />

      {/* AI Recommendations — server-rendered */}
      {optimization_result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-noto-bengali">{t('recommendations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimization_result.recommendations.map((rec) => (
                <div key={rec.recommendation_id} className="rounded-md bg-muted p-3">
                  <span className="font-semibold text-primary">{rec.action}: </span>
                  {rec.recommendation_reasoning}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
