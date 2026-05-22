import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { SignInButton, UserButton, Show } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ArrowRight, Activity, Brain, Users, Link as LinkIcon, Dna, Search, WifiOff, Code2 } from 'lucide-react'

export default function HomePage() {
  const t = useTranslations('HomePage')
  const locale = useLocale()
  const dashboardUrl = `/${locale}/dashboard`
  const onboardingUrl = `/${locale}/onboarding`

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-background font-sans">

      {/* --- Animated Mesh Background --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-accent/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '1s' }} />
      </div>

      {/* --- Navbar Section --- */}
      <nav className="absolute top-0 w-full z-50 flex items-center justify-between p-6 max-w-7xl mx-auto backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Activity className="h-6 w-6 text-primary" />
          <span>Infinity<span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Sim</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-muted/50 backdrop-blur-md border border-border/50 rounded-full p-1">
            <Link
              href="/"
              locale="en"
              prefetch={false}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${locale === 'en' ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              EN
            </Link>
            <Link
              href="/"
              locale="bn"
              prefetch={false}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 font-noto-bengali ${locale === 'bn' ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              বাং
            </Link>
          </div>
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton
              mode="modal"
              forceRedirectUrl={dashboardUrl}
              signUpForceRedirectUrl={onboardingUrl}
            >
              <Button variant="outline" size="sm" className="hidden sm:flex border-primary/20 hover:bg-primary/10">
                {t('sign_in')}
              </Button>
            </SignInButton>
          </Show>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <div className="z-10 w-full max-w-6xl flex flex-col items-center gap-8 text-center px-4 pt-32 pb-16 mt-10">

        {/* Floating Badge */}


        {/* Title & Subtitle */}
        <div className="flex flex-col gap-6 items-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight text-balance text-foreground font-noto-bengali leading-[1.1]">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 drop-shadow-sm">
              {locale === 'bn' ? 'ভবিষ্যৎ সিমুলেট করুন,' : 'Simulating Futures,'}
            </span>
            <br />
            {locale === 'bn' ? 'অনুমান নয়' : 'Not Guessing'}
          </h1>

          <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl font-noto-bengali leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Show when="signed-in">
            <Link href="/dashboard" prefetch={false}>
              <Button size="lg" className="w-full sm:w-auto gap-2 flex text-base h-14 px-10 rounded-full bg-primary text-primary-foreground shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] transition-all duration-300 hover:scale-105">
                {t('get_started')} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </Show>
          <Show when="signed-out">
            <SignInButton
              mode="modal"
              forceRedirectUrl={dashboardUrl}
              signUpForceRedirectUrl={onboardingUrl}
            >
              <Button size="lg" className="w-full sm:w-auto gap-2 flex text-base h-14 px-10 rounded-full bg-primary text-primary-foreground shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] transition-all duration-300 hover:scale-105">
                {t('get_started')} <ArrowRight className="h-5 w-5" />
              </Button>
            </SignInButton>
          </Show>
        </div>

      </div>

      {/* --- Tech Stack Strip --- */}
      <div className="z-10 w-full max-w-5xl overflow-hidden py-8 border-y border-border/40 bg-muted/20 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex flex-wrap justify-center items-center gap-4 px-4 opacity-70">
          {['PyMC', 'Mesa 3.0', 'Neo4j', 'LlamaIndex', 'pymoo', 'SHAP', 'Next.js 15', 'FastAPI'].map(tech => (
            <div key={tech} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/50 text-sm font-medium">
              <Code2 className="h-4 w-4 text-primary" />
              {tech}
            </div>
          ))}
        </div>
      </div>

      {/* --- Feature Grid --- */}
      <div className="z-10 w-full max-w-6xl px-4 py-24 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          <FeatureCard
            icon={<Brain />} title="Bayesian MMM" color="text-blue-500" bg="bg-blue-500/10"
            desc="Causal forecasting, not descriptive attribution. Probabilistic modeling with PyMC."
          />
          <FeatureCard
            icon={<Users />} title="Agent-Based Simulation" color="text-indigo-500" bg="bg-indigo-500/10"
            desc="1,000 synthetic consumers model your market dynamics using Mesa 3.0."
          />
          <FeatureCard
            icon={<LinkIcon />} title="Markov Attribution" color="text-purple-500" bg="bg-purple-500/10"
            desc="Removal-effect causal channel analysis to identify true conversion drivers."
          />
          <FeatureCard
            icon={<Dna />} title="Genetic Optimization" color="text-pink-500" bg="bg-pink-500/10"
            desc="NSGA-II multi-objective algorithm finds your Pareto-optimal budget allocation."
          />
          <FeatureCard
            icon={<Search />} title="SHAP Explainability" color="text-emerald-500" bg="bg-emerald-500/10"
            desc="Zero-hallucination, math-grounded AI reports integrating Neo4j GraphRAG."
          />
          <FeatureCard
            icon={<WifiOff />} title="Offline AI" color="text-amber-500" bg="bg-amber-500/10"
            desc="Gemma 4 runs locally. Zero cloud dependency for maximum data privacy."
          />

        </div>
      </div>

      {/* --- Social Proof / Stats Bar --- */}
      <div className="z-10 w-full bg-card/40 border-t border-border/50 backdrop-blur-lg py-16 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-around items-center gap-8 px-4">
          <StatBox value="6" label="AI Layers Integrated" />
          <StatBox value="56" label="Neo4j Knowledge Indexes" />
          <StatBox value="100+" label="Automated Tests Passing" />
        </div>
      </div>

    </main>
  )
}

function FeatureCard({ icon, title, desc, color, bg }: { icon: React.ReactNode, title: string, desc: string, color: string, bg: string }) {
  return (
    <div className="group relative p-6 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden card-hover-lift">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${bg} ${color}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function StatBox({ value, label }: { value: string, label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center group">
      <div className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground group-hover:scale-110 transition-transform duration-500">
        {value}
      </div>
      <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
        {label}
      </div>
    </div>
  )
}
