'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { SignInButton, UserButton, Show } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Activity, Globe, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const t = useTranslations('Navbar')
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  const dashboardUrl = `/${locale}/dashboard`
  const onboardingUrl = `/${locale}/onboarding`

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4 md:px-8">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground hover:opacity-90">
          <Activity className="h-6 w-6 text-primary animate-pulse" />
          <span>Infinity<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Sim</span></span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('features')}
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('pricing')}
          </Link>
          <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('docs')}
          </Link>
          <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('contact')}
          </Link>
        </div>

        {/* Actions (Language Switcher, Auth, Mobile Toggle) */}
        <div className="flex items-center gap-4">
          
          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 border border-border/50 rounded-full p-1">
            <Link
              href="/"
              locale="en"
              prefetch={false}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${locale === 'en' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              EN
            </Link>
            <Link
              href="/"
              locale="bn"
              prefetch={false}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${locale === 'bn' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              বাং
            </Link>
          </div>

          {/* User Profile / Login */}
          <div className="hidden sm:flex items-center gap-3">
            <Show when="signed-in">
              <Link href="/dashboard" prefetch={false}>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                  {t('dashboard')}
                </Button>
              </Link>
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal" forceRedirectUrl={dashboardUrl} signUpForceRedirectUrl={onboardingUrl}>
                <Button size="sm" variant="outline" className="border-primary/20 hover:bg-primary/10">
                  {t('dashboard')}
                </Button>
              </SignInButton>
            </Show>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground focus:outline-none"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isOpen && (
        <div className="md:hidden border-b border-border/40 bg-background/95 backdrop-blur-lg animate-in fade-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-4 p-6">
            <Link
              href="/features"
              onClick={() => setIsOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('features')}
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('pricing')}
            </Link>
            <Link
              href="/docs"
              onClick={() => setIsOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('docs')}
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('contact')}
            </Link>

            {/* Mobile Auth Actions */}
            <div className="border-t border-border/40 pt-4 flex flex-col gap-3">
              <Show when="signed-in">
                <Link href="/dashboard" prefetch={false} onClick={() => setIsOpen(false)}>
                  <Button size="default" className="w-full">
                    {t('dashboard')}
                  </Button>
                </Link>
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal" forceRedirectUrl={dashboardUrl} signUpForceRedirectUrl={onboardingUrl}>
                  <Button size="default" className="w-full">
                    {t('dashboard')}
                  </Button>
                </SignInButton>
              </Show>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
