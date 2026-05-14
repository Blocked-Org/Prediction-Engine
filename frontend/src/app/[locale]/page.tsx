import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { SignInButton, UserButton, Show } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ArrowRight, Activity, Globe, Cpu } from 'lucide-react'

export default function HomePage() {
  const t = useTranslations('HomePage')
  const locale = useLocale()
  const dashboardUrl = `/${locale}/dashboard`

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 font-sans">
      {/* Navbar Section */}
      <nav className="absolute top-0 w-full flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Activity className="h-6 w-6 text-blue-600" />
          <span>Infinity<span className="text-blue-600">Sim</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full px-1 py-1">
            <Link 
              href="/" 
              locale="en" 
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${locale === 'en' ? 'bg-white dark:bg-zinc-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t('english')}
            </Link>
            <Link 
              href="/" 
              locale="bn" 
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${locale === 'bn' ? 'bg-white dark:bg-zinc-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t('bengali')}
            </Link>
          </div>
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl={dashboardUrl} signUpForceRedirectUrl={dashboardUrl}>
              <Button variant="default" size="sm">{t('sign_in')}</Button>
            </SignInButton>
          </Show>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-8 text-center px-4 mt-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium border border-blue-200 dark:border-blue-800/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          {t('top_badge')}
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 font-noto-bengali leading-tight">
          {t('title')}
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl font-noto-bengali leading-relaxed">
          {t('description')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto relative">
          <Show when="signed-in">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto gap-2 flex text-base h-12 px-8">
                {t('get_started')} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl={dashboardUrl} signUpForceRedirectUrl={dashboardUrl}>
              <Button size="lg" className="w-full sm:w-auto gap-2 flex text-base h-12 px-8">
                {t('get_started')} <ArrowRight className="h-4 w-4" />
              </Button>
            </SignInButton>
          </Show>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 text-left w-full max-w-4xl p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-black/50">
          <div className="flex flex-col gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg">Predictive Economics</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Runs Bayesian MMM on deterministic graph signals for high-fidelity predictions.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400">
              <Globe className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg font-noto-bengali">বহুভাষিক সাপোর্ট (i18n)</h3>
            <p className="text-muted-foreground text-sm leading-relaxed font-noto-bengali">Local-first approach with full Bengali & English localization for native decision-makers.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
