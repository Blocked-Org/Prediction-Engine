/**
 * @file page.tsx
 * @description Main analytics dashboard view displaying high-level KPIs, 
 * AI-driven recommendations, and raw transactional logs via DataTable.
 */
"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/DataTable"
import { ColumnDef } from "@tanstack/react-table"

type Allocation = {
  channel_name: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
}

type Recommendation = {
  recommendation_id: string
  action: string
  recommendation_reasoning: string
}

type OptimizedAllocation = {
  channel_name: string
  spend: number
}

type SimulationData = {
  simulation_scenario: {
    campaign_input: {
      allocations: Allocation[]
    }
  }
  optimization_result: {
    expected_forecast: {
      estimated_revenue: number
    }
    optimized_allocations: OptimizedAllocation[]
    recommendations: Recommendation[]
  }
}

/**
 * Main dashboard page component.
 * Responsible for fetching mock API data and rendering the analytics interface.
 * 
 * @returns {JSX.Element} The rendered dashboard layout.
 */
export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const columns: ColumnDef<Allocation>[] = [
    {
      accessorKey: "channel_name",
      header: t("channel"),
      cell: ({ row }) => <div className="capitalize">{row.getValue("channel_name")}</div>
    },
    {
      accessorKey: "spend",
      header: t("spend"),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("spend"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount)
        return <div className="font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "impressions",
      header: t("impressions"),
      cell: ({ row }) => row.getValue("impressions")?.toLocaleString()
    },
    {
      accessorKey: "clicks",
      header: t("clicks"),
      cell: ({ row }) => row.getValue("clicks")?.toLocaleString()
    },
    {
      accessorKey: "conversions",
      header: t("conversions"),
      cell: ({ row }) => row.getValue("conversions")?.toLocaleString()
    },
    {
      accessorKey: "ctr",
      header: t("ctr"),
      cell: ({ row }) => {
        const ctr = parseFloat(row.getValue("ctr"))
        return <div>{(ctr * 100).toFixed(1)}%</div>
      }
    },
    {
      accessorKey: "cpc",
      header: t("cpc"),
      cell: ({ row }) => {
        const cpc = parseFloat(row.getValue("cpc"))
        return <div>${cpc.toFixed(2)}</div>
      }
    },
  ]
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
    return <div className="flex h-full items-center justify-center font-noto-bengali">{t('loading_simulation')}</div>
  }

  if (!data) {
    return <div className="flex h-full items-center justify-center text-destructive font-noto-bengali">{t('load_failed')}</div>
  }

  const { simulation_scenario, optimization_result } = data
  const allocations = simulation_scenario.campaign_input.allocations

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight font-noto-bengali">{t('title')}</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">{t('estimated_revenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${optimization_result.expected_forecast.estimated_revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('confidence_interval')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">{t('total_spend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${optimization_result.optimized_allocations.reduce((acc: number, curr: OptimizedAllocation) => acc + curr.spend, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('across_channels', { count: optimization_result.optimized_allocations.length })}
            </p>
          </CardContent>
        </Card>
        
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-noto-bengali">{t('recommendations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {optimization_result.recommendations.map((rec: Recommendation) => (
                <div key={rec.recommendation_id} className="mt-2 rounded-md bg-muted p-3">
                  <span className="font-semibold text-primary">{rec.action}: </span>
                  {rec.recommendation_reasoning}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-4 font-noto-bengali">{t('transactional_logs')}</h2>
        <DataTable columns={columns} data={allocations} />
      </div>
    </div>
  )
}
