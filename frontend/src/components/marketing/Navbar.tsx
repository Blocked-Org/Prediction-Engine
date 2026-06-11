'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import { SignInButton, UserButton, Show } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function Navbar() {
  const t = useTranslations('Navbar')
  const locale = useLocale()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const dashboardUrl = `/${locale}/dashboard`
  const onboardingUrl = `/${locale}/onboarding`

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/80 backdrop-blur-sm border-b border-[#E5E5E5] transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-8 py-4">
        
        {/* Brand Logo */}
        <Link href="/" className="font-display text-xl font-black tracking-tight text-[#0A0A0A] uppercase hover:opacity-70 transition-opacity">
          {t.rich('logo', {
            os: (chunks) => (
              <span className="text-[#0A0A0A]">
                {chunks}
              </span>
            )
          })}
        </Link>

        {/* Desktop Navigation — Parenthesized Links */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/features" className="nav-link-paren px-3 py-1.5">
            ( {t('features')} )
          </Link>
          <Link href="/pricing" className="nav-link-paren px-3 py-1.5">
            ( {t('pricing')} )
          </Link>
          <Link href="/docs" className="nav-link-paren px-3 py-1.5">
            ( {t('docs')} )
          </Link>
          <Link href="/contact" className="nav-link-paren px-3 py-1.5">
            ( {t('contact')} )
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          
          {/* Language Switcher — Minimal Pill */}
          <div className="flex items-center gap-0.5 bg-[#F5F5F0] border border-[#E5E5E5] rounded-full p-0.5">
            <Link
              href={pathname}
              locale="en"
              prefetch={false}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${locale === 'en' ? 'bg-[#0A0A0A] text-white shadow-sm' : 'text-[#6B6B6B] hover:text-[#0A0A0A]'}`}
            >
              {t('en')}
            </Link>
            <Link
              href={pathname}
              locale="bn"
              prefetch={false}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${locale === 'bn' ? 'bg-[#0A0A0A] text-white shadow-sm' : 'text-[#6B6B6B] hover:text-[#0A0A0A]'}`}
            >
              {t('bn')}
            </Link>
          </div>

          {/* User Profile / Login */}
          <div className="hidden sm:flex items-center gap-3">
            <Show when="signed-in">
              <Link href="/dashboard" prefetch={false}>
                <Button size="sm" className="rounded-full bg-[#0A0A0A] text-white hover:bg-[#333] text-xs font-semibold uppercase tracking-wide px-4">
                  {t('dashboard')}
                </Button>
              </Link>
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal" forceRedirectUrl={onboardingUrl} signUpForceRedirectUrl={onboardingUrl}>
                <Button size="sm" className="rounded-full bg-[#0A0A0A] text-white hover:bg-[#333] text-xs font-semibold uppercase tracking-wide px-4">
                  {t('dashboard')}
                </Button>
              </SignInButton>
            </Show>
          </div>

          {/* Mobile Menu Toggle — "+ MENU" style */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex items-center gap-1.5 text-[#0A0A0A] font-semibold text-sm uppercase tracking-wide hover:opacity-70 transition-opacity"
            aria-label="Toggle menu"
          >
            <span className="text-lg leading-none">{isOpen ? '−' : '+'}</span>
            <span>{isOpen ? t('close') : t('menu')}</span>
          </button>

        </div>
      </div>

      {/* Mobile Menu — Full overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-white z-40 animate-fade-in">
          <div className="flex flex-col gap-0 p-8">
            <Link
              href="/features"
              onClick={() => setIsOpen(false)}
              className="py-4 border-b border-[#E5E5E5] text-2xl font-black uppercase tracking-tight text-[#0A0A0A] hover:text-[#6B6B6B] transition-colors"
            >
              {t('features')}
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsOpen(false)}
              className="py-4 border-b border-[#E5E5E5] text-2xl font-black uppercase tracking-tight text-[#0A0A0A] hover:text-[#6B6B6B] transition-colors"
            >
              {t('pricing')}
            </Link>
            <Link
              href="/docs"
              onClick={() => setIsOpen(false)}
              className="py-4 border-b border-[#E5E5E5] text-2xl font-black uppercase tracking-tight text-[#0A0A0A] hover:text-[#6B6B6B] transition-colors"
            >
              {t('docs')}
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="py-4 border-b border-[#E5E5E5] text-2xl font-black uppercase tracking-tight text-[#0A0A0A] hover:text-[#6B6B6B] transition-colors"
            >
              {t('contact')}
            </Link>

            {/* Mobile Auth */}
            <div className="pt-8 flex flex-col gap-3">
              <Show when="signed-in">
                <Link href="/dashboard" prefetch={false} onClick={() => setIsOpen(false)}>
                  <button className="pill-btn w-full justify-center">
                    {t('dashboard')}
                  </button>
                </Link>
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal" forceRedirectUrl={onboardingUrl} signUpForceRedirectUrl={onboardingUrl}>
                  <button className="pill-btn w-full justify-center">
                    {t('dashboard')}
                  </button>
                </SignInButton>
              </Show>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
