'use client'

import { useTranslations } from 'next-intl'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { Database, Network, TrendingUp, Users, Cpu, MessageSquare, ArrowRight } from 'lucide-react'

export default function FeaturesPage() {
  const t = useTranslations('FeaturesPage')

  const layers = [
    {
      icon: <Database className="h-8 w-8 text-blue-500" />,
      name: t('layers.data.name'),
      desc: t('layers.data.desc'),
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'shadow-blue-500/5',
    },
    {
      icon: <Network className="h-8 w-8 text-purple-500" />,
      name: t('layers.storage.name'),
      desc: t('layers.storage.desc'),
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      glow: 'shadow-purple-500/5',
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-indigo-500" />,
      name: t('layers.mmm.name'),
      desc: t('layers.mmm.desc'),
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      glow: 'shadow-indigo-500/5',
    },
    {
      icon: <Users className="h-8 w-8 text-pink-500" />,
      name: t('layers.abm.name'),
      desc: t('layers.abm.desc'),
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      glow: 'shadow-pink-500/5',
    },
    {
      icon: <Cpu className="h-8 w-8 text-emerald-500" />,
      name: t('layers.opt.name'),
      desc: t('layers.opt.desc'),
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'shadow-emerald-500/5',
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-amber-500" />,
      name: t('layers.llm.name'),
      desc: t('layers.llm.desc'),
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-amber-500/5',
    },
  ]

  return (
    <div className="relative min-h-screen flex flex-col bg-background font-sans">
      <Navbar />

      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px]" />
        <div className="absolute bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[150px]" />
      </div>

      <main className="z-10 flex-grow pt-24 px-4 md:px-8">
        
        {/* Hero Header */}
        <div className="mx-auto max-w-4xl text-center py-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Dynamic Architectural Pipe Line Representation */}
        <div className="mx-auto max-w-5xl mb-24 relative">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500 opacity-20 -translate-y-1/2 hidden lg:block z-0" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {layers.map((layer, idx) => (
              <div
                key={idx}
                className={`group flex flex-col justify-between p-8 rounded-2xl bg-card border ${layer.border} shadow-lg ${layer.glow} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 overflow-hidden`}
              >
                <div>
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 ${layer.bg}`}>
                    {layer.icon}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{layer.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{layer.desc}</p>
                </div>
                
                {/* Visual Flow Indicator */}
                <div className="mt-6 pt-4 border-t border-border/20 flex items-center justify-between text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Pipeline Flow</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  )
}
