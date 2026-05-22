"use client"

import { useLocale } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  
  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-1 bg-muted/60 border border-border/50 rounded-full p-1 shadow-inner backdrop-blur-sm">
        <Link
          href={pathname}
          locale="en"
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
            locale === 'en'
              ? 'bg-background shadow text-foreground scale-105'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/5'
          }`}
        >
          EN
        </Link>
        <Link
          href={pathname}
          locale="bn"
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 font-noto-bengali ${
            locale === 'bn'
              ? 'bg-background shadow text-foreground scale-105'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/5'
          }`}
        >
          বাং
        </Link>
      </div>
    </div>
  )
}
