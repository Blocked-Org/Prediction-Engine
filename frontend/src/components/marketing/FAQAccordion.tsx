'use client'

import { useTranslations } from 'next-intl'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function FAQAccordion() {
  const t = useTranslations('FAQ')

  const faqItems = [
    { value: 'q1', q: t('q1'), a: t('a1') },
    { value: 'q2', q: t('q2'), a: t('a2') },
    { value: 'q3', q: t('q3'), a: t('a3') },
    { value: 'q4', q: t('q4'), a: t('a4') },
  ]

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-3xl font-extrabold text-center text-foreground mb-8 tracking-tight">
        {t('title')}
      </h2>
      <Accordion type="single" collapsible className="space-y-4">
        {faqItems.map((item) => (
          <AccordionItem
            key={item.value}
            value={item.value}
            className="border border-border/40 bg-card/50 backdrop-blur-sm rounded-xl px-5 py-2.5 transition-colors hover:border-primary/20"
          >
            <AccordionTrigger className="text-base font-semibold text-foreground hover:no-underline py-3 text-left">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-4">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
