'use client'

import { useTranslations } from 'next-intl'
import { useState, useMemo } from 'react'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { FAQAccordion } from '@/components/marketing/FAQAccordion'
import { MarqueeBar, ParallaxText, useCardReveal, useSectionReveal } from '@/components/marketing/ScrollAnimations'
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

// Marquee items adapted to BuniOS domain
const MARQUEE_ITEMS = [
  '( PREDICTIONS )',
  '( MARKET SIGNALS )',
  '+',
  '( BUDGET OPTIMIZATION )',
  '( CAUSAL INFERENCE )',
  '+',
  '( PREDICTIONS )',
  '( MARKET SIGNALS )',
  '+',
  '( BUDGET OPTIMIZATION )',
  '( CAUSAL INFERENCE )',
  '+',
]

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

  // GSAP scroll animations
  useCardReveal('#bento-grid', '.bento-card')
  useSectionReveal('.section-reveal')

  return (
    <div className="relative min-h-screen bg-white text-[#0A0A0A] font-sans overflow-x-hidden" suppressHydrationWarning>

      <Navbar />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Top Marquee Bar */}
      <div className="pt-[65px]">
        <MarqueeBar items={MARQUEE_ITEMS} direction="left" speed={50} />
      </div>

      {/* Hero Content */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">

        {/* Parallax Background Text */}
        <div className="absolute inset-0 flex items-center overflow-hidden pointer-events-none" aria-hidden="true">
          <ParallaxText text="FORECASTS" className="opacity-[0.03]" />
        </div>

        <div className="relative z-10">
          {/* Small Label */}
          <div className="flex items-center gap-4 mb-8">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6B6B6B]">WHAT&apos;S NEXT</span>
            <div className="flex-1 h-px bg-[#E5E5E5]"></div>
            <span className="badge-pill">AI Assistant</span>
          </div>

          {/* Massive Typography */}
          <div className="mb-12">
            <h1 className="text-display" style={{ fontSize: 'clamp(3.5rem, 12vw, 10rem)' }}>
              <span className="block">
                {t('hero.title_gradient')}
              </span>
              <span className="text-[#EF4444] block">
                BRANDOS
              </span>
            </h1>
          </div>

          {/* Subtitle Row with bunny placeholder */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-12">
            {/* Bunny Placeholder */}
            <div className="bunny-placeholder w-24 h-24 md:w-32 md:h-32 rounded-2xl flex-shrink-0">
              <span className="text-4xl">🐰</span>
            </div>

            <div className="flex flex-col gap-4 max-w-xl">
              {/* <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6B6B6B]">FIND TRENDS</span> */}
              <p className="text-base md:text-lg text-[#6B6B6B] leading-relaxed">
                {t('hero.subtitle')}
              </p>
            </div>
          </div>

          {/* Massive "DO" text + CTA */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <h2 className="text-display text-[#0A0A0A]" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)' }}>
              DO
            </h2>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#simulator" className="pill-btn">
                <Sparkles className="h-4 w-4" />
                {t('hero.simulate_btn')}
              </a>
              <Link href="/docs" className="pill-btn pill-btn--outline">
                {t('hero.cta_docs')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Marquee Bar */}
      <MarqueeBar items={MARQUEE_ITEMS} direction="right" speed={40} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BENTO GRID — STRUCTURAL BLIND SPOTS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <section className="relative z-10 bg-[#F5F5F0] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">

          {/* Section Header */}
          <div className="text-center mb-16 section-reveal">
            <h2 className="text-display text-[#0A0A0A] mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
              {t('bento.title')}
            </h2>
            <p className="text-[#6B6B6B] mt-4 max-w-2xl mx-auto text-base">
              {t('bento.subtitle')}
            </p>
          </div>

          <div id="bento-grid" className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

            {/* Card 1: Cold Start Problem (Wide) */}
            <div className="bento-card md:col-span-8 editorial-card rounded-2xl p-8 flex flex-col justify-between gap-6 group">
              <div className="flex flex-col gap-3">
                <span className="badge-pill w-fit">Transfer Learning</span>
                <h3 className="text-2xl font-black text-[#0A0A0A] group-hover:text-[#EF4444] transition-colors uppercase tracking-tight">
                  {t('bento.spot1_title')}
                </h3>
                <p className="text-[#6B6B6B] leading-relaxed text-sm sm:text-base">
                  {t('bento.spot1_desc')} Includes deep cross-industry metadata matching models to build high-accuracy estimations from the very first hour.
                </p>
              </div>
              <div className="w-full bg-[#F5F5F0] rounded-xl p-4 border border-[#E5E5E5] flex items-center justify-between font-mono text-xs text-[#6B6B6B]">
                <span>propensity_weights_initialized = True</span>
                <span className="text-[#0A0A0A] font-bold">STATUS: ACTIVE</span>
              </div>
            </div>

            {/* Card 2: Linear scale fallacy */}
            <div className="bento-card md:col-span-4 editorial-card rounded-2xl p-8 flex flex-col justify-between gap-6 group">
              <div className="flex flex-col gap-3">
                <span className="badge-pill badge-pill--yellow w-fit">Hill Saturation</span>
                <h3 className="text-2xl font-black text-[#0A0A0A] group-hover:text-[#EF4444] transition-colors uppercase tracking-tight">
                  {t('bento.spot2_title')}
                </h3>
                <p className="text-[#6B6B6B] leading-relaxed text-sm">
                  {t('bento.spot2_desc')} Computes half-saturation and saturation ceilings to optimize thresholds.
                </p>
              </div>
              <div className="h-20 flex items-end gap-1 px-2 border-b border-[#E5E5E5]">
                <div className="bg-[#E5E5E5] w-full h-[20%] rounded-t-sm" />
                <div className="bg-[#E5E5E5] w-full h-[40%] rounded-t-sm" />
                <div className="bg-[#FACC15] w-full h-[65%] rounded-t-sm" />
                <div className="bg-[#FACC15] w-full h-[80%] rounded-t-sm" />
                <div className="bg-[#0A0A0A] w-full h-[88%] rounded-t-sm" />
                <div className="bg-[#0A0A0A] w-full h-[90%] rounded-t-sm" />
              </div>
            </div>

            {/* Card 3: Temporal Lag */}
            <div className="bento-card md:col-span-4 editorial-card rounded-2xl p-8 flex flex-col justify-between gap-6 group">
              <div className="flex flex-col gap-3">
                <span className="badge-pill w-fit">Adstock Transformations</span>
                <h3 className="text-2xl font-black text-[#0A0A0A] group-hover:text-[#EF4444] transition-colors uppercase tracking-tight">
                  {t('bento.spot3_title')}
                </h3>
                <p className="text-[#6B6B6B] leading-relaxed text-sm">
                  {t('bento.spot3_desc')} Decays campaign effects over custom memory coefficients.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-[#6B6B6B]">
                <span className="text-[#0A0A0A] font-bold">λ = 0.72</span>
                <span>100% → 72% → 51% → 37%</span>
              </div>
            </div>

            {/* Card 4: Cookie deprecation (Wide) */}
            <div className="bento-card md:col-span-8 editorial-card rounded-2xl p-8 flex flex-col justify-between gap-6 group">
              <div className="flex flex-col gap-3">
                <span className="badge-pill badge-pill--yellow w-fit">Causal Modeling</span>
                <h3 className="text-2xl font-black text-[#0A0A0A] group-hover:text-[#EF4444] transition-colors uppercase tracking-tight">
                  {t('bento.spot4_title')}
                </h3>
                <p className="text-[#6B6B6B] leading-relaxed text-sm sm:text-base">
                  {t('bento.spot4_desc')} Uses aggregate statistical models and Markov chains. Zero reliance on third-party cookies or intrusive mobile device trackers.
                </p>
              </div>
              <div className="w-full bg-[#F5F5F0] rounded-xl p-4 border border-[#E5E5E5] flex items-center justify-between text-xs font-semibold text-[#6B6B6B]">
                <span className="flex items-center gap-1.5 text-[#0A0A0A]">
                  <ShieldCheck className="h-4 w-4" />
                  100% GDPR / CCPA Compliant
                </span>
                <span>No Cookies Used</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* INTERACTIVE CAUSAL PIPELINE EXPLORER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <section className="relative z-10 py-20 md:py-28 border-t border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto px-4 md:px-8">

          <div className="text-center mb-16 section-reveal">
            <div className="inline-flex items-center gap-2 badge-pill mb-4">
              <Workflow className="h-3.5 w-3.5" />
              <span>Process Map</span>
            </div>
            <h2 className="text-display text-[#0A0A0A] mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              {t('pipeline.title')}
            </h2>
            <p className="text-[#6B6B6B] mt-4 max-w-2xl mx-auto">
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
                    className={`text-left p-4 rounded-xl border transition-all duration-300 flex items-start gap-4 ${isActive
                        ? 'bg-[#0A0A0A] border-[#0A0A0A] text-white shadow-lg'
                        : 'bg-white border-[#E5E5E5] text-[#6B6B6B] hover:border-[#0A0A0A]'
                      }`}
                  >
                    <span className={`h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border transition-all duration-300 ${isActive
                        ? 'bg-[#FACC15] border-[#FACC15] text-[#0A0A0A]'
                        : 'bg-[#F5F5F0] border-[#E5E5E5] text-[#6B6B6B]'
                      }`}>
                      {step.id + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className={`font-bold text-sm ${isActive ? 'text-white' : 'text-[#0A0A0A]'}`}>{step.label}</span>
                      <span className={`text-[11px] leading-tight ${isActive ? 'text-white/70' : 'text-[#6B6B6B]'}`}>{step.desc}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Right Column: Visualization Canvas */}
            <div className="lg:col-span-7 editorial-card rounded-2xl p-6 sm:p-8 min-h-[380px] flex flex-col justify-between shadow-lg w-full">
              {activeStep === 0 && (
                <div className="flex flex-col gap-4 h-full animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="badge-pill text-[10px]">Firecrawl Ingestion</span>
                    <span className="text-[10px] text-[#0A0A0A] font-mono flex items-center gap-1 font-bold"><span className="h-1.5 w-1.5 bg-[#FACC15] rounded-full animate-pulse" />LIVE STREAMING</span>
                  </div>
                  <div className="bg-[#F5F5F0] font-mono text-[10px] rounded-xl p-4 border border-[#E5E5E5] text-[#6B6B6B] h-[220px] overflow-y-auto space-y-1.5 leading-normal">
                    <p className="text-[#999]">[01:28:02] Initializing Firecrawl headless scraper...</p>
                    <p className="text-[#0A0A0A]">GET https://competitor-a.com/pricing-plans {"->"} 200 OK</p>
                    <p className="text-[#6B6B6B]">└─ Extracted Table: Starter ($19), Growth ($49), Enterprise ($149)</p>
                    <p className="text-[#EF4444]">POST https://api.crawl4ai/analyze-creative {"->"} 200 OK</p>
                    <p className="text-[#6B6B6B]">└─ Parsed 8 ad copy assets; computed token weight = 0.82</p>
                    <p className="text-[#0A0A0A] font-bold">✓ Ingestion complete. Synced 42 parameters to TimescaleDB.</p>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">Crawls competitor pages dynamically, bypasses bot detection mechanisms, and converts unstructured layouts into formatted analytical rows.</p>
                </div>
              )}

              {activeStep === 1 && (
                <div className="flex flex-col gap-4 h-full animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="badge-pill badge-pill--yellow text-[10px]">Bayesian MMM (PyMC)</span>
                    <span className="text-xs font-semibold text-[#6B6B6B]">Adstock Decay: <span className="font-mono text-[#0A0A0A] font-bold">{decayRate}</span></span>
                  </div>

                  {/* SVG Curve chart */}
                  <div className="bg-[#F5F5F0] border border-[#E5E5E5] rounded-xl p-4 flex items-center justify-center relative overflow-hidden h-[180px]">
                    <svg className="w-full h-full" viewBox="0 0 200 100">
                      <line x1="0" y1="90" x2="200" y2="90" stroke="#E5E5E5" strokeWidth="1" />
                      <line x1="10" y1="0" x2="10" y2="100" stroke="#E5E5E5" strokeWidth="1" />

                      <path
                        d={`M 10 20 C 60 ${20 + decayRate * 60}, 120 ${80 - (1 - decayRate) * 40}, 190 90`}
                        fill="none"
                        stroke="#0A0A0A"
                        strokeWidth="3.5"
                        className="transition-all duration-350"
                      />
                    </svg>

                    <div className="absolute bottom-2 right-4 left-4 bg-white border border-[#E5E5E5] p-2 rounded-lg flex items-center gap-3">
                      <span className="text-[10px] text-[#6B6B6B] uppercase font-bold tracking-wider">Adjust Delay</span>
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

                  <p className="text-xs text-[#6B6B6B]">Estimates non-linear saturation curves and carries over ad awareness across days. Evaluates decay delay factors to isolate organic baselines.</p>
                </div>
              )}

              {activeStep === 2 && (
                <div className="flex flex-col gap-4 h-full animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="badge-pill text-[10px]">Mesa Agent Simulation</span>
                    <span className="text-[10px] text-[#6B6B6B] font-semibold font-mono">1,024 AGENTS ACTIVE</span>
                  </div>

                  <div className="bg-[#F5F5F0] border border-[#E5E5E5] rounded-xl p-6 flex flex-wrap gap-2.5 items-center justify-center h-[180px]">
                    {Array.from({ length: 48 }).map((_, idx) => {
                      const isConverted = (idx * 17) % 7 === 0 || (idx * 23) % 9 === 0
                      const isExposed = !isConverted && ((idx * 31) % 5 === 0)
                      return (
                        <span
                          key={idx}
                          className={`h-3 w-3 rounded-full transition-all duration-500 ${isConverted
                              ? 'bg-[#FACC15] shadow-[0_0_10px_rgba(250,204,21,0.6)] animate-pulse'
                              : isExposed
                                ? 'bg-[#0A0A0A]/30'
                                : 'bg-[#E5E5E5]'
                            }`}
                        />
                      )
                    })}
                  </div>

                  <p className="text-xs text-[#6B6B6B]">Simulates discrete actions (word-of-mouth diffusion, coupon triggers, churn decisions) to evaluate how ad impressions scale exponentially in customer cohorts.</p>
                </div>
              )}

              {activeStep === 3 && (
                <div className="flex flex-col gap-4 h-full animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="badge-pill badge-pill--yellow text-[10px]">NSGA-II Genetic Optimizer</span>
                    <span className="text-[10px] text-[#6B6B6B] font-bold font-mono">CONVERGED AT GEN 250</span>
                  </div>

                  <div className="bg-[#F5F5F0] border border-[#E5E5E5] rounded-xl p-4 flex items-center justify-center h-[180px]">
                    <svg className="w-full h-full" viewBox="0 0 200 100">
                      <line x1="10" y1="90" x2="190" y2="90" stroke="#E5E5E5" strokeWidth="1" />
                      <line x1="20" y1="10" x2="20" y2="90" stroke="#E5E5E5" strokeWidth="1" />

                      <circle cx="50" cy="70" r="3" fill="#E5E5E5" />
                      <circle cx="70" cy="55" r="3" fill="#E5E5E5" />
                      <circle cx="85" cy="65" r="3" fill="#E5E5E5" />
                      <circle cx="110" cy="45" r="3" fill="#E5E5E5" />
                      <circle cx="130" cy="60" r="3" fill="#E5E5E5" />

                      <path d="M 40 30 Q 95 32 160 55" fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="3 3" />

                      <circle cx="40" cy="30" r="4.5" fill="#EF4444" className="animate-pulse" />
                      <circle cx="95" cy="32" r="4.5" fill="#EF4444" className="animate-pulse" />
                      <circle cx="160" cy="55" r="4.5" fill="#EF4444" className="animate-pulse" />

                      <text x="45" y="24" fill="#6B6B6B" fontSize="7" fontFamily="monospace">Point A (Max ROI)</text>
                      <text x="110" y="28" fill="#6B6B6B" fontSize="7" fontFamily="monospace">Point B (Balanced)</text>
                    </svg>
                  </div>

                  <p className="text-xs text-[#6B6B6B]">Runs multi-objective evolutionary calculations to output a Pareto curve. Resolves conflict boundaries between maximum ROAS yield and lowest risk variance.</p>
                </div>
              )}

              {activeStep === 4 && (
                <div className="flex flex-col gap-4 h-full animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="badge-pill text-[10px]">Neo4j GraphRAG</span>
                    <div className="flex gap-2">
                      {['brand', 'campaign', 'metric'].map((node) => (
                        <button
                          key={node}
                          type="button"
                          onClick={() => setSelectedGraphNode(node)}
                          className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded border transition-all ${selectedGraphNode === node
                              ? 'bg-[#FACC15] border-[#FACC15] text-[#0A0A0A]'
                              : 'bg-white border-[#E5E5E5] text-[#6B6B6B] hover:border-[#0A0A0A]'
                            }`}
                        >
                          {node}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#F5F5F0] border border-[#E5E5E5] rounded-xl p-4 flex items-center justify-center relative overflow-hidden h-[180px]">
                    <svg className="w-full h-full" viewBox="0 0 200 100">
                      <line x1="100" y1="50" x2="40" y2="30" stroke={selectedGraphNode === 'brand' ? '#0A0A0A' : '#E5E5E5'} strokeWidth="1.5" className="transition-colors duration-300" />
                      <line x1="100" y1="50" x2="160" y2="30" stroke={selectedGraphNode === 'campaign' ? '#0A0A0A' : '#E5E5E5'} strokeWidth="1.5" className="transition-colors duration-300" />
                      <line x1="100" y1="50" x2="100" y2="90" stroke={selectedGraphNode === 'metric' ? '#0A0A0A' : '#E5E5E5'} strokeWidth="1.5" className="transition-colors duration-300" />

                      <circle cx="100" cy="50" r="12" fill="#0A0A0A" stroke="#0A0A0A" strokeWidth="2" />
                      <text x="100" y="53" fill="#FFFFFF" fontSize="6" fontWeight="bold" textAnchor="middle">BuniOS</text>

                      <circle cx="40" cy="30" r="10" fill={selectedGraphNode === 'brand' ? '#FACC15' : '#F5F5F0'} stroke={selectedGraphNode === 'brand' ? '#0A0A0A' : '#E5E5E5'} strokeWidth="1.5" className="transition-colors duration-300" />
                      <text x="40" y="32" fill="#0A0A0A" fontSize="5" textAnchor="middle">Competitor</text>

                      <circle cx="160" cy="30" r="10" fill={selectedGraphNode === 'campaign' ? '#FACC15' : '#F5F5F0'} stroke={selectedGraphNode === 'campaign' ? '#0A0A0A' : '#E5E5E5'} strokeWidth="1.5" className="transition-colors duration-300" />
                      <text x="160" y="32" fill="#0A0A0A" fontSize="5" textAnchor="middle">Campaign</text>

                      <circle cx="100" cy="90" r="10" fill={selectedGraphNode === 'metric' ? '#FACC15' : '#F5F5F0'} stroke={selectedGraphNode === 'metric' ? '#0A0A0A' : '#E5E5E5'} strokeWidth="1.5" className="transition-colors duration-300" />
                      <text x="100" y="92" fill="#0A0A0A" fontSize="5" textAnchor="middle">iROAS</text>
                    </svg>
                  </div>

                  <p className="text-xs text-[#6B6B6B]">Maps structural connections between variables, campaigns, and competitor nodes. Retains cross-market context to feed deterministic parameters to localized summaries.</p>
                </div>
              )}

              {(activeStep === 5) && (
                <div className="flex flex-col gap-4 h-full animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="badge-pill text-[10px]">SHAP TreeExplainer</span>
                    <span className="text-[10px] text-[#6B6B6B] font-bold font-mono">BIAS STABILITY: 99.8%</span>
                  </div>

                  <div className="bg-[#F5F5F0] border border-[#E5E5E5] rounded-xl p-4 flex flex-col gap-3 justify-center h-[180px] text-xs">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[#6B6B6B] text-[10px]">
                        <span>Adstock Memory Carryover</span>
                        <span className="text-[#0A0A0A] font-bold font-mono">+0.42</span>
                      </div>
                      <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#0A0A0A] h-full rounded-full" style={{ width: '70%' }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[#6B6B6B] text-[10px]">
                        <span>Competitor Price Discount</span>
                        <span className="text-[#EF4444] font-bold font-mono">-0.18</span>
                      </div>
                      <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#EF4444] h-full rounded-full" style={{ width: '30%' }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[#6B6B6B] text-[10px]">
                        <span>Temporal Lag Adjustment</span>
                        <span className="text-[#0A0A0A] font-bold font-mono">+0.15</span>
                      </div>
                      <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#FACC15] h-full rounded-full" style={{ width: '25%' }} />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#6B6B6B]">Guarantees execution safety by proving feature impact coefficients. Eliminates model hallucination vectors for deterministic reports.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* INTERACTIVE SANDBOX SIMULATOR */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <section id="simulator" className="relative z-10 bg-[#F5F5F0] py-20 md:py-28 border-t border-[#E5E5E5]">

        {/* Parallax background */}
        <div className="absolute inset-0 flex items-center overflow-hidden pointer-events-none" aria-hidden="true">
          <ParallaxText text="SIMULATE" className="opacity-[0.02]" />
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10">
          <div className="text-center mb-12 section-reveal">
            <h2 className="text-display text-[#0A0A0A] mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              {t('simulator.title')}
            </h2>
            <p className="text-[#6B6B6B] mt-4 max-w-2xl mx-auto text-sm sm:text-base">
              {t('simulator.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* Sliders Input Panel */}
            <div className="lg:col-span-5 editorial-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-8 shadow-lg">

              {/* Meta Ads Slider */}
              <div className="flex flex-col gap-4 group">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-[#0A0A0A] uppercase tracking-wide text-xs">{t('simulator.meta_ads')}</span>
                  <span className="font-bold text-[#0A0A0A] font-mono bg-[#F5F5F0] px-2.5 py-1 rounded-md border border-[#E5E5E5]">৳{metaBudget.toLocaleString()}</span>
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
                  <span className="font-semibold text-[#0A0A0A] uppercase tracking-wide text-xs">{t('simulator.google_search')}</span>
                  <span className="font-bold text-[#0A0A0A] font-mono bg-[#F5F5F0] px-2.5 py-1 rounded-md border border-[#E5E5E5]">৳{googleBudget.toLocaleString()}</span>
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
                  <span className="font-semibold text-[#0A0A0A] uppercase tracking-wide text-xs">{t('simulator.tiktok_ads')}</span>
                  <span className="font-bold text-[#0A0A0A] font-mono bg-[#F5F5F0] px-2.5 py-1 rounded-md border border-[#E5E5E5]">৳{tiktokBudget.toLocaleString()}</span>
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
              <div className="text-xs text-[#6B6B6B] border-t border-[#E5E5E5] pt-4 flex items-start gap-2 mt-4">
                <Cpu className="h-4 w-4 shrink-0 text-[#0A0A0A]" />
                <p>{t('simulator.explanation')}</p>
              </div>

            </div>

            {/* Outputs & Analytics Panel */}
            <div className="lg:col-span-7 editorial-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-lg relative overflow-hidden">

              {/* Main Metric Cards */}
              <div className="grid grid-cols-2 gap-4 relative z-10">

                {/* iROAS Output */}
                <div className="bg-[#F5F5F0] border border-[#E5E5E5] rounded-xl p-5 flex flex-col gap-1 transition-all hover:border-[#0A0A0A]">
                  <span className="text-xs text-[#6B6B6B] font-semibold uppercase tracking-wider">{t('simulator.metrics.iroas')}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black text-[#0A0A0A] font-mono">{simulationResults.iroas}x</span>
                    <span className="text-xs text-[#0A0A0A] flex items-center font-medium bg-[#FACC15] px-1.5 py-0.5 rounded-full">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +12%
                    </span>
                  </div>
                </div>

                {/* Conversions Output */}
                <div className="bg-[#F5F5F0] border border-[#E5E5E5] rounded-xl p-5 flex flex-col gap-1 transition-all hover:border-[#0A0A0A]">
                  <span className="text-xs text-[#6B6B6B] font-semibold uppercase tracking-wider">{t('simulator.metrics.conversions')}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black text-[#0A0A0A] font-mono">{simulationResults.conversions.toLocaleString()}</span>
                    <span className="text-xs text-[#6B6B6B] font-medium">agents</span>
                  </div>
                </div>

              </div>

              {/* Performance Reach Bar */}
              <div className="flex flex-col gap-2.5 relative z-10 bg-[#F5F5F0] p-4 rounded-xl border border-[#E5E5E5]">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="font-semibold text-[#6B6B6B] uppercase tracking-wide text-xs">{t('simulator.metrics.reach')}</span>
                  <span className="font-bold text-[#0A0A0A] font-mono bg-white px-2 py-0.5 rounded-md border border-[#E5E5E5]">{simulationResults.reach.toLocaleString()} views</span>
                </div>
                <Progress value={Math.min((simulationResults.reach / 400000) * 100, 100)} className="h-2.5 bg-[#E5E5E5]" />
              </div>

              {/* Pareto Genetic Frontier Output */}
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 sm:p-6 flex flex-col gap-5 relative z-10 transition-all hover:border-[#0A0A0A]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#0A0A0A] font-bold uppercase tracking-wider flex items-center gap-2">
                    <div className="p-1.5 bg-[#FACC15] rounded-md">
                      <Activity className="h-3.5 w-3.5 text-[#0A0A0A]" />
                    </div>
                    {t('simulator.metrics.optimal_mix')} (NSGA-II)
                  </span>
                  <span className="badge-pill badge-pill--yellow text-[10px]">
                    Optimal
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Meta Optimization Row */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span className="font-medium text-[#0A0A0A]">Meta Ads</span>
                      <span className="font-mono text-[#0A0A0A] font-semibold">৳{simulationResults.optimal.meta.toLocaleString()} <span className="text-[#6B6B6B] ml-1">(48%)</span></span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#0A0A0A] h-full rounded-full" style={{ width: '48%' }} />
                    </div>
                  </div>

                  {/* Google Optimization Row */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span className="font-medium text-[#0A0A0A]">Google Search</span>
                      <span className="font-mono text-[#0A0A0A] font-semibold">৳{simulationResults.optimal.google.toLocaleString()} <span className="text-[#6B6B6B] ml-1">(32%)</span></span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#FACC15] h-full rounded-full" style={{ width: '32%' }} />
                    </div>
                  </div>

                  {/* TikTok Optimization Row */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span className="font-medium text-[#0A0A0A]">TikTok Ads</span>
                      <span className="font-mono text-[#0A0A0A] font-semibold">৳{simulationResults.optimal.tiktok.toLocaleString()} <span className="text-[#6B6B6B] ml-1">(20%)</span></span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#EF4444] h-full rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FAQ SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <section className="relative z-10 py-20 md:py-28 border-t border-[#E5E5E5]">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <FAQAccordion />
        </div>
      </section>

      <Footer />
    </div>
  )
}
