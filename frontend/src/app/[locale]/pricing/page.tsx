'use client'

import { useTranslations } from 'next-intl'
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
      monthlyPriceBDT: 1750,
      monthlyPriceUSD: 14,
      features: [
        t('features.mmm_single'),
        t('features.bkash'),
        t('features.support'),
      ],
      ctaText: t('get_started'),
      isPopular: false,
    },
    {
      id: 'growth',
      name: t('tiers.growth.name'),
      description: t('tiers.growth.desc'),
      monthlyPriceBDT: 8000,
      monthlyPriceUSD: 99,
      features: [
        t('features.mmm_multi'),
        t('features.markov'),
        t('features.rag'),
        t('features.sim_runs'),
      ],
      ctaText: t('get_started'),
      isPopular: false,
    },
    {
      id: 'professional',
      name: t('tiers.professional.name'),
      description: t('tiers.professional.desc'),
      monthlyPriceBDT: 42000,
      monthlyPriceUSD: 499,
      features: [
        t('features.unlimited_sims'),
        t('features.genetic'),
        t('features.shap'),
        t('features.whitelabel'),
      ],
      ctaText: t('get_started'),
      isPopular: true,
    },
    {
      id: 'enterprise',
      name: t('tiers.enterprise.name'),
      description: t('tiers.enterprise.desc'),
      monthlyPriceBDT: 0,
      monthlyPriceUSD: 0,
      features: [
        t('features.dedicated_infra'),
        t('features.custom_calibration'),
        t('features.api_access'),
        t('features.unlimited_seats'),
      ],
      ctaText: t('contact_sales'),
      isPopular: false,
      isCustomPrice: true,
    },
  ]

  return (
    <div className="relative min-h-screen flex flex-col bg-background font-sans" suppressHydrationWarning>
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
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
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
              isCustomPrice={tier.isCustomPrice}
            />
          ))}
        </div>

        {/* Feature Comparison Matrix */}
        <div className="mx-auto max-w-6xl mt-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Compare Plans</h2>
            <p className="text-muted-foreground mt-2">Find the right capabilities for your modeling needs.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-border/40 font-semibold text-foreground w-1/4">Features</th>
                  <th className="p-4 border-b border-border/40 font-semibold text-foreground text-center w-[15%]">Starter</th>
                  <th className="p-4 border-b border-border/40 font-semibold text-foreground text-center w-[15%]">Growth</th>
                  <th className="p-4 border-b border-border/40 font-semibold text-primary text-center bg-primary/5 rounded-t-xl border-t border-l border-r border-primary/20 w-[15%]">Professional</th>
                  <th className="p-4 border-b border-border/40 font-semibold text-foreground text-center w-[15%]">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-sm text-muted-foreground">
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 border-b border-border/20 font-medium text-foreground">Bayesian MMM Forecasting</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">Single Channel</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">Multi Channel</td>
                  <td className="p-4 border-b border-border/20 text-center text-primary bg-primary/5 border-l border-r border-primary/20">Multi Channel</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">Multi Channel</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 border-b border-border/20 font-medium text-foreground">Mesa Agent Simulation</td>
                  <td className="p-4 border-b border-border/20 text-center">-</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">100 Agents</td>
                  <td className="p-4 border-b border-border/20 text-center font-medium bg-primary/5 border-l border-r border-primary/20">1,000 Agents</td>
                  <td className="p-4 border-b border-border/20 text-center font-medium text-foreground">Unlimited (Custom)</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 border-b border-border/20 font-medium text-foreground">Markov Attribution Journey</td>
                  <td className="p-4 border-b border-border/20 text-center">-</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">✓</td>
                  <td className="p-4 border-b border-border/20 text-center text-primary bg-primary/5 border-l border-r border-primary/20">✓</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">✓</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 border-b border-border/20 font-medium text-foreground">NSGA-II Genetic Optimization</td>
                  <td className="p-4 border-b border-border/20 text-center">-</td>
                  <td className="p-4 border-b border-border/20 text-center">-</td>
                  <td className="p-4 border-b border-border/20 text-center text-primary bg-primary/5 border-l border-r border-primary/20">✓</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">✓</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 border-b border-border/20 font-medium text-foreground">Simulation Runs</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">3 / Month</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">5 / Month</td>
                  <td className="p-4 border-b border-border/20 text-center text-primary bg-primary/5 border-l border-r border-primary/20">Unlimited</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">Unlimited</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 border-b border-border/20 font-medium text-foreground">Local Offline LLM (Gemma 4)</td>
                  <td className="p-4 border-b border-border/20 text-center">-</td>
                  <td className="p-4 border-b border-border/20 text-center">-</td>
                  <td className="p-4 border-b border-border/20 text-center text-primary bg-primary/5 border-l border-r border-primary/20">✓</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">✓</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 border-b border-border/20 font-medium text-foreground">Neo4j GraphRAG Integration</td>
                  <td className="p-4 border-b border-border/20 text-center">-</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">✓</td>
                  <td className="p-4 border-b border-border/20 text-center bg-primary/5 border-l border-r border-primary/20 text-primary">✓</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">✓</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 border-b border-border/20 font-medium text-foreground">SHAP Explainability</td>
                  <td className="p-4 border-b border-border/20 text-center">-</td>
                  <td className="p-4 border-b border-border/20 text-center">-</td>
                  <td className="p-4 border-b border-border/20 text-center bg-primary/5 border-l border-r border-primary/20 text-primary">✓</td>
                  <td className="p-4 border-b border-border/20 text-center text-foreground">✓</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 border-b border-border/20 font-medium text-foreground">Support Level</td>
                  <td className="p-4 border-b border-border/20 text-center">Community</td>
                  <td className="p-4 border-b border-border/20 text-center">Email</td>
                  <td className="p-4 border-b border-border/20 text-center bg-primary/5 border-l border-r border-primary/20 border-b-primary/20 rounded-b-xl">Priority Email</td>
                  <td className="p-4 border-b border-border/20 text-center">24/7 Dedicated SLA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  )
}
