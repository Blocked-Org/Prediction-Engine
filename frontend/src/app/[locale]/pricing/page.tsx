'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useState } from 'react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { PricingCard } from '@/components/marketing/PricingCard'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function PricingPage() {
  const t = useTranslations('PricingPage')
  const locale = useLocale()
  const router = useRouter()

  const [isAnnual, setIsAnnual] = useState(false)
  const [currency, setCurrency] = useState<'BDT' | 'USD'>('BDT')

  const handleCtaClick = (tierId: string) => {
    if (tierId === 'enterprise') {
      router.push('/contact')
    } else {
      router.push('/dashboard')
    }
  }

  const tiers = [
    {
      id: 'starter',
      name: t('tiers.starter.name'),
      description: t('tiers.starter.desc'),
      monthlyPriceBDT: 2500,
      monthlyPriceUSD: 30,
      features: [
        t('features.mmm'),
        t('features.abm'),
        t('features.markov'),
        t('features.support'),
      ],
      ctaText: t('get_started'),
      isPopular: false,
    },
    {
      id: 'professional',
      name: t('tiers.professional.name'),
      description: t('tiers.professional.desc'),
      monthlyPriceBDT: 8000,
      monthlyPriceUSD: 99,
      features: [
        t('features.mmm'),
        t('features.abm_full'),
        t('features.markov'),
        t('features.genetic'),
        t('features.offline'),
        t('features.support'),
      ],
      ctaText: t('get_started'),
      isPopular: true,
    },
    {
      id: 'enterprise',
      name: t('tiers.enterprise.name'),
      description: t('tiers.enterprise.desc'),
      monthlyPriceBDT: 25000,
      monthlyPriceUSD: 299,
      features: [
        t('features.mmm'),
        t('features.abm_full'),
        t('features.markov'),
        t('features.genetic'),
        t('features.offline'),
        t('features.rag'),
        t('features.custom_nodes'),
        t('features.support_priority'),
      ],
      ctaText: t('contact_sales'),
      isPopular: false,
    },
  ]

  return (
    <div className="relative min-h-screen flex flex-col bg-background font-sans">
      <Navbar />

      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-accent/15 blur-[150px]" />
      </div>

      <main className="z-10 flex-grow pt-24 px-4 md:px-8 pb-20">
        
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center py-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Toggles (Billing Frequency & Currency) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
          
          {/* Monthly / Annual Toggle */}
          <div className="flex items-center gap-3 bg-card/60 backdrop-blur border border-border/40 rounded-full px-5 py-2">
            <Label htmlFor="billing-toggle" className={`text-sm font-semibold transition-colors cursor-pointer ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              {t('monthly')}
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="billing-toggle" className={`text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              <span>{t('annual')}</span>
              <span className="text-[10px] bg-primary/25 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                -20%
              </span>
            </Label>
          </div>

          {/* BDT / USD Tab Toggle */}
          <Tabs value={currency} onValueChange={(val) => setCurrency(val as 'BDT' | 'USD')} className="w-auto">
            <TabsList className="bg-card/60 border border-border/40 rounded-full p-1 h-11">
              <TabsTrigger value="BDT" className="rounded-full px-4 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow">
                {t('currency_bdt')}
              </TabsTrigger>
              <TabsTrigger value="USD" className="rounded-full px-4 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow">
                {t('currency_usd')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

        </div>

        {/* Pricing Cards Grid */}
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <PricingCard
              key={tier.id}
              id={tier.id}
              name={tier.name}
              description={tier.description}
              monthlyPriceBDT={tier.monthlyPriceBDT}
              monthlyPriceUSD={tier.monthlyPriceUSD}
              features={tier.features}
              isPopular={tier.isPopular}
              isAnnual={isAnnual}
              currency={currency}
              ctaText={tier.ctaText}
              onCtaClick={() => handleCtaClick(tier.id)}
            />
          ))}
        </div>

      </main>

      <Footer />
    </div>
  )
}
