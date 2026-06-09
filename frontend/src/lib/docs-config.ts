/**
 * Docs visibility scheduling configuration.
 * Controls public access to the /docs route via admin toggle + date-range scheduling.
 */

// ── Schedule Types ─────────────────────────────────────────────────
export interface DocsSchedule {
  /** Master toggle — when false, docs are never publicly accessible */
  enabled: boolean
  /** ISO 8601 start datetime for the public availability window */
  startDate: string
  /** ISO 8601 end datetime for the public availability window */
  endDate: string
  /** When true, overrides the schedule and uses `enabled` directly for instant publish/unpublish */
  overrideActive: boolean
}

export const DEFAULT_DOCS_SCHEDULE: DocsSchedule = {
  enabled: true,
  startDate: '2026-06-10T00:00:00+06:00',
  endDate: '2026-06-14T23:59:59+06:00',
  overrideActive: true,
}

export interface DocsConfigData {
  schedule: DocsSchedule
  team_members: TeamMember[]
  pitch_sections: PitchSection[]
}

/** Server-side helper to fetch the config */
export async function getDocsConfig(): Promise<DocsConfigData> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${API_URL}/api/v1/public/docs/config`, {
      next: { revalidate: 60, tags: ['docs-config'] }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Quietly fallback when backend is offline
  }
  return {
    schedule: DEFAULT_DOCS_SCHEDULE,
    team_members: TEAM_MEMBERS,
    pitch_sections: PITCH_SECTIONS
  };
}

/**
 * Determines whether docs should be publicly accessible at the current moment.
 * Logic:
 *  1. If overrideActive → return `enabled` directly (admin instant toggle)
 *  2. If !enabled → always false
 *  3. Otherwise → check if current time falls within [startDate, endDate]
 */
export function isDocsPubliclyAvailable(schedule: DocsSchedule): boolean {
  if (schedule.overrideActive) {
    return schedule.enabled
  }

  if (!schedule.enabled) {
    return false
  }

  const now = new Date()
  const start = new Date(schedule.startDate)
  const end = new Date(schedule.endDate)

  return now >= start && now <= end
}

/**
 * Returns milliseconds until the next availability window opens.
 * Returns null if schedule is override-active or already available.
 */
export function getTimeUntilAvailable(schedule: DocsSchedule): number | null {
  if (schedule.overrideActive || !schedule.enabled) {
    return null
  }

  const now = new Date()
  const start = new Date(schedule.startDate)

  if (now >= start) {
    return null
  }

  return start.getTime() - now.getTime()
}

/** Role check: determines if a user role has admin access to docs settings */
export function isDocsAdmin(role?: string | null): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'owner' || role === 'org:admin'
}

// ── Team Data Types ────────────────────────────────────────────────
export interface TeamMember {
  id: string
  name: string
  nameBn: string
  role: string
  roleBn: string
  tags: string[]
  tagsBn: string[]
  image: string
  email?: string
  isLeader: boolean
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'jonayet',
    name: 'Jonayet Hossain',
    nameBn: 'জোনায়েত হোসেন',
    role: 'Team Leader & Project Coordinator',
    roleBn: 'টিম লিডার ও প্রকল্প সমন্বয়ক',
    tags: ['Backend Engineer', 'Database Architect', 'Scraper Engineer', 'Business Analyst', 'Data Scientist', 'Communication Lead'],
    tagsBn: ['ব্যাকএন্ড ইঞ্জিনিয়ার', 'ডাটাবেস আর্কিটেক্ট', 'স্ক্র্যাপার ইঞ্জিনিয়ার', 'বিজনেস অ্যানালিস্ট', 'ডেটা সায়েন্টিস্ট', 'কমিউনিকেশন লিড'],
    image: '/team/jonayet.jpg',
    email: 'jonayet_hossain@hotmail.com',
    isLeader: true,
  },
  {
    id: 'meheraj',
    name: 'Meheraj Alam',
    nameBn: 'মেহেরাজ আলম',
    role: 'Full-Stack & AI Engineer',
    roleBn: 'ফুল-স্ট্যাক ও এআই ইঞ্জিনিয়ার',
    tags: ['Backend Engineer', 'Frontend Developer', 'AI Engineer', 'UI/UX Designer'],
    tagsBn: ['ব্যাকএন্ড ইঞ্জিনিয়ার', 'ফ্রন্টএন্ড ডেভেলপার', 'এআই ইঞ্জিনিয়ার', 'UI/UX ডিজাইনার'],
    image: '/team/meheraj.jpg',
    email: 'maharajmd7@gmail.com',
    isLeader: false,
  },
  {
    id: 'sinthiya',
    name: 'Sinthiya Jahan',
    nameBn: 'সিনথিয়া জাহান',
    role: 'Frontend & Design Lead',
    roleBn: 'ফ্রন্টএন্ড ও ডিজাইন লিড',
    tags: ['UI/UX Designer', 'Frontend Developer', 'Presentation Lead'],
    tagsBn: ['UI/UX ডিজাইনার', 'ফ্রন্টএন্ড ডেভেলপার', 'প্রেজেন্টেশন লিড'],
    image: '/team/sinthiya.png',
    isLeader: false,
  },
]

// ── Pitch Deck Section Types ───────────────────────────────────────
export interface PitchStat {
  value: string
  label: string
  labelBn: string
}

export interface PitchSection {
  id: string
  title: string
  titleBn: string
  subtitle?: string
  subtitleBn?: string
}

export const PITCH_SECTIONS: PitchSection[] = [
  { id: 'hero', title: 'BuniOS', titleBn: 'ব্র্যান্ডওএস', subtitle: 'Predictive Marketing Intelligence for Emerging Markets', subtitleBn: 'উদীয়মান বাজারের জন্য প্রেডিক্টিভ মার্কেটিং ইন্টেলিজেন্স' },
  { id: 'problem', title: 'The Problem', titleBn: 'সমস্যা' },
  { id: 'solution', title: 'Our Solution', titleBn: 'আমাদের সমাধান' },
  { id: 'why-now', title: 'Why Now', titleBn: 'কেন এখন' },
  { id: 'product', title: 'Product Demo', titleBn: 'প্রোডাক্ট ডেমো' },
  { id: 'market', title: 'Market Opportunity', titleBn: 'বাজার সুযোগ' },
  { id: 'business', title: 'Business Model', titleBn: 'ব্যবসায়িক মডেল' },
  { id: 'traction', title: 'Traction', titleBn: 'ট্র্যাকশন' },
  { id: 'competition', title: 'Competition', titleBn: 'প্রতিযোগিতা' },
  { id: 'advantage', title: 'Unique Advantage', titleBn: 'অনন্য সুবিধা' },
  { id: 'go-to-market', title: 'Go-To-Market', titleBn: 'গো-টু-মার্কেট' },
  { id: 'team', title: 'Team', titleBn: 'টিম' },
  { id: 'vision', title: 'Vision', titleBn: 'ভিশন' },
]

// ── Architecture Diagram Mermaid Definition ────────────────────────
export const ARCHITECTURE_MERMAID = `graph TB
  subgraph L6["Layer 6: Application"]
    APP["Next.js 15 · React RSC · shadcn/ui · Chart.js · Bangla i18n"]
  end
  subgraph L5["Layer 5: LLM Orchestration"]
    LLM["LlamaIndex · GraphRAG · Claude 3.5 / Gemini Flash · Gemma4 Offline"]
  end
  subgraph L4["Layer 4: AI & Simulation"]
    AI["Bayesian MMM · ABM Mesa 3.0 · Markov Chains · NSGA-II · SHAP"]
  end
  subgraph L3["Layer 3: Storage"]
    DB["Neo4j Graph DB · Pinecone/Weaviate · BigQuery/Snowflake"]
  end
  subgraph L2["Layer 2: Ingestion"]
    ETL["Airbyte/Fivetran · Kafka/Redis · Firecrawl & Crawl4AI"]
  end
  subgraph L1["Layer 1: Data Sources"]
    DATA["Meta Ads · Google Ads · CRM · Competitor Intel · Sales Logs"]
  end

  DATA --> ETL
  ETL --> DB
  DB <--> AI
  DB <--> LLM
  AI <--> LLM
  LLM --> APP
  AI --> APP

  style L6 fill:#22c55e15,stroke:#22c55e60,color:#fff
  style L5 fill:#a855f715,stroke:#a855f760,color:#fff
  style L4 fill:#3b82f615,stroke:#3b82f660,color:#fff
  style L3 fill:#f9731615,stroke:#f9731660,color:#fff
  style L2 fill:#eab30815,stroke:#eab30860,color:#fff
  style L1 fill:#6b728015,stroke:#6b728060,color:#fff
`

export const DATAFLOW_MERMAID = `graph LR
  A["📊 Raw Data<br/>Ad Platforms, CRM, Competitor Sites"] --> B["⚙️ Ingestion<br/>ETL + Web Scraping"]
  B --> C["🗄️ Storage<br/>Neo4j + Vector DB"]
  C --> D["🧠 AI Engine<br/>Bayesian MMM + ABM + Markov"]
  D --> E["🤖 LLM Layer<br/>GraphRAG + SHAP Explainability"]
  E --> F["📱 Dashboard<br/>Visualizations + Reports"]
  F --> G["💡 Decisions<br/>Optimized Budget Allocation"]

  style A fill:#6b728020,stroke:#6b728060,color:#fff
  style B fill:#eab30820,stroke:#eab30860,color:#fff
  style C fill:#f9731620,stroke:#f9731660,color:#fff
  style D fill:#3b82f620,stroke:#3b82f660,color:#fff
  style E fill:#a855f720,stroke:#a855f760,color:#fff
  style F fill:#22c55e20,stroke:#22c55e60,color:#fff
  style G fill:#06b6d420,stroke:#06b6d460,color:#fff
`
