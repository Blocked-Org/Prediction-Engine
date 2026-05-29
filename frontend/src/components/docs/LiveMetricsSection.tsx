'use client'

import { useEffect, useState } from 'react'
import { Activity, Users, Building2, Server } from 'lucide-react'

interface Metrics {
  total_tenants: number
  total_users: number
  total_organizations: number
  uptime_days: number
}

export function LiveMetricsSection({ locale }: { locale: 'en' | 'bn' }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    fetch('/api/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error("Failed to load metrics:", err))
  }, [])

  const t = (en: string, bn: string) => locale === 'bn' ? bn : en

  if (!metrics) {
    return <div className="animate-pulse h-32 bg-muted/50 rounded-2xl w-full" />
  }

  const statCards = [
    {
      icon: <Building2 className="w-6 h-6 text-blue-500" />,
      label: t('Active Tenants', 'সক্রিয় টেন্যান্ট'),
      value: metrics.total_tenants
    },
    {
      icon: <Users className="w-6 h-6 text-emerald-500" />,
      label: t('Total Users', 'সর্বমোট ব্যবহারকারী'),
      value: metrics.total_users
    },
    {
      icon: <Activity className="w-6 h-6 text-amber-500" />,
      label: t('Organizations', 'প্রতিষ্ঠানসমূহ'),
      value: metrics.total_organizations
    },
    {
      icon: <Server className="w-6 h-6 text-purple-500" />,
      label: t('Uptime (Days)', 'আপটাইম (দিন)'),
      value: metrics.uptime_days
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-8">
      {statCards.map((stat, i) => (
        <div key={i} className="p-6 rounded-2xl bg-card border border-border/40 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-muted/50 rounded-full mb-3">{stat.icon}</div>
          <div className="text-3xl font-black text-foreground mb-1">{stat.value}</div>
          <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
