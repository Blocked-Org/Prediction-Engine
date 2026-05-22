'use client'

import { useTranslations } from 'next-intl'
import { useState, useMemo } from 'react'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { FAQAccordion } from '@/components/marketing/FAQAccordion'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowRight, 
  Activity, 
  Layers, 
  Brain, 
  GitBranch, 
  Users, 
  TrendingUp, 
  Cpu, 
  ShieldCheck, 
  Workflow,
  Sparkles
} from 'lucide-react'

export default function LandingPage() {
  const t = useTranslations('LandingPage')
  
  // Interactive Simulator States
  const [metaBudget, setMetaBudget] = useState(5000)
  const [googleBudget, setGoogleBudget] = useState(3000)
  const [tiktokBudget, setTiktokBudget] = useState(2000)

  // Pipeline Explorer States
  const [activeStep, setActiveStep] = useState(0)
  const [decayRate, setDecayRate] = useState(0.5)
  const [selectedGraphNode, setSelectedGraphNode] = useState('brand')

  // Simulation calculations (Adstock + Hill S-Curve Saturation)
  const simulationResults = useMemo(() => {
    // 1. Saturation function: Hill S-Curve
    // f(x) = x^s / (x^s + K^s)
    const hillMeta = Math.pow(metaBudget, 1.8) / (Math.pow(metaBudget, 1.8) + Math.pow(6000, 1.8))
    const hillGoogle = Math.pow(googleBudget, 1.4) / (Math.pow(googleBudget, 1.4) + Math.pow(4000, 1.4))
    const hillTiktok = Math.pow(tiktokBudget, 1.6) / (Math.pow(tiktokBudget, 1.6) + Math.pow(3000, 1.6))

    // 2. Incremental Revenue lift
    const metaRev = 14500 * hillMeta
    const googleRev = 8800 * hillGoogle
    const tiktokRev = 5500 * hillTiktok
    
    // 3. Base Organic Revenue
    const organicBase = 3500

    const totalSpend = metaBudget + googleBudget + tiktokBudget
    const totalRevenue = metaRev + googleRev + tiktokRev + organicBase
    
    // 4. iROAS (Incremental Return on Ad Spend)
    const incrementalRevenue = totalRevenue - organicBase
    const iroas = totalSpend > 0 ? (incrementalRevenue / totalSpend) : 0

    // 5. Reach (Audience scale)
    const reach = (metaBudget * 14) + (googleBudget * 9) + (tiktokBudget * 18)

    // 6. ABM Converted Agents (Mesa 3.0 modeling simulation)
    const baseConversions = (metaBudget * 0.024) + (googleBudget * 0.048) + (tiktokBudget * 0.018)
    // Word-of-mouth cascade multiplier
    const finalConversions = Math.round(baseConversions * 1.14)

    // 7. Pareto Optimal Budget Allocation (NSGA-II recommendation)
    const optimalMeta = Math.round(totalSpend * 0.48)
    const optimalGoogle = Math.round(totalSpend * 0.32)
    const optimalTiktok = Math.round(totalSpend * 0.20)

    return {
      totalRevenue: Math.round(totalRevenue),
      iroas: parseFloat(iroas.toFixed(2)),
      reach,
      conversions: finalConversions,
      optimal: {
        meta: optimalMeta,
        google: optimalGoogle,
        tiktok: optimalTiktok
      }
    }
  }, [metaBudget, googleBudget, tiktokBudget])

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      
      {/* Dynamic Background Mesh Grid */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-primary/20 to-purple-500/10 blur-[150px]" />
        <div className="absolute bottom-[20%] right-[5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-accent/20 to-indigo-500/10 blur-[130px]" />
        
        {/* Subtle grid lines */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" 
        />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-32 pb-20 flex flex-col items-center text-center">
        
        {/* Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-5xl leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700">
          <span className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            {t('hero.title_gradient')}
          </span>{' '}
          <span className="text-foreground block sm:inline">{t('hero.title_main')}</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-8 text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed animate-in fade-in duration-1000 delay-200">
          {t('hero.subtitle')}
        </p>

        {/* Micro-Widget (ROI Calculator Tease) */}
        <div className="mt-12 w-full max-w-xl mx-auto bg-zinc-900/40 border border-zinc-800/80 p-2 sm:p-3 rounded-full flex items-center justify-between shadow-2xl backdrop-blur-md animate-in fade-in duration-1000 delay-500">
          <div className="flex-1 px-4 flex items-center gap-3">
            <span className="text-zinc-400 font-medium whitespace-nowrap text-sm sm:text-base">{t('hero.monthly_spend_label')}</span>
            <div className="relative flex-1 flex items-center">
              <span className="text-zinc-500 font-mono mr-1">$</span>
              <input 
                type="number" 
                defaultValue={15000} 
                className="w-full bg-transparent border-none text-white font-mono font-bold text-lg sm:text-xl focus:outline-none focus:ring-0 py-1"
                placeholder="15000"
              />
            </div>
          </div>
          <Button asChild className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 sm:px-6 h-10 sm:h-12 font-bold tracking-wide transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20">
            <a href="#simulator">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t('hero.simulate_btn')}</span>
              <span className="sm:hidden">{t('hero.simulate_btn_short')}</span>
            </a>
          </Button>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center animate-in fade-in duration-1000 delay-700">
          <Button asChild variant="outline" size="lg" className="rounded-full font-semibold px-8 h-12 border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-all duration-300">
            <Link href="/docs" className="flex items-center gap-2">
              <span>{t('hero.cta_docs')}</span>
            </Link>
          </Button>
        </div>

      </section>

      {/* Whitepaper Bento Grid - Structural Blind Spots (Moved Up to explain "Why") */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-20 border-t border-zinc-900/50">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {t('bento.title')}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            {t('bento.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Card 1: Cold Start Problem (Wide) */}
          <div className="md:col-span-8 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-8 hover:border-zinc-700/80 transition-all duration-300 flex flex-col justify-between gap-6 group">
            <div className="flex flex-col gap-3">
              <Badge variant="outline" className="w-fit border-indigo-500/30 bg-indigo-500/5 text-indigo-400 rounded-full text-xs font-semibold px-3 py-0.5">
                Transfer Learning
              </Badge>
              <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                {t('bento.spot1_title')}
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm sm:text-base">
                {t('bento.spot1_desc')} Includes deep cross-industry metadata matching models to build high-accuracy estimations from the very first hour.
              </p>
            </div>
            <div className="w-full bg-zinc-950/60 rounded-2xl p-4 border border-zinc-850/50 flex items-center justify-between font-mono text-xs text-zinc-500">
              <span>propensity_weights_initialized = True</span>
              <span className="text-emerald-400">STATUS: ACTIVE</span>
            </div>
          </div>

          {/* Card 2: Linear scale fallacy */}
          <div className="md:col-span-4 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-8 hover:border-zinc-700/80 transition-all duration-300 flex flex-col justify-between gap-6 group">
            <div className="flex flex-col gap-3">
              <Badge variant="outline" className="w-fit border-cyan-500/30 bg-cyan-500/5 text-cyan-400 rounded-full text-xs font-semibold px-3 py-0.5">
                Hill Saturation
              </Badge>
              <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                {t('bento.spot2_title')}
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                {t('bento.spot2_desc')} Computes half-saturation and saturation ceilings to optimize thresholds.
              </p>
            </div>
            <div className="h-20 flex items-end gap-1 px-2 border-b border-zinc-800/60">
              <div className="bg-zinc-800 w-full h-[20%] rounded-t-sm" />
              <div className="bg-zinc-800 w-full h-[40%] rounded-t-sm" />
              <div className="bg-cyan-500/80 w-full h-[65%] rounded-t-sm" />
              <div className="bg-cyan-500 w-full h-[80%] rounded-t-sm" />
              <div className="bg-purple-500 w-full h-[88%] rounded-t-sm" />
              <div className="bg-purple-500 w-full h-[90%] rounded-t-sm" />
            </div>
          </div>

          {/* Card 3: Temporal Lag */}
          <div className="md:col-span-4 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-8 hover:border-zinc-700/80 transition-all duration-300 flex flex-col justify-between gap-6 group">
            <div className="flex flex-col gap-3">
              <Badge variant="outline" className="w-fit border-purple-500/30 bg-purple-500/5 text-purple-400 rounded-full text-xs font-semibold px-3 py-0.5">
                Adstock Transformations
              </Badge>
              <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                {t('bento.spot3_title')}
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                {t('bento.spot3_desc')} Decays campaign effects over custom memory coefficients.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
              <span className="text-primary font-bold">λ = 0.72</span>
              <span>100% → 72% → 51% → 37%</span>
            </div>
          </div>

          {/* Card 4: Cookie deprecation (Wide) */}
          <div className="md:col-span-8 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-8 hover:border-zinc-700/80 transition-all duration-300 flex flex-col justify-between gap-6 group">
            <div className="flex flex-col gap-3">
              <Badge variant="outline" className="w-fit border-emerald-500/30 bg-emerald-500/5 text-emerald-400 rounded-full text-xs font-semibold px-3 py-0.5">
                Causal Modeling
              </Badge>
              <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                {t('bento.spot4_title')}
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm sm:text-base">
                {t('bento.spot4_desc')} Uses aggregate statistical models and Markov chains. Zero reliance on third-party cookies or intrusive mobile device trackers.
              </p>
            </div>
            <div className="w-full bg-zinc-950/60 rounded-2xl p-4 border border-zinc-850/50 flex items-center justify-between text-xs font-semibold text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                100% GDPR / CCPA Compliant
              </span>
              <span>No Cookies Used</span>
            </div>
          </div>

        </div>
      </section>

      {/* Interactive Causal Pipeline Explorer (Moved Up to explain "How") */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 py-20 border-t border-zinc-900/50">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary-foreground bg-primary/5 rounded-full px-3 py-1 font-semibold text-xs flex items-center gap-1.5 w-fit mx-auto">
            <Workflow className="h-3.5 w-3.5 text-primary" />
            <span>Process Map</span>
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {t('pipeline.title')}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            {t('pipeline.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          {/* Left Column: Vertical checklist navigation */}
          <div className="lg:col-span-5 flex flex-col gap-3 w-full">
            {[
              { id: 0, label: t('pipeline.step1'), desc: "Crawls competitor pricing & promotions via Firecrawl." },
              { id: 1, label: t('pipeline.step2'), desc: "Isolates adstock delay and S-curve thresholds." },
              { id: 2, label: t('pipeline.step3'), desc: "Simulates customer conversions via Agent-Based Models." },
              { id: 3, label: t('pipeline.step4'), desc: "Runs multi-objective genetic optimizations." },
              { id: 4, label: t('pipeline.step5'), desc: "Retrieves contextual semantic graphs from Neo4j." },
              { id: 5, label: t('pipeline.step6'), desc: "Calculates SHAP contributions for clean reports." },
            ].map((step) => {
              const isActive = activeStep === step.id
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`text-left p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                    isActive
                      ? 'bg-zinc-900/80 border-zinc-700 text-white shadow-lg shadow-black/50'
                      : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-900/30'
                  }`}
                >
                  <span className={`h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border transition-all duration-300 ${
                    isActive
                      ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.3)]'
                      : 'bg-zinc-900 border-zinc-850 text-zinc-500'
                  }`}>
                    {step.id + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className={`font-bold text-sm ${isActive ? 'text-foreground' : 'text-zinc-400'}`}>{step.label}</span>
                    <span className="text-[11px] text-zinc-500 leading-tight">{step.desc}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right Column: Visualization Canvas */}
          <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-md rounded-3xl p-6 sm:p-8 min-h-[380px] flex flex-col justify-between shadow-2xl w-full">
            {activeStep === 0 && (
              <div className="flex flex-col gap-4 h-full animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[10px] uppercase font-bold">Firecrawl Ingestion</Badge>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1"><span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" />LIVE STREAMING</span>
                </div>
                <div className="bg-black/90 font-mono text-[10px] rounded-xl p-4 border border-zinc-850 text-zinc-400 h-[220px] overflow-y-auto space-y-1.5 leading-normal shadow-inner">
                  <p className="text-zinc-500">[01:28:02] Initializing Firecrawl headless scraper...</p>
                  <p className="text-cyan-400">GET https://competitor-a.com/pricing-plans {"->"} 200 OK</p>
                  <p className="text-zinc-400">└─ Extracted Table: Starter ($19), Growth ($49), Enterprise ($149)</p>
                  <p className="text-purple-400">POST https://api.crawl4ai/analyze-creative {"->"} 200 OK</p>
                  <p className="text-zinc-400">└─ Parsed 8 ad copy assets; computed token weight = 0.82</p>
                  <p className="text-emerald-400">✓ Ingestion complete. Synced 42 parameters to TimescaleDB.</p>
                </div>
                <p className="text-xs text-zinc-500">Crawls competitor pages dynamically, bypasses bot detection mechanisms, and converts unstructured layouts into formatted analytical rows.</p>
              </div>
            )}

            {activeStep === 1 && (
              <div className="flex flex-col gap-4 h-full animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[10px] uppercase font-bold">Bayesian MMM (PyMC)</Badge>
                  <span className="text-xs font-semibold text-zinc-400">Adstock Decay: <span className="font-mono text-cyan-400 font-bold">{decayRate}</span></span>
                </div>

                {/* SVG Curve chart */}
                <div className="bg-black/50 border border-zinc-850 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden h-[180px] shadow-inner">
                  <svg className="w-full h-full" viewBox="0 0 200 100">
                    <line x1="0" y1="90" x2="200" y2="90" stroke="#1f2937" strokeWidth="1" />
                    <line x1="10" y1="0" x2="10" y2="100" stroke="#1f2937" strokeWidth="1" />
                    
                    <path
                      d={`M 10 20 C 60 ${20 + decayRate * 60}, 120 ${80 - (1 - decayRate) * 40}, 190 90`}
                      fill="none"
                      stroke="url(#cyan-grad)"
                      strokeWidth="3.5"
                      className="transition-all duration-350 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]"
                    />
                    
                    <defs>
                      <linearGradient id="cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <div className="absolute bottom-2 right-4 left-4 bg-zinc-950/90 border border-zinc-800 p-2 rounded-lg flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Adjust Delay</span>
                    <Slider
                      value={[decayRate]}
                      onValueChange={(val) => setDecayRate(val[0])}
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      className="cursor-pointer flex-1"
                    />
                  </div>
                </div>

                <p className="text-xs text-zinc-500">Estimates non-linear saturation curves and carries over ad awareness across days. Evaluates decay delay factors to isolate organic baselines.</p>
              </div>
            )}

            {activeStep === 2 && (
              <div className="flex flex-col gap-4 h-full animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="border-purple-500/20 bg-purple-500/5 text-purple-400 text-[10px] uppercase font-bold">Mesa Agent Simulation</Badge>
                  <span className="text-[10px] text-zinc-400 font-semibold font-mono">1,024 AGENTS ACTIVE</span>
                </div>

                <div className="bg-black/50 border border-zinc-850 rounded-2xl p-6 flex flex-wrap gap-2.5 items-center justify-center h-[180px] shadow-inner">
                  {Array.from({ length: 48 }).map((_, idx) => {
                    const isConverted = (idx * 17) % 7 === 0 || (idx * 23) % 9 === 0
                    const isExposed = !isConverted && ((idx * 31) % 5 === 0)
                    return (
                      <span
                        key={idx}
                        className={`h-3 w-3 rounded-full transition-all duration-500 ${
                          isConverted
                            ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse'
                            : isExposed
                              ? 'bg-cyan-500/45'
                              : 'bg-zinc-800'
                        }`}
                      />
                    )
                  })}
                </div>

                <p className="text-xs text-zinc-500">Simulates discrete actions (word-of-mouth diffusion, coupon triggers, churn decisions) to evaluate how ad impressions scale exponentially in customer cohorts.</p>
              </div>
            )}

            {activeStep === 3 && (
              <div className="flex flex-col gap-4 h-full animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[10px] uppercase font-bold">NSGA-II Genetic Optimizer</Badge>
                  <span className="text-[10px] text-zinc-500 font-bold font-mono">CONVERGED AT GEN 250</span>
                </div>

                <div className="bg-black/50 border border-zinc-850 rounded-2xl p-4 flex items-center justify-center h-[180px] shadow-inner">
                  <svg className="w-full h-full" viewBox="0 0 200 100">
                    <line x1="10" y1="90" x2="190" y2="90" stroke="#1f2937" strokeWidth="1" />
                    <line x1="20" y1="10" x2="20" y2="90" stroke="#1f2937" strokeWidth="1" />
                    
                    <circle cx="50" cy="70" r="3" fill="#3f3f46" />
                    <circle cx="70" cy="55" r="3" fill="#3f3f46" />
                    <circle cx="85" cy="65" r="3" fill="#3f3f46" />
                    <circle cx="110" cy="45" r="3" fill="#3f3f46" />
                    <circle cx="130" cy="60" r="3" fill="#3f3f46" />
                    
                    <path d="M 40 30 Q 95 32 160 55" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" />
                    
                    <circle cx="40" cy="30" r="4.5" fill="#f43f5e" className="animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                    <circle cx="95" cy="32" r="4.5" fill="#f43f5e" className="animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                    <circle cx="160" cy="55" r="4.5" fill="#f43f5e" className="animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                    
                    <text x="45" y="24" fill="#a1a1aa" fontSize="7" fontFamily="monospace">Point A (Max ROI)</text>
                    <text x="110" y="28" fill="#a1a1aa" fontSize="7" fontFamily="monospace">Point B (Balanced)</text>
                  </svg>
                </div>

                <p className="text-xs text-zinc-500">Runs multi-objective evolutionary calculations to output a Pareto curve. Resolves conflict boundaries between maximum ROAS yield and lowest risk variance.</p>
              </div>
            )}

            {activeStep === 4 && (
              <div className="flex flex-col gap-4 h-full animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[10px] uppercase font-bold">Neo4j GraphRAG</Badge>
                  <div className="flex gap-2">
                    {['brand', 'campaign', 'metric'].map((node) => (
                      <button
                        key={node}
                        type="button"
                        onClick={() => setSelectedGraphNode(node)}
                        className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded border transition-all ${
                          selectedGraphNode === node
                            ? 'bg-indigo-500/20 border-indigo-400 text-indigo-400'
                            : 'bg-zinc-950 border-zinc-850 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {node}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-black/50 border border-zinc-850 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden h-[180px] shadow-inner">
                  <svg className="w-full h-full" viewBox="0 0 200 100">
                    <line x1="100" y1="50" x2="40" y2="30" stroke={selectedGraphNode === 'brand' ? '#818cf8' : '#27272a'} strokeWidth="1.5" className="transition-colors duration-300" />
                    <line x1="100" y1="50" x2="160" y2="30" stroke={selectedGraphNode === 'campaign' ? '#818cf8' : '#27272a'} strokeWidth="1.5" className="transition-colors duration-300" />
                    <line x1="100" y1="50" x2="100" y2="90" stroke={selectedGraphNode === 'metric' ? '#818cf8' : '#27272a'} strokeWidth="1.5" className="transition-colors duration-300" />
                    
                    <circle cx="100" cy="50" r="12" fill="#312e81" stroke="#818cf8" strokeWidth="2" />
                    <text x="100" y="53" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">InfinitySim</text>

                    <circle cx="40" cy="30" r="10" fill={selectedGraphNode === 'brand' ? '#1e1b4b' : '#18181b'} stroke={selectedGraphNode === 'brand' ? '#818cf8' : '#3f3f46'} strokeWidth="1.5" className="transition-colors duration-300" />
                    <text x="40" y="32" fill="#e4e4e7" fontSize="5" textAnchor="middle">Competitor</text>

                    <circle cx="160" cy="30" r="10" fill={selectedGraphNode === 'campaign' ? '#1e1b4b' : '#18181b'} stroke={selectedGraphNode === 'campaign' ? '#818cf8' : '#3f3f46'} strokeWidth="1.5" className="transition-colors duration-300" />
                    <text x="160" y="32" fill="#e4e4e7" fontSize="5" textAnchor="middle">Campaign</text>

                    <circle cx="100" cy="90" r="10" fill={selectedGraphNode === 'metric' ? '#1e1b4b' : '#18181b'} stroke={selectedGraphNode === 'metric' ? '#818cf8' : '#3f3f46'} strokeWidth="1.5" className="transition-colors duration-300" />
                    <text x="100" y="92" fill="#e4e4e7" fontSize="5" textAnchor="middle">iROAS</text>
                  </svg>
                </div>

                <p className="text-xs text-zinc-500">Maps structural connections between variables, campaigns, and competitor nodes. Retains cross-market context to feed deterministic parameters to localized summaries.</p>
              </div>
            )}

            {(activeStep === 5) && (
              <div className="flex flex-col gap-4 h-full animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] uppercase font-bold">SHAP TreeExplainer</Badge>
                  <span className="text-[10px] text-zinc-500 font-bold font-mono">BIAS STABILITY: 99.8%</span>
                </div>

                <div className="bg-black/50 border border-zinc-850 rounded-2xl p-4 flex flex-col gap-3 justify-center h-[180px] text-xs shadow-inner">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-zinc-400 text-[10px]">
                      <span>Adstock Memory Carryover</span>
                      <span className="text-emerald-400 font-bold font-mono">+0.42</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '70%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-zinc-400 text-[10px]">
                      <span>Competitor Price Discount</span>
                      <span className="text-rose-400 font-bold font-mono">-0.18</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-zinc-400 text-[10px]">
                      <span>Temporal Lag Adjustment</span>
                      <span className="text-emerald-400 font-bold font-mono">+0.15</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '25%' }} />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-500">Guarantees execution safety by proving feature impact coefficients. Eliminates model hallucination vectors for deterministic reports.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Sandbox Simulator Widget (Moved Down as Final CTA before FAQ) */}
      <section id="simulator" className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-20 border-t border-zinc-900/50">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t('simulator.title')}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-sm sm:text-base">
            {t('simulator.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Sliders Input Panel */}
          <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-8 shadow-xl">
            
            {/* Meta Ads Slider */}
            <div className="flex flex-col gap-4 group">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-zinc-300 group-hover:text-white transition-colors">{t('simulator.meta_ads')}</span>
                <span className="font-bold text-white font-mono bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700">${metaBudget.toLocaleString()}</span>
              </div>
              <Slider
                value={[metaBudget]}
                onValueChange={(val) => setMetaBudget(val[0])}
                max={15000}
                step={500}
                className="cursor-pointer"
              />
            </div>

            {/* Google Search Slider */}
            <div className="flex flex-col gap-4 group">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-zinc-300 group-hover:text-white transition-colors">{t('simulator.google_search')}</span>
                <span className="font-bold text-white font-mono bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700">${googleBudget.toLocaleString()}</span>
              </div>
              <Slider
                value={[googleBudget]}
                onValueChange={(val) => setGoogleBudget(val[0])}
                max={15000}
                step={500}
                className="cursor-pointer"
              />
            </div>

            {/* TikTok Ads Slider */}
            <div className="flex flex-col gap-4 group">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-zinc-300 group-hover:text-white transition-colors">{t('simulator.tiktok_ads')}</span>
                <span className="font-bold text-white font-mono bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700">${tiktokBudget.toLocaleString()}</span>
              </div>
              <Slider
                value={[tiktokBudget]}
                onValueChange={(val) => setTiktokBudget(val[0])}
                max={15000}
                step={500}
                className="cursor-pointer"
              />
            </div>

            {/* Theoretical note */}
            <div className="text-xs text-zinc-500 border-t border-zinc-800/80 pt-4 flex items-start gap-2 mt-4">
              <Cpu className="h-4 w-4 shrink-0 text-primary" />
              <p>{t('simulator.explanation')}</p>
            </div>

          </div>

          {/* Outputs & Analytics Visualization Panel */}
          <div className="lg:col-span-7 bg-zinc-950/80 border border-zinc-800/60 rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-2xl relative overflow-hidden">
            {/* Subtle glow background */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Main Metric Cards */}
            <div className="grid grid-cols-2 gap-4 relative z-10">
              
              {/* iROAS Output */}
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 flex flex-col gap-1 transition-all hover:bg-zinc-900/80 hover:border-zinc-700/80">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{t('simulator.metrics.iroas')}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">{simulationResults.iroas}x</span>
                  <span className="text-xs text-emerald-400 flex items-center font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12%
                  </span>
                </div>
              </div>

              {/* Conversions Output */}
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 flex flex-col gap-1 transition-all hover:bg-zinc-900/80 hover:border-zinc-700/80">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{t('simulator.metrics.conversions')}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-purple-400 font-mono drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">{simulationResults.conversions.toLocaleString()}</span>
                  <span className="text-xs text-zinc-500 font-medium">agents</span>
                </div>
              </div>

            </div>

            {/* Performance Reach Bar */}
            <div className="flex flex-col gap-2.5 relative z-10 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/40">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-semibold text-zinc-400">{t('simulator.metrics.reach')}</span>
                <span className="font-bold text-white font-mono bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">{simulationResults.reach.toLocaleString()} views</span>
              </div>
              <Progress value={Math.min((simulationResults.reach / 400000) * 100, 100)} className="h-2.5 bg-zinc-950 border border-zinc-800/80" />
            </div>

            {/* Pareto Genetic Frontier Output */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 relative z-10 transition-all hover:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-2">
                  <div className="p-1.5 bg-primary/20 rounded-md border border-primary/30">
                    <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
                  </div>
                  {t('simulator.metrics.optimal_mix')} (NSGA-II)
                </span>
                <Badge className="bg-primary/10 text-primary border-primary/30 rounded-full font-semibold text-[10px] uppercase shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.1)]">
                  Optimal
                </Badge>
              </div>

              <div className="flex flex-col gap-4">
                {/* Meta Optimization Row */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span className="font-medium text-white">Meta Ads</span>
                    <span className="font-mono text-zinc-300 font-semibold">${simulationResults.optimal.meta.toLocaleString()} <span className="text-zinc-500 ml-1">(48%)</span></span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/50">
                    <div className="bg-cyan-500 h-full rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: '48%' }} />
                  </div>
                </div>

                {/* Google Optimization Row */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span className="font-medium text-white">Google Search</span>
                    <span className="font-mono text-zinc-300 font-semibold">${simulationResults.optimal.google.toLocaleString()} <span className="text-zinc-500 ml-1">(32%)</span></span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/50">
                    <div className="bg-indigo-500 h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: '32%' }} />
                  </div>
                </div>

                {/* TikTok Optimization Row */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span className="font-medium text-white">TikTok Ads</span>
                    <span className="font-mono text-zinc-300 font-semibold">${simulationResults.optimal.tiktok.toLocaleString()} <span className="text-zinc-500 ml-1">(20%)</span></span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/50">
                    <div className="bg-purple-500 h-full rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: '20%' }} />
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 py-20 border-t border-zinc-900/50">
        <FAQAccordion />
      </section>

      <Footer />
    </div>
  )
}
