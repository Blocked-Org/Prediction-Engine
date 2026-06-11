'use client'

import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PricingCardProps {
  id: string
  name: string
  description: string
  monthlyPriceBDT: number
  monthlyPriceUSD: number
  features: string[]
  isPopular?: boolean
  isAnnual: boolean
  currency: 'BDT' | 'USD'
  ctaText: string
  onCtaClick: () => void
  isCustomPrice?: boolean
}

export function PricingCard({

  name,
  description,
  monthlyPriceBDT,
  monthlyPriceUSD,
  features,
  isPopular = false,
  isAnnual,
  currency,
  ctaText,
  onCtaClick,
  isCustomPrice = false,
}: PricingCardProps) {
  const t = useTranslations('PricingPage')

  // Calculate pricing based on currency and billing frequency
  const basePrice = currency === 'BDT' ? monthlyPriceBDT : monthlyPriceUSD
  const priceMultiplier = isAnnual ? 0.8 : 1.0 // 20% discount for annual
  const displayPrice = basePrice === 0 ? 0 : Math.round(basePrice * priceMultiplier)
  const billingLabel = isAnnual ? '/yr' : '/mo'

  return (
    <Card className={`relative flex flex-col justify-between overflow-hidden bg-card transition-all duration-300 hover:-translate-y-1 ${isPopular ? 'border-2 border-primary/70 shadow-[0_0_40px_rgba(99,102,241,0.25)] z-10 scale-105' : 'border border-border/50 hover:shadow-xl hover:border-primary/30 z-0'}`}>
      {isPopular && (
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground font-semibold px-3 py-1 text-xs">
            {t('popular')}
          </Badge>
        </div>
      )}

      <div>
        <CardHeader className="pt-8 px-6 pb-6">
          <CardTitle className="text-2xl font-bold text-foreground">{name}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6 border-b border-border/20">
          {/* Price display */}
          <div className="flex items-baseline gap-1 text-foreground">
            <span className="text-4xl md:text-5xl font-black tracking-tight">
              {isCustomPrice ? (
                'Custom'
              ) : displayPrice === 0 ? (
                'Free'
              ) : (
                <>
                  {currency === 'BDT' ? '৳' : '$'}
                  {isAnnual ? displayPrice * 12 : displayPrice}
                </>
              )}
            </span>
            {!isCustomPrice && displayPrice !== 0 && (
              <span className="text-sm font-semibold text-muted-foreground">
                {billingLabel}
              </span>
            )}
          </div>
          {!isCustomPrice && isAnnual && displayPrice > 0 && (
            <p className="text-xs text-amber-500 font-semibold mt-1">
              {t('save_20')}
            </p>
          )}

          {/* Features list */}
          <ul className="mt-8 flex flex-col gap-4">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </div>

      <CardFooter className="p-6 mt-auto">
        <Button
          onClick={onCtaClick}
          className={`w-full h-11 rounded-full font-semibold transition-all duration-300 ${isPopular ? 'bg-primary text-primary-foreground hover:scale-[1.02] shadow-lg shadow-primary/25' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
        >
          {ctaText}
        </Button>
      </CardFooter>
    </Card>
  )
}
