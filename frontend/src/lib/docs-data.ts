export interface DocArticle {
  slug: string
  category: string
  title: {
    en: string
    bn: string
  }
  content: {
    en: string
    bn: string
  }
}

export const DOCS_DATA: DocArticle[] = [
  {
    slug: 'getting-started',
    category: 'getting_started',
    title: {
      en: 'Getting Started',
      bn: 'শুরু করা',
    },
    content: {
      en: `
# Getting Started with InfinitySim

Welcome to the **InfinitySim (Brand Simulation Engine)**, a state-of-the-art, graph-augmented Bayesian simulation platform designed specifically for SME marketing intelligence in emerging markets like Bangladesh.

## Resolving the Four Structural Blind Spots

Traditional marketing attribution models like Multi-Touch Attribution (MTA) fail in walled gardens. InfinitySim addresses these limits:
1. **Cold-Start Failure**: Uses Transfer Learning and meta-learning neural networks to estimate parameters for new product lines without historical data.
2. **Linear Scalability Fallacy**: Applies Hill S-Curves to predict exactly when scaling ad budgets hits diminishing returns.
3. **Temporal Lag Neglect**: Models adstock memory retention and delay carries across consumer paths.
4. **Walled Gardens**: Eliminates cookie-tracking using Top-Down Bayesian MMM coupled with bottom-up Agent-Based cohorts.

## 6-Layer Architecture Stack

InfinitySim executes across a highly decoupled event-driven stack:
- **Layer 1: Data Sources**: Endogenous (ad spends, impressions), Exogenous (competitor proxy indices scraped via Firecrawl & Crawl4AI), and Transactional sales data.
- **Layer 2: Ingestion & Processing**: Message queues (Kafka, Redis Pub/Sub) and automated ETL processing (Airbyte/Fivetran).
- **Layer 3: Storage**: Neo4j Graph Database (semantic nodes and edges), Pinecone/Weaviate (vector store for ad creative embeddings), and Postgres/BigQuery.
- **Layer 4: AI & Simulation Engine**: Bayesian MMM via PyMC-Marketing, Agent-Based modeling via Mesa 3.0, NSGA-II Genetic algorithms (pymoo), and SHAP TreeExplainer.
- **Layer 5: LLM Orchestration**: LlamaIndex GraphRAG translation, Claude 3.5 Sonnet / Gemini Flash, and local offline Ollama Qwen3-8B fallback (with Fast/Deep profiles).
- **Layer 6: Application Layer**: Next.js 15 App Router, Clerk Auth, and dynamic charts (Lightweight Charts & Chart.js).
      `,
      bn: `
# শুরু করা — ওরিয়েন্টেশন

**InfinitySim (ব্র্যান্ড সিমুলেশন ইঞ্জিন)** প্ল্যাটফর্মে আপনাকে স্বাগতম। এটি একটি উন্নত, গ্রাফ-অগমেন্টেড বেসিয়ান সিমুলেশন প্ল্যাটফর্ম যা বাংলাদেশ সহ দক্ষিণ এশিয়ার বিকাশমান বাজারে ক্ষুদ্র ও মাঝারি উদ্যোক্তাদের (SME) মার্কেটিং বাজেট অপ্টিমাইজ করার উদ্দেশ্যে তৈরি করা হয়েছে।

## ৪টি প্রধান স্ট্রাকচারাল ব্লাইন্ড স্পট সমাধান

প্রচলিত মাল্টি-টাচ অ্যাট্রিবিউশন (MTA) মডেলগুলি বর্তমান প্রাইভেসি রেগুলেশন ও কুঁকিহীন ব্রাউজিংয়ে অচল। InfinitySim এগুলো যেভাবে সমাধান করে:
১. **কোল্ড-স্টার্ট ব্যর্থতা (Cold-Start)**: ট্রান্সফার লার্নিং ও মেটা-লার্নিং নিউরাল নেটওয়ার্ক ব্যবহার করে পূর্বের কোনো ইতিহাস ছাড়াই নতুন ক্যাম্পেইনের ফলাফল অনুমান করা।
২. **লিনিয়ার স্কেলিং ফ্যালাসি (Linear Scale)**: হিল স্যাচুরেশন কার্ভ প্রয়োগ করে অতিরিক্ত বিজ্ঞাপন ব্যয়ের স্যাচুরেশন থ্রেশহোল্ড নির্ধারণ করা।
৩. **টেম্পোরাল ল্যাগ অবহেলা (Temporal Lag)**: বিজ্ঞাপনের তাৎক্ষণিক প্রতিক্রিয়া ও সময়ের সাথে সাথে ব্র্যান্ড সচেতনতা কমে আসার গতি (Adstock) ট্র্যাক করা।
৪. **ওয়াল্ড গার্ডেন (Walled Gardens)**: থার্ড-পার্টি কুঁকি ট্র্যাকিং বাদ দিয়ে সামষ্টিক বেসিয়ান স্ট্যাটিস্টিকস ও মেসা এজেন্ট সিমুলেশনের সমন্বয়।

## ৬-স্তর বিশিষ্ট সিস্টেম আর্কিটেকচার

InfinitySim সম্পূর্ণ ডিকাপলড স্ট্যাকের ওপর কাজ করে:
- **স্তর ১: ডেটা সোর্স (Data Sources)**: কোম্পানির নিজস্ব এড বাজেট, উইন্ডো ক্রিয়েটিভস এবং ফায়ারক্রল (Firecrawl/Crawl4AI) দিয়ে সংগ্রহ করা প্রতিযোগীদের ডেটা।
- **স্তর ২: ইনজেসশন (Ingestion)**: ফাস্ট এপিআই, কাফকা ও রেডিস পাব/সাব মেসেজ কিউ।
- **স্তর ৩: স্টোরেজ (Storage)**: নিও ফোর জে (Neo4j Graph), উইভিয়েট (Weaviate Vector) এবং পোস্টগ্রেস।
- **স্তর ৪: এআই ও সিমুলেশন (AI & Simulation)**: PyMC-Marketing চালিত বেসিয়ান এমএমএম, মেসা ৩.০ এজেন্ট সিমুলেশন এবং NSGA-II জেনেটিক অ্যালগরিদম।
- **স্তর ৫: এলএলএম স্তর (LLM Orchestration)**: LlamaIndex গ্রাফ র‍্যাগ, জেমিনাই ফ্ল্যাশ এবং ইন্টারনেটবিহীন প্রত্যন্ত অঞ্চলের জন্য লোকাল ওলামা Qwen3-8B মডেল।
- **স্তর ৬: অ্যাপ্লিকেশন স্তর (Application)**: নেক্সট জেএস ১৫ ফ্রন্টএন্ড, ক্লার্ক অথ এবং লাইটওয়েট চার্টস।
      `,
    },
  },
  {
    slug: 'installation',
    category: 'getting_started',
    title: {
      en: 'Installation Guide',
      bn: 'ইন্সটলেশন গাইড',
    },
    content: {
      en: `
# Installation Guide

Follow these steps to set up the Brand Simulation Engine locally in your environment.

## Prerequisites

- **Docker Compose** v2+ (Required for PostgreSQL, Redis, Neo4j, and Weaviate DBs).
- **Node.js** v20+.
- **Python** v3.11+ (Required for PyMC and Mesa simulation environments).
- **Ollama** (Optional, for running local Qwen3-8B fallback model).

## Step-by-Step Setup

### 1. Database Provisioning
Run docker compose to initialize database containers in the background:
\`\`\`bash
docker compose up -d
\`\`\`

### 2. Dependency Setup
Run the automated installation script to configure Python virtual environments and install Next.js dependencies:
\`\`\`bash
# For Unix systems
./install.sh

# For Windows systems
.\\install.ps1
\`\`\`

### 3. Neo4j Constrains and Seeding
Create constraints and load initial marketing domain nodes:
\`\`\`bash
python scripts/create_neo4j_indexes.py
python scripts/seed_neo4j.py
\`\`\`

### 4. Running Backend and Frontend
Initialize FastAPI backend and background celery worker threads:
\`\`\`bash
.\\start_backend.ps1
\`\`\`
And boot up Next.js:
\`\`\`bash
cd frontend
npm run dev
\`\`\`
      `,
      bn: `
# ইন্সটলেশন গাইড

InfinitySim লোকাল সার্ভারে ডেভেলপমেন্ট মুডে রান করার ধাপসমূহ।

## পূর্বশর্ত

- **ডকার কম্পোজ** v২ বা তার বেশি (পোস্টগ্রেস, রেডিস, নিও ফোর জে এবং উইভিয়েট চালু করতে)।
- **নোড জেএস** v২০ বা তদূর্ধ্ব।
- **পাইথন** v৩.১১ বা তদূর্ধ্ব (সিমুলেশন এবং গণনার জন্য)।
- **ওলামা (Ollama)** (লোকাল Qwen3-8B রান করার জন্য)।

## সেটআপ প্রসেস

### ১. ডাটাবেস কন্টেইনার চালু করা
ডকারের মাধ্যমে ব্যাকগ্রাউন্ড সার্ভিস সমূহ প্রোভিশন করুন:
\`\`\`bash
docker compose up -d
\`\`\`

### ২. ভার্চুয়াল এনভায়রনমেন্ট ও প্যাকেজ ইন্সটলেশন
পাইথন ভার্চুয়াল এনভায়রনমেন্ট ও প্যাকেজ অটোমেটিক সেটআপ করতে চালান:
\`\`\`bash
# লিনাক্স বা ম্যাকের জন্য
./install.sh

# উইন্ডোজের জন্য
.\\install.ps1
\`\`\`

### ৩. নিও ফোর জে ইনডেক্সিং ও সিডিং
ডাটাবেস রিলেশনশিপ নোডগুলো ইনিশিয়ালাইজ করতে রান করুন:
\`\`\`bash
python scripts/create_neo4j_indexes.py
python scripts/seed_neo4j.py
\`\`\`

### ৪. লোকাল সার্ভার চালুকরণ
ফাস্ট এপিআই এবং সেলারি ব্যাকএন্ড চালু করুন:
\`\`\`bash
.\\start_backend.ps1
\`\`\`
সবশেষে নেক্সট জেএস ফ্রন্টএন্ড রান করুন:
\`\`\`bash
cd frontend
npm run dev
\`\`\`
      `,
    },
  },
  {
    slug: 'bayesian-mmm',
    category: 'simulation',
    title: {
      en: 'Bayesian MMM',
      bn: 'বেসিয়ান এমএমএম (MMM)',
    },
    content: {
      en: `
# Bayesian Marketing Mix Modeling (MMM)

Marketing Mix Modeling (MMM) estimates the macro impact of marketing spend on outcome metrics like revenue or registrations. 

## Adstock Transformation (Temporal Lag)

Advertising effects decay over time. We model memory carryover using an autoregressive decay process:

$$A_t = X_t + \\lambda \\, A_{t-1}$$

Where:
- $\\lambda \\in [0, 1]$ represents the *decay rate* (retention factor).
- $X_t$ is the raw media investment.
- Higher $\\lambda$ values (e.g. $0.7$ to $0.9$) correspond to top-of-funnel brand building campaigns (TV, Display).
- Lower $\\lambda$ values (e.g. $0.1$ to $0.2$) represent lower-funnel search campaigns that decay almost immediately.

## Hill Saturation Curve (Diminishing Returns)

To model diminishing returns, we transform the adstocked spend into a non-linear S-curve using the Hill function:

$$f(x) = \\frac{x^S}{K^S + x^S}$$

Where:
- $K$ is the *half-saturation parameter*, specifying the exact spend level that achieves 50% of the channel's maximum efficiency.
- $S$ is the *shape parameter* controlling the slope curvature.
- Spend levels exceeding $K$ enter the zone of diminishing returns.

## Bayesian Prior Isolation

marketing data suffers from high multicollinearity and sparsity. The engine solves this by incorporating historical A/B tests and industry elasticity benchmarks as Prior distributions inside the PyMC sampler, preventing overfitting.
      `,
      bn: `
# বেসিয়ান মার্কেটিং মিক্স মডেলিং (MMM)

মার্কেটিং মিক্স মডেলিং (MMM) বিজ্ঞাপনের বাজেট ব্যয়ের সাথে ব্যবসায়িক আয়ের সম্পর্ক নির্ণয়ের একটি গাণিতিক পদ্ধতি।

## অ্যাডস্টক ট্রান্সফরমেশন (Adstock)

বিজ্ঞাপনের প্রভাব তাৎক্ষণিকভাবে শেষ হয়ে যায় না, বরং গ্রাহকের স্মৃতিতে কিছুদিন থাকে। এটিকে অটো-রিগ্রেসিভ ডিকম্পজিশন প্রক্রিয়ার মাধ্যমে প্রকাশ করা যায়:

$$A_t = X_t + \\lambda \\, A_{t-1}$$

এখানে:
- $\\lambda \\in [0, 1]$ হল ডিকম্পজিশন বা ক্ষয় ফ্যাক্টর (রিটেনশন ফ্যাক্টর)।
- $X_t$ হল বিজ্ঞাপনের ব্যয়।
- $\\lambda$ এর মান বেশি (যেমন ০.৭ থেকে ০.৯) হলে বিজ্ঞাপনটির দীর্ঘমেয়াদী প্রভাব থাকে (যেমন ব্র্যান্ডিং বিজ্ঞাপন)।
- $\\lambda$ এর মান কম (যেমন ০.১ থেকে ০.২) হলে বিজ্ঞাপনটির প্রভাব দ্রুত শেষ হয়ে যায় (যেমন সার্চ বিজ্ঞাপন)।

## হিল স্যাচুরেশন কার্ভ (Hill Saturation)

বিজ্ঞাপনের বাজেট বাড়ালেই যে আয় সমানুপাতিকভাবে বাড়বে না, এই লিনিয়ার ফ্যালাসি এড়াতে হিল ফাংশন ব্যবহার করা হয়:

$$f(x) = \\frac{x^S}{K^S + x^S}$$

এখানে:
- $K$ হল অর্ধ-স্যাচুরেশন বিন্দু (যে ব্যয়সীমায় ৫০% রেসপন্স পাওয়া যায়)।
- $S$ স্যাচুরেশন কার্ভের ঢাল বা বাঁক নির্ধারণ করে।
- ব্যয় যখন $K$ বিন্দু অতিক্রম করে, তখন স্যাচুরেশন পয়েন্ট শুরু হয় এবং রেট অফ রিটার্ন হ্রাস পায়।

## বেসিয়ান প্রাওরস (Bayesian Priors)

মার্কেটিং ডেটাতে বহুবিধ কো-লিনিয়ারিটি এবং স্পার্সিটি থাকে। এই সমস্যা সমাধানে পূর্বের A/B টেস্ট রেজাল্ট এবং ইন্ডাস্ট্রি বেঞ্চমার্ক প্রাওরস (Priors) হিসেবে PyMC স্যাম্পলারে যোগ করা হয়।
      `,
    },
  },
  {
    slug: 'agent-based-simulation',
    category: 'simulation',
    title: {
      en: 'Agent-Based Simulation',
      bn: 'এজেন্ট-বেসড সিমুলেশন (ABM)',
    },
    content: {
      en: `
# Agent-Based Simulation (ABM)

While Marketing Mix Modeling (MMM) calculates macro trends, the **Agent-Based Simulation (ABM)** module (implemented using **Mesa 3.0** with vectorized Cohorts) models micro-level human behaviors.

## Consumer Agent Profiles

We simulate 1,024 distinct agent profiles with unique demographic variables:
- **Disposable Income**: Controls individual purchasing power thresholds.
- **Brand Loyalty Index**: Determines resistance to competitor discounts.
- **Media Affinity**: Dictates exposure rates to Facebook, Google Search, and TikTok.

## Transition State Machine

Consumer agents move through distinct cognitive states:
1. **Awareness**: Stimulated by ad impressions.
2. **Consideration**: Evaluated against brand loyalty and product pricing.
3. **Conversion**: Transaction purchase triggered.

## Word-of-Mouth (WOM) Cascades

Successful conversions within the simulation trigger Word-of-Mouth (WOM) events. Converted agents interact with neighboring nodes in their social and geographic networks, propagating organic brand awareness.
      `,
      bn: `
# এজেন্ট-বেসড সিমুলেশন (ABM)

ম্যাক্রো ট্রেন্ডের পাশাপাশি ব্যক্তিগত বা মাইক্রো স্তরে গ্রাহকদের আচরণ মডেল করতে পাইথনের **Mesa 3.0** ব্যবহার করে তৈরি হয়েছে **এজেন্ট-বেসড সিমুলেশন (ABM)**।

## গ্রাহক এজেন্ট প্রোফাইল

সিস্টেমে ১০২৪+ কাস্টম এজেন্ট সিমুলেট করা হয় যারা নিম্নোক্ত বৈশিষ্ট্য বহন করে:
- **ব্যয়যোগ্য আয় (Disposable Income)**: গ্রাহকের ক্রয়ের ক্ষমতা নির্ধারণ করে।
- **ব্র্যান্ড লয়্যালটি সূচক**: প্রতিযোগীদের ডিসকাউন্টের বিরুদ্ধে গ্রাহকের বিশ্বস্ততা পরিমাপ করে।
- **মিডিয়া পছন্দ**: ফেসবুক, গুগল বা টিকটক বিজ্ঞাপনে এক্সপোজার রেট নিয়ন্ত্রণ করে।

## এজেন্ট স্টেট ট্রানজিশন

গ্রাহক এজেন্টরা ক্রমান্বয়ে ৩টি মানসিক অবস্থা অতিক্রম করে:
১. **সচেতনতা (Awareness)**: বিজ্ঞাপন দেখার মাধ্যমে ব্র্যান্ড সম্পর্কে জানা।
২. **বিবেচনা (Consideration)**: ব্র্যান্ডের মূল্য ও সুবিধা বিবেচনা করা।
৩. **রূপান্তর (Conversion)**: কেনাকাটা বা ট্রানজ্যাকশন সম্পন্ন করা।

## মুখে মুখে প্রচারের তরঙ্গ (Word-of-Mouth Cascade)

যখন কোনো এজেন্ট কেনাকাটা সম্পন্ন করে, তখন তার আশেপাশের সামাজিক বা ভৌগলিক নোডগুলোতে এটি প্রচার করে, যা অর্গানিক কাস্টমার অ্যাকুইজিশনে সাহায্য করে।
      `,
    },
  },
  {
    slug: 'attribution-graphrag',
    category: 'attribution',
    title: {
      en: 'Attribution & GraphRAG',
      bn: 'অ্যাট্রিবিউশন ও গ্রাফ র‍্যাগ',
    },
    content: {
      en: `
# Markov Chain Attribution & GraphRAG

InfinitySim resolves attribution gaps and report Generation using graph databases and probability theory.

## Markov Chain Touchpoint Attribution

We model user conversion pathways as state transition paths. The incremental contribution of each marketing channel is calculated using the **Removal Effect**:

$$Removal\\ Effect(c) = 1 - \\frac{P(Conversion \\ | \\ \\text{channel } c \\text{ removed})}{P(Conversion \\ | \\ \\text{baseline})}$$

This calculates how the removal of any channel degrades the transition probability matrix $\\mathbf{P}$, highlighting multi-hop dependencies (e.g. display ads feeding search intent).

## Neo4j GraphRAG Structure

Quantitative parameters, campaigns, audience cohorts, and competitor actions are indexed inside **Neo4j** as semantic networks:
- **Graph Schema**: Nodes include \`Campaign\`, \`Channel\`, \`Product\`, \`AgentCluster\`, and \`Competitor\` linked by \`INFLUENCES\`, \`SUPPRESSES\`, and \`CANNIBALIZES\` edges.
- **Context Injection**: Queries traverse 2-hop entity relationships and fetch community summaries via LlamaIndex to feed grounded data to the LLM, preventing hallucinations.

## Optimization & Explainability

- **NSGA-II Genetic Optimizer**: Evaluates thousands of budget allocations using the \`pymoo\` library, converging on the Pareto frontier representing optimal ROI versus risk variance.
- **SHAP TreeExplainer**: Quantifies exact input features contributing to the forecast, providing deterministic backing for executive reports.
- **Bangla NLP**: Incorporates \`csebuetnlp/banglabert\` for processing Banglish copy and \`BAAI/bge-m3\` multi-vector embeddings for robust multilingual search.
      `,
      bn: `
# মার্কভ অ্যাট্রিবিউশন ও গ্রাফ র‍্যাগ (GraphRAG)

InfinitySim গ্রাফ ডাটাবেস ও প্রোবাবিলিটি থিওরি ব্যবহার করে অ্যাট্রিবিউশন গ্যাপ দূর করে এবং নির্ভুল রিপোর্ট তৈরি করে।

## মার্কভ চেইন অ্যাট্রিবিউশন

আমরা গ্রাহকের বিজ্ঞাপন দেখার যাত্রাকে স্টেট ট্রানজিশন ডায়াগ্রামের মাধ্যমে ম্যাপিং করি। কোনো চ্যানেলের কার্যকারিতা পরিমাপে **রিমুভাল ইফেক্ট (Removal Effect)** হিসেব করা হয়:

$$Removal\\ Effect(c) = 1 - \\frac{P(Conversion \\ | \\ \\text{channel } c \\text{ removed})}{P(Conversion \\ | \\ \\text{baseline})}$$

এটি গণনা করে যে একটি চ্যানেল বাদ দিলে সম্পূর্ণ ট্রানজিশন ম্যাট্রিক্স $\\mathbf{P}$ এ কেমন প্রভাব পড়ে।

## Neo4j GraphRAG আর্কিটেকচার

সব ক্যাম্পেইন, অ্যাট্রিবিউশন প্রবাবিলিটি এবং প্রতিযোগীদের ডেটা **Neo4j** গ্রাফ ডাটাবেসে রিলেশনাল নোড হিসেবে সেভ থাকে:
- **গ্রাফ স্কিমা**: নোডগুলির মধ্যে রয়েছে \`Campaign\`, \`Channel\`, \`Product\`, \`AgentCluster\`, \`Competitor\` যা পরস্পর \`INFLUENCES\`, \`SUPPRESSES\` এবং \`CANNIBALIZES\` এজ দ্বারা যুক্ত।
- **কনটেক্সট ইনজেকশন**: LlamaIndex ২-ধাপ পর্যন্ত গ্রাফ কুয়েরি করে প্রয়োজনীয় তথ্য প্রম্পটে যুক্ত করে, ফলে এআই কোনো মনগড়া বা মিথ্যা রিপোর্ট দেয় না।

## অপ্টিমাইজেশন ও ব্যাখ্যাযোগ্যতা

- **NSGA-II জেনেটিক অ্যালগরিদম**: \`pymoo\` লাইব্রেরির মাধ্যমে হাজার হাজার বাজেট বণ্টনের কম্বিনেশন ইভল্যুশন ঘটিয়ে সর্বোত্তম প্যারেটো বাউন্ডারি (Pareto frontier) খুঁজে বের করে।
- **SHAP TreeExplainer**: কোন ফিচারটি ফলাফলে কী ভূমিকা রেখেছে তার গাণিতিক প্রমান দেয়।
- **বাংলা এনএলপি**: ব্যাংলিশ টেক্সট প্রসেসিংয়ের জন্য \`csebuetnlp/banglabert\` এবং মাল্টি-লিঙ্গুয়াল সার্চের জন্য \`BAAI/bge-m3\` এম্বেডিং মডেল ব্যবহৃত হয়েছে।
      `,
    },
  },
  {
    slug: 'api-reference',
    category: 'api_reference',
    title: {
      en: 'API Reference',
      bn: 'এপিআই রেফারেন্স',
    },
    content: {
      en: `
# API Reference

The Prediction Engine backend exposes REST API endpoints for external automation and dashboard synchronization.

## Endpoint Overview

### 1. Initialize Campaign Graph
\`\`\`http
POST /api/v1/simulate/init
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
\`\`\`

### 2. Trigger Full Simulation Job
\`\`\`http
POST /api/v1/simulate
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "campaign_id": "uuid",
  "budget_overrides": {
    "Facebook": 5000,
    "YouTube": 3000
  }
}
\`\`\`
Returns a \`task_id\` representing the Celery background worker process.

### 3. Check Task Status
\`\`\`http
GET /api/v1/task/{task_id}
\`\`\`

### 4. Fetch iROAS Analytics
\`\`\`http
GET /api/v1/analytics/roi/{campaign_id}
\`\`\`
      `,
      bn: `
# এপিআই রেফারেন্স (API Reference)

প্রেডিকশন ইঞ্জিনের ব্যাকএন্ড ড্যাশবোর্ড সিনক্রোনাইজেশন এবং বাহ্যিক অটোমেশনের জন্য REST API এন্ডপয়েন্ট সরবরাহ করে।

## এন্ডপয়েন্ট সমূহ

### ১. ক্যাম্পেইন গ্রাফ ইনিশিয়ালাইজ করা
\`\`\`http
POST /api/v1/simulate/init
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
\`\`\`

### ২. সিমুলেশন শুরু করা
\`\`\`http
POST /api/v1/simulate
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "campaign_id": "uuid",
  "budget_overrides": {
    "Facebook": 5000,
    "YouTube": 3000
  }
}
\`\`\`
অনুরোধটি সম্পন্ন হলে ব্যাকএন্ডে সেলারি জবের জন্য একটি \`task_id\` প্রদান করা হয়।

### ৩. সিমুলেশন জবের বর্তমান অবস্থা দেখা
\`\`\`http
GET /api/v1/task/{task_id}
\`\`\`

### ৪. আইআরওএএস (iROAS) এনালিটিক্স নিয়ে আসা
\`\`\`http
GET /api/v1/analytics/roi/{campaign_id}
\`\`\`
      `,
    },
  },
]
