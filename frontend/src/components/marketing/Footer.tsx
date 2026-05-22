'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Activity } from 'lucide-react'

export function Footer() {
  const t = useTranslations('Footer')
  const tNav = useTranslations('Navbar')
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border/40 bg-card/20 backdrop-blur-sm py-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Tagline / Brand */}
          <div className="flex flex-col gap-3 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground">
              <Activity className="h-5 w-5 text-primary" />
              <span>Infinity<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Sim</span></span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t('tagline')}
            </p>
          </div>

          {/* Site Links */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-sm font-semibold text-foreground tracking-wider uppercase">Navigation</h4>
            <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {tNav('features')}
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {tNav('pricing')}
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {tNav('docs')}
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {tNav('contact')}
            </Link>
          </div>

          {/* Legal / Policy Links */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-sm font-semibold text-foreground tracking-wider uppercase">Legal</h4>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('privacy')}
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('terms')}
            </a>
          </div>

        </div>

        {/* Divider & Copyright */}
        <div className="border-t border-border/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} InfinitySim. {t('rights')}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Built for Infinity AI BuildFest 2026</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
