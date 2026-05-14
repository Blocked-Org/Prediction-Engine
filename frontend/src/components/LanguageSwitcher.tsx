"use client"

import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import { Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const tHome = useTranslations('HomePage')
  const tDashboard = useTranslations('Dashboard')
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{tDashboard('toggle_language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={pathname} locale="en" className={`w-full font-noto-bengali ${locale === 'en' ? 'font-bold' : ''}`}>
            {tHome('english')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={pathname} locale="bn" className={`w-full font-noto-bengali ${locale === 'bn' ? 'font-bold' : ''}`}>
            {tHome('bengali')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
