'use client'

import { ARCHITECTURE_MERMAID } from '@/lib/docs-config'
import { DOCS_DATA } from '@/lib/docs-data'
import { TeamSection } from './TeamSection'
import dynamic from 'next/dynamic'
import { Activity, ArrowRight, Users, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocsConfigData } from '@/lib/docs-config'
import { LiveMetricsSection } from './LiveMetricsSection'

const ArchitectureDiagram = dynamic(
  () => import('./ArchitectureDiagram').then((mod) => mod.ArchitectureDiagram),
  { ssr: false }
)

interface Props {
  locale: 'en' | 'bn'
  onSwitchMode: () => void
  config: DocsConfigData
}

export function PitchDeck({ locale, onSwitchMode, config }: Props) {
  // Helper to get text based on locale
  const t = (enText: string, bnText: string) => locale === 'bn' ? bnText : enText

  return (
    <div className="flex flex-col w-full snap-y snap-mandatory overflow-y-auto h-[calc(100vh-64px)] scroll-smooth pb-32">
      
      {/* 1. HERO SECTION */}
      <section id="hero" className="shrink-0 min-h-[calc(100vh-64px)] flex items-center justify-center snap-start relative px-6 py-20 border-b border-border/20">
        <div className="absolute inset-0 cinematic-mesh-container">
          <div className="cinematic-mesh cinematic-mesh--emerald" />
          <div className="cinematic-mesh cinematic-mesh--teal" />
          <div className="cinematic-grain" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>Infinity AI BuildFest 2026</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
            {t('BuniOS', 'ব্র্যান্ডওএস')}
          </h1>
          <p className="text-xl md:text-3xl text-muted-foreground font-medium mb-10 text-balance leading-snug">
            {t('Predictive Marketing Intelligence for Emerging Markets', 'উদীয়মান বাজারের জন্য প্রেডিক্টিভ মার্কেটিং ইন্টেলিজেন্স')}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="rounded-full text-base h-12 px-8" onClick={() => document.getElementById('problem')?.scrollIntoView()}>
              {t('View Pitch Deck', 'পিচ ডেক দেখুন')}
            </Button>
            <Button size="lg" variant="outline" className="rounded-full text-base h-12 px-8" onClick={onSwitchMode}>
              {t('Read Whitepaper', 'হোয়াইটপেপার পড়ুন')}
            </Button>
          </div>
        </div>
      </section>

      {/* 2. PROBLEM SECTION */}
      <section id="problem" className="shrink-0 min-h-[calc(100vh-64px)] flex items-center snap-start relative px-6 py-24 bg-muted/10 border-b border-border/20">
        <div className="max-w-6xl mx-auto w-full">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-16 text-center">
            {t('The Problem', 'সমস্যা')}
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-primary">
                {t('SMEs are flying blind.', 'SME-গুলো অন্ধভাবে এগোচ্ছে।')}
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t(
                  "Bangladesh's rapidly digitizing SME sector invests massive capital into Meta, Google, and TikTok. Yet, they allocate budgets based on intuition and retrospective vanity metrics, not mathematics.",
                  "বাংলাদেশের দ্রুত ডিজিটাল হওয়া SME খাত Meta, Google ও TikTok-এ বিপুল পুঁজি বিনিয়োগ করছে। কিন্তু তারা বাজেট নির্ধারণ করে অনুমানের ভিত্তিতে, গণিতের ভিত্তিতে নয়।"
                )}
              </p>
              <ul className="space-y-4 mt-8">
                {[
                  t("Enterprise tools (MTA) are broken by privacy laws.", "এন্টারপ্রাইজ টুলগুলো প্রাইভেসি আইনের কারণে অকেজো।"),
                  t("Cold-start failures for new campaigns.", "নতুন ক্যাম্পেইনের জন্য কোল্ড-স্টার্ট ব্যর্থতা।"),
                  t("Linear scalability fallacies waste budget.", "লিনিয়ার স্কেলাবিলিটির ভুল ধারণায় বাজেট অপচয়।"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 rounded-full p-1 bg-destructive/10 text-destructive">
                      <XIcon className="w-4 h-4" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative h-[400px] rounded-2xl bg-card border border-border/40 p-8 shadow-2xl overflow-hidden flex flex-col items-center justify-center text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent opacity-50" />
              <div className="relative z-10">
                <div className="text-7xl font-black text-destructive mb-4">0%</div>
                <div className="text-xl text-muted-foreground font-medium">
                  {t('Predictive capacity in current SME tools', 'বর্তমান SME টুলগুলোতে প্রেডিক্টিভ সক্ষমতা')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SOLUTION SECTION */}
      <section id="solution" className="shrink-0 min-h-[calc(100vh-64px)] flex items-center snap-start relative px-6 py-24 border-b border-border/20">
        <div className="max-w-6xl mx-auto w-full text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            {t('Our Solution', 'আমাদের সমাধান')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-16">
            {t('A triple-engine predictive simulation stack replacing guesswork with causal mathematics.', 'একটি ট্রিপল-ইঞ্জিন প্রেডিক্টিভ সিমুলেশন স্ট্যাক যা অনুমানের বদলে ব্যবহার করে কার্যকারণভিত্তিক গণিত।')}
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              {
                icon: <Activity className="w-8 h-8 text-blue-500" />,
                title: t('Bayesian MMM', 'বেসিয়ান MMM'),
                desc: t('Econometrically sound macro-budget forecasting with Adstock & Hill S-curves.', 'অ্যাডস্টক ও হিল কার্ভ ব্যবহার করে ইকোনোমেট্রিক ম্যাক্রো-বাজেট ফোরকাস্টিং।')
              },
              {
                icon: <Users className="w-8 h-8 text-emerald-500" />,
                title: t('Agent-Based Modeling', 'এজেন্ট-বেসড মডেলিং'),
                desc: t('Micro-simulation of autonomous consumer agents to capture targeted cohort behaviors.', 'ক্রেতা আচরণের মাইক্রো-সিমুলেশন যা নির্দিষ্ট কোহর্ট আচরণ ক্যাপচার করে।')
              },
              {
                icon: <Zap className="w-8 h-8 text-amber-500" />,
                title: t('GraphRAG + NSGA-II', 'GraphRAG + NSGA-II'),
                desc: t('Genetic algorithms find the Pareto frontier, explained deterministically via Neo4j & SHAP.', 'জেনেটিক অ্যালগরিদম প্যার্যাটো ফ্রন্টিয়ার খুঁজে বের করে, যা Neo4j ও SHAP দ্বারা ব্যাখ্যা করা হয়।')
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl bg-card border border-border/40 hover:border-primary/30 transition-colors shadow-sm">
                <div className="p-4 bg-muted/50 w-fit rounded-xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. LIVE METRICS SECTION */}
      <section id="metrics" className="shrink-0 min-h-[calc(100vh-64px)] flex items-center snap-start relative px-6 py-24 bg-muted/5 border-b border-border/20">
        <div className="max-w-6xl mx-auto w-full text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            {t('Live Platform Scale', 'লাইভ প্ল্যাটফর্ম স্কেল')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-16">
            {t('Real-time aggregate data from the Prediction Engine infrastructure.', 'প্রেডিকশন ইঞ্জিন পরিকাঠামো থেকে রিয়েল-টাইম ডেটা।')}
          </p>
          <LiveMetricsSection locale={locale} />
        </div>
      </section>

      {/* UNIQUE ADVANTAGE (Architecture) */}
      <section id="advantage" className="shrink-0 min-h-[calc(100vh-64px)] flex items-center snap-start relative px-6 py-24 border-b border-border/20">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              {t('Architecture', 'আর্কিটেকচার')}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('Six decoupled layers processing real-time signals into predictive insights.', 'ছয়টি ডিকাপলড লেয়ার রিয়েল-টাইম সিগন্যালকে প্রেডিক্টিভ ইনসাইটে রূপান্তর করে।')}
            </p>
          </div>
          <div className="w-full max-w-4xl mx-auto">
            <ArchitectureDiagram id="main-arch" chart={ARCHITECTURE_MERMAID} />
          </div>
        </div>
      </section>

      {/* TEAM SECTION */}
      <section id="team" className="shrink-0 min-h-[calc(100vh-64px)] flex items-center snap-start relative px-6 py-24 bg-muted/5 border-b border-border/20">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              {t('Core Team', 'কোর টিম')}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('The engineers and architects building BuniOS.', 'ব্র্যান্ডওএস-এর নির্মাতা ইঞ্জিনিয়ার ও আর্কিটেক্টবৃন্দ।')}
            </p>
          </div>
          <TeamSection locale={locale} teamMembers={config.team_members} />
        </div>
      </section>

      {/* VISION / CTA SECTION */}
      <section id="vision" className="shrink-0 min-h-[calc(50vh)] flex flex-col justify-center items-center snap-start relative px-6 py-24 text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8 max-w-3xl leading-tight">
          {t("Transitioning marketing from a reactive cost center to a predictive revenue driver.", "মার্কেটিংকে একটি রিঅ্যাকটিভ কস্ট সেন্টার থেকে প্রেডিক্টিভ রেভেনিউ ড্রাইভারে রূপান্তর করা।")}
        </h2>
        <Button size="lg" className="rounded-full text-lg h-14 px-10 shadow-xl shadow-primary/20" onClick={onSwitchMode}>
          {t('Read Full Technical Whitepaper', 'সম্পূর্ণ টেকনিক্যাল হোয়াইটপেপার পড়ুন')} <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </section>

    </div>
  )
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
