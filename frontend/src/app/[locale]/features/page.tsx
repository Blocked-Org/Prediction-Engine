'use client'

import { useTranslations } from 'next-intl'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { Database, Network, TrendingUp, Users, Cpu, MessageSquare, ArrowDown } from 'lucide-react'

export default function FeaturesPage() {
  const t = useTranslations('FeaturesPage')

  const layers = [
    {
      icon: <Database className="h-8 w-8 text-blue-500" />,
      name: t('layers.data.name'),
      desc: t('layers.data.desc'),
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.1)]',
      dotColor: 'bg-blue-500',
      shadowHover: 'hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]',
    },
    {
      icon: <Network className="h-8 w-8 text-purple-500" />,
      name: t('layers.storage.name'),
      desc: t('layers.storage.desc'),
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.1)]',
      dotColor: 'bg-purple-500',
      shadowHover: 'hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]',
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-indigo-500" />,
      name: t('layers.mmm.name'),
      desc: t('layers.mmm.desc'),
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      glow: 'shadow-[0_0_20px_rgba(99,102,241,0.1)]',
      dotColor: 'bg-indigo-500',
      shadowHover: 'hover:shadow-[0_0_40px_rgba(99,102,241,0.2)]',
    },
    {
      icon: <Users className="h-8 w-8 text-pink-500" />,
      name: t('layers.abm.name'),
      desc: t('layers.abm.desc'),
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      glow: 'shadow-[0_0_20px_rgba(236,72,153,0.1)]',
      dotColor: 'bg-pink-500',
      shadowHover: 'hover:shadow-[0_0_40px_rgba(236,72,153,0.2)]',
    },
    {
      icon: <Cpu className="h-8 w-8 text-emerald-500" />,
      name: t('layers.opt.name'),
      desc: t('layers.opt.desc'),
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
      dotColor: 'bg-emerald-500',
      shadowHover: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]',
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-amber-500" />,
      name: t('layers.llm.name'),
      desc: t('layers.llm.desc'),
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]',
      dotColor: 'bg-amber-500',
      shadowHover: 'hover:shadow-[0_0_40px_rgba(245,158,11,0.2)]',
    },
  ]

  return (
    <div className="relative min-h-screen flex flex-col bg-background font-sans overflow-x-hidden" suppressHydrationWarning>
      <Navbar />

      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px]" />
        <div className="absolute bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[150px]" />
      </div>

      <main className="z-10 flex-grow pt-24 px-4 md:px-8 pb-32">
        
        {/* Hero Header */}
        <div className="mx-auto max-w-4xl text-center py-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent pb-2">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Dynamic Architectural Pipe Line Representation */}
        <div className="mx-auto max-w-5xl relative mt-12 px-4 sm:px-0">
          
          {/* Central Animated Line (Desktop only) */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-amber-500 opacity-20 -translate-x-1/2 hidden md:block z-0" />
          
          <div className="flex flex-col gap-12 sm:gap-20 relative z-10">
            {layers.map((layer, idx) => {
              const isEven = idx % 2 === 0
              return (
                <div key={idx} className={`flex flex-col md:flex-row items-center justify-between w-full gap-8 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} animate-in fade-in zoom-in-95 duration-700`} style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}>
                  
                  {/* Content Box */}
                  <div className={`w-full md:w-[45%] flex flex-col ${isEven ? 'md:items-end md:text-right text-left' : 'items-start text-left'}`}>
                    <div className={`group flex flex-col p-8 sm:p-10 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border ${layer.border} shadow-2xl ${layer.shadowHover} transition-all duration-500 hover:-translate-y-2 relative overflow-hidden w-full`}>
                      <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-6 ${layer.bg} ${isEven ? 'md:ml-auto md:mr-0' : ''}`}>
                        {layer.icon}
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{layer.name}</h3>
                      <p className="text-base text-zinc-400 leading-relaxed font-medium">{layer.desc}</p>
                    </div>
                  </div>
                  
                  {/* Node Dot on the central line */}
                  <div className="hidden md:flex w-12 h-12 absolute left-1/2 -translate-x-1/2 rounded-full border-[6px] border-background items-center justify-center bg-zinc-900 z-10 shadow-lg">
                    <div className={`w-3.5 h-3.5 rounded-full animate-pulse ${layer.dotColor} shadow-[0_0_15px_rgba(255,255,255,0.2)]`} />
                  </div>

                  {/* Empty Spacer */}
                  <div className="w-full md:w-[45%] hidden md:block">
                    {/* Visual Connection indicator on the empty side */}
                    <div className={`w-full h-full flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isEven ? 'items-start pl-8' : 'items-end pr-8'}`}>
                       <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                         {idx < layers.length - 1 && (
                           <>
                             Pipeline Flow <ArrowDown className="h-4 w-4 animate-bounce" />
                           </>
                         )}
                       </div>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  )
}
