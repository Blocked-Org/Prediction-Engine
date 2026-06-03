'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useFooterReveal } from './ScrollAnimations'

export function Footer() {
  const t = useTranslations('Footer')
  const tNav = useTranslations('Navbar')
  const currentYear = new Date().getFullYear()

  // GSAP footer text animation
  useFooterReveal('.footer-giant-text')

  return (
    <footer className="w-full bg-white border-t border-[#E5E5E5] relative z-10 mt-auto">
      
      {/* Top Section — Two Column Layout */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          
          {/* Left Column — Navigation Links */}
          <div className="flex flex-col gap-8">
            {/* Site Links */}
            <div className="flex flex-col gap-3">
              <Link href="/" className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] hover:opacity-60 transition-opacity">
                HOME
              </Link>
              <Link href="/features" className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] hover:opacity-60 transition-opacity">
                {tNav('features')}
              </Link>
              <Link href="/pricing" className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] hover:opacity-60 transition-opacity">
                {tNav('pricing')}
              </Link>
              <Link href="/docs" className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] hover:opacity-60 transition-opacity">
                {tNav('docs')}
              </Link>
              <Link href="/contact" className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] hover:opacity-60 transition-opacity">
                {tNav('contact')}
              </Link>
            </div>

            {/* Social Links */}
            <div className="flex flex-col gap-3">
              <a href="#" className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] hover:opacity-60 transition-opacity">
                X
              </a>
              <a href="#" className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] hover:opacity-60 transition-opacity">
                LINKEDIN
              </a>
              <a href="#" className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] hover:opacity-60 transition-opacity">
                INSTAGRAM
              </a>
            </div>
          </div>

          {/* Right Column — Description & Info */}
          <div className="flex flex-col gap-8">
            <p className="text-sm font-medium uppercase tracking-wider leading-relaxed text-[#0A0A0A] max-w-md">
              {t('tagline')}
            </p>

            <div className="flex flex-col gap-3">
              <a href="mailto:hello@brandos.app" className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] underline underline-offset-4 hover:opacity-60 transition-opacity">
                HELLO@BRANDOS.APP
              </a>
            </div>

            <div className="flex flex-col gap-1 mt-auto">
              <span className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
                COPYRIGHT {currentYear}
              </span>
              <span className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
                BRANDOS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Giant BRANDOS Text — Full Width */}
      <div className="w-full overflow-hidden py-8 md:py-12">
        <div
          className="footer-giant-text text-center"
          style={{ fontSize: 'clamp(5rem, 20vw, 22rem)' }}
        >
          BRANDOS
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#E5E5E5] px-4 md:px-8 py-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
            + ( PREDICTIVE MARKETING INTELLIGENCE ) ( {currentYear} )
          </span>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
              ( {t('terms')} )
            </a>
            <span className="text-xs text-[#E5E5E5]">+</span>
            <a href="#" className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
              ( {t('privacy')} )
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
