import { ClerkProvider } from '@clerk/nextjs'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Noto_Sans_Bengali, Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import '../globals.css'
import type { Metadata } from 'next'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const notoSansBengali = Noto_Sans_Bengali({
  variable: '--font-noto-bengali',
  subsets: ['bengali'],
  weight: ['400', '600'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'BrandOS — Predictive Marketing Intelligence',
  description: 'A Graph-Augmented Bayesian Simulation Engine for SME marketing intelligence. Simulate campaigns, optimize budgets, and predict causal outcomes.',
}

import { TooltipProvider } from '@/components/ui/tooltip'

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <ClerkProvider>
      <html lang={locale} className={`dark ${geistSans.variable} ${geistMono.variable} ${notoSansBengali.variable} h-full antialiased`} suppressHydrationWarning>
        <body className={`min-h-full flex flex-col font-sans ${locale === 'bn' ? 'font-noto-bengali' : ''}`} suppressHydrationWarning>
          <NextIntlClientProvider messages={messages}>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
