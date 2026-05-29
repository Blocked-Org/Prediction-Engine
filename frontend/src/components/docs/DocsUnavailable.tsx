'use client'

import { useEffect, useState, useCallback } from 'react'
import { getTimeUntilAvailable, type DocsSchedule } from '@/lib/docs-config'
import { Activity, Clock, Lock, ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'

interface Props {
  schedule: DocsSchedule
  locale: 'en' | 'bn'
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

export function DocsUnavailable({ schedule, locale }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const calcTime = useCallback(() => {
    return getTimeUntilAvailable(schedule)
  }, [schedule])

  useEffect(() => {
    setTimeLeft(calcTime())
    const timer = setInterval(() => {
      setTimeLeft(calcTime())
    }, 1000)
    return () => clearInterval(timer)
  }, [calcTime])

  const countdown = timeLeft ? formatCountdown(timeLeft) : null
  const hasCountdown = countdown && timeLeft && timeLeft > 0

  const texts = {
    en: {
      title: 'Documentation Not Available',
      subtitle: 'This documentation is currently restricted. It will become publicly available during the scheduled window.',
      countdown_label: 'Available in',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
      back: 'Back to Home',
      contact: 'Contact Administrator',
      disabled: 'Documentation has been disabled by an administrator.',
    },
    bn: {
      title: 'ডকুমেন্টেশন অনুপলব্ধ',
      subtitle: 'এই ডকুমেন্টেশনটি বর্তমানে সীমাবদ্ধ। নির্ধারিত সময়ে এটি সর্বজনীনভাবে উপলব্ধ হবে।',
      countdown_label: 'উপলব্ধ হবে',
      days: 'দিন',
      hours: 'ঘন্টা',
      minutes: 'মিনিট',
      seconds: 'সেকেন্ড',
      back: 'হোমে ফিরুন',
      contact: 'অ্যাডমিনের সাথে যোগাযোগ',
      disabled: 'অ্যাডমিনিস্ট্রেটর কর্তৃক ডকুমেন্টেশন নিষ্ক্রিয় করা হয়েছে।',
    },
  }

  const t = texts[locale]

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Animated Background Meshes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-accent/10 to-transparent blur-[100px]" style={{ animationDelay: '1s', animationDuration: '3s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        {/* Lock Icon */}
        <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border/30 backdrop-blur-xl flex items-center justify-center mb-8 shadow-2xl">
          <Lock className="w-10 h-10 text-primary" />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4">
          {t.title}
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
          {!schedule.enabled ? t.disabled : t.subtitle}
        </p>

        {/* Countdown Timer */}
        {hasCountdown && countdown && (
          <div className="mb-12">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
              <Clock className="w-4 h-4" />
              <span className="uppercase tracking-widest font-semibold text-xs">{t.countdown_label}</span>
            </div>
            <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
              {[
                { val: countdown.days, label: t.days },
                { val: countdown.hours, label: t.hours },
                { val: countdown.minutes, label: t.minutes },
                { val: countdown.seconds, label: t.seconds },
              ].map(({ val, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl"
                >
                  <span className="text-3xl md:text-4xl font-black text-foreground tabular-nums">
                    {String(val).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/">
            <Button variant="outline" size="lg" className="gap-2 rounded-full border-border/40">
              <ArrowLeft className="w-4 h-4" />
              {t.back}
            </Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" className="gap-2 rounded-full">
              <Activity className="w-4 h-4" />
              {t.contact}
            </Button>
          </Link>
        </div>

        {/* Branding */}
        <div className="mt-16 flex items-center justify-center gap-2 text-muted-foreground/50">
          <Activity className="w-4 h-4" />
          <span className="text-sm font-semibold tracking-tight">BrandOS</span>
        </div>
      </div>
    </div>
  )
}
