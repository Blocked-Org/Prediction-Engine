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
      <h2 className="text-display text-[#0A0A0A] text-center mb-12" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
        {t('title')}
      </h2>
      <Accordion type="single" collapsible className="space-y-4">
        {faqItems.map((item) => (
          <AccordionItem
            key={item.value}
            value={item.value}
            className="border border-[#E5E5E5] bg-white rounded-xl px-6 py-3 transition-colors hover:border-[#0A0A0A]"
          >
            <AccordionTrigger className="text-base font-bold text-[#0A0A0A] hover:no-underline py-3 text-left uppercase tracking-tight">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-[#6B6B6B] leading-relaxed pt-2 pb-4">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
