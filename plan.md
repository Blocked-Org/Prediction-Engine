# 1-Week Hackathon Project Plan: Brand Simulation Engine

> **Last Audited:** May 17, 2026 · **Current Stage:** Day 5–6 boundary  
> **Legend:** ✅ Done · 🟡 Partial / In Progress · ❌ Not Started

---

## 1. Project Context & The "Independence Boundary"

Based on the whitepaper for the "Graph-Augmented Bayesian Simulation Engine", you have exactly one week (Infinity AI BuildFest 2026) to deliver a highly complex 6-layer architecture.

**The Key to Independent Work:** You have already established shared domain contracts (Pydantic/TypeScript) and a deterministic mock FastAPI layer. **This is your independence boundary.**
* **Developer A (Frontend/LLM)** will build the entire UI and LLM integration relying *solely* on the mock API responses. They will not be blocked waiting for real mathematical models to be ready.
* **Developer B (AI/Data/Backend)** will build the actual PyMC, Agent-Based Models, and Graph databases behind the scenes. They will validate their work against the Pydantic schemas, ensuring it matches the mock API signatures.
* On Day 6, you simply swap the mock endpoint logic for the real engine logic, and the system merges seamlessly.

---

## 2. Seven-Day Intensive Timeline (Status Overview)

| Day | 👨‍💻 Developer A (Frontend & LLM) | 👨‍💻 Developer B (Simulation & Data) | Status |
| :--- | :--- | :--- | :---: |
| **Day 1** | Next.js setup, i18n Bangla config, Auth (Clerk), Base Layouts. | Neo4j/Weaviate provisioning, FastAPI structure, Base PyMC environment setup. | ✅ |
| **Day 2** | Dashboard UI scaffolding (shadcn/ui), DataTables for mock transaction logs. | Implement core Bayesian MMM (Adstock & Hill functions) using PyMC-Marketing. | ✅ |
| **Day 3** | Implement complex visualisations (Lightweight Charts & Chart.js) using mock data. | Implement Agent-Based Modeling (Mesa 3.0) and Markov Chain attribution. | ✅ |
| **Day 4** | Set up LlamaIndex on the frontend, connect to Vercel AI SDK for mock executive reports. | Implement NSGA-II Genetic Algorithm (pymoo) and SHAP TreeExplainer for deterministic metrics. | ✅ |
| **Day 5** | Implement local Ollama fallback, refine Bangla text and font subsetting. | Build web scraping workers (Firecrawl/Crawl4AI) and transition models to Celery/RQ workers. | ✅ |
| **Day 6** | **INTEGRATION DAY:** Work with Dev B to test the real API endpoints. Fix any UI rendering bugs. | **INTEGRATION DAY:** Swap FastAPI mock responses for real model outputs. Ensure Pydantic validations pass. | 🟡 |
| **Day 7** | Vercel Edge caching (ISR), selective prefetching. UI Polish. | Final testing, database indexing, latency optimization. Prepare for presentation. | ❌ |

---

## 3. Detailed Independent Track: Developer A (Frontend, UI & LLM)

**Focus:** Layers 5 & 6. Delivering a premium, fast, locally-aware user experience.

### 3.1 Next.js 15 App Router & i18n (Day 1) ✅

- [x] Scaffold the Next.js 15 application with App Router (`src/app/`)
- [x] Install and configure `next-intl` for locale-based sub-path routing
  - Routes: `/bn/dashboard`, `/en/dashboard`
  - Files: `src/i18n/routing.ts`, `src/i18n/request.ts`
- [x] Create `[locale]` dynamic segment layout (`src/app/[locale]/layout.tsx`)
- [x] Write translation JSON dictionaries
  - `messages/en.json` (2.8 KB — covers navigation, dashboard, onboarding, reporting)
  - `messages/bn.json` (5.2 KB — full Bangla translations)
- [x] Install and configure Clerk authentication (`@clerk/nextjs`)
  - `src/app/[locale]/sign-in/` route
  - `src/app/[locale]/sign-up/` route
- [x] Build base layout with sidebar navigation (`app-sidebar.tsx`)
- [x] Build `LanguageSwitcher.tsx` component for bn/en toggle
- [x] Implement font subsetting via `next/font` for Bengali Unicode ranges
  - Goal: reduce font payloads from ~600 KB to <50 KB
  - Currently: `next/font` is available but Bengali-specific subsetting not configured

### 3.2 Dashboard Assembly — Using Mock API (Day 2) ✅

- [x] Install `shadcn/ui` and copy components into source
  - 14 components: `button`, `card`, `checkbox`, `dropdown-menu`, `form`, `input`, `label`, `progress`, `separator`, `sheet`, `sidebar`, `skeleton`, `table`, `tooltip`
- [x] Build the main dashboard page (`src/app/[locale]/dashboard/page.tsx`)
- [x] Build `DashboardView.tsx` (6.2 KB — primary dashboard rendering)
- [x] Build `DashboardEmptyState.tsx` (empty state when no simulation data)
- [x] Build `AnalyticsView.tsx` (2.9 KB — analytics sub-page)
- [x] Create analytics route (`src/app/[locale]/dashboard/analytics/page.tsx`)
- [x] Create reporting route (`src/app/[locale]/dashboard/reporting/`)
- [x] Build `DataTable.tsx` using `@tanstack/react-table` (4.2 KB)
  - Sortable, filterable table for transaction logs
- [x] Build `SimulationWizard.tsx` (15.5 KB — multi-step onboarding form)
  - Step-by-step campaign configuration with `react-hook-form` + `zod` validation
  - Onboarding route: `src/app/[locale]/onboarding/`
- [x] Create frontend API proxy routes
  - `src/app/api/forecast/` — proxies to backend `/forecast`
  - `src/app/api/simulate/` — proxies to backend `/simulate`
  - `src/app/api/report/` — proxies to backend for LLM report generation
- [x] Create TypeScript domain contracts matching Pydantic schemas
  - `src/lib/types/contracts.ts` (2.5 KB)
- [x] Set up mock data fetching utilities
  - `src/lib/dashboard.ts`, `src/lib/onboarding.ts`

### 3.3 Data Visualisation (Day 3) ✅

- [x] **Saturation S-Curve chart** — `SaturationCurveChart.tsx` (2.8 KB)
  - Uses `lightweight-charts` (Canvas renderer)
  - Plots Hill function: spend vs. response per channel
- [x] **Budget Allocation Donut chart** — `AllocationDonutChart.tsx` (2.2 KB)
  - Uses `chart.js` + `react-chartjs-2`
  - Displays Pareto-optimal budget distribution from Genetic Algorithm output
- [x] **ROI / iROAS Tracking chart** — `ROITrackingChart.tsx` ✨ NEW
  - Uses `lightweight-charts` (Canvas renderer)
  - Three series: iROAS point estimate, 90% credible interval band, break-even threshold
  - iROAS KPI badge in the card header reacts to simulation data
  - `generateMockROIData()` derives realistic trajectory from channel spend until real backend is wired
- [x] **Micro-Funnel Journey graph** — `MarkovFunnelChart.tsx` ✨ NEW
  - Pure SVG — zero extra dependencies
  - Nodes auto-arrange into funnel stage columns (Awareness → Consideration → Lower-Funnel → Conversion)
  - Cubic Bézier edges; stroke-width encodes P(i→j) transition probability
  - Traffic-share bar inside each node visualises relative audience size
  - `generateMockMarkovData()` builds plausible funnel from channel names until backend is wired
- [x] Charts react to state changes (all charts re-render when `data` prop changes)
- [x] Both new charts dynamically imported in `AnalyticsView.tsx` (SSR-safe, lazy-loaded)
- [x] Chart unit tests — 21 tests passing across all 4 chart components
  - `ROITrackingChart.test.tsx` — 8 tests (render, legend, empty state, generator)
  - `MarkovFunnelChart.test.tsx` — 13 tests (SVG, labels, headers, accessibility, edge %, generator)
- [x] i18n keys added for both new charts in `en.json` and `bn.json`

### 3.4 LLM Orchestration — Layer 5 (Day 4) ✅
- [x] Connect `ai` package (Vercel AI SDK)
- [x] Implement local LLM provider wrapper (`src/lib/llm/provider.ts`)
  - Target: Ollama (Gemma 4 26B) on `localhost:11434`
  - Fallback: Gemini 3 Flash via API key
- [x] Create `useChat` / `useCompletion` hook wrapper for the reporting interface
- [x] Build `ExecutiveReport.tsx` component
  - Needs streaming text UI (typewriter effect)
  - Must render markdown tables and bold text cleanly
- [x] **GraphRAG pipeline** — DONE
  - ✅ `src/llm/graphrag_service.py` — hybrid text-match + 2-hop graph traversal via Neo4j
  - ✅ `frontend/src/lib/llm/retriever.ts` — frontend GraphRAG with Weaviate vector retrieval + Neo4j context
  - ✅ `src/api/routes/report.py` — orchestrates GraphRAG retrieval into LLM system prompt
  - ✅ `llamaindex` + `weaviate-ts-client` used for semantic similarities on campaign/competitor text
- [x] **Text-to-Cypher translation service** — DONE
  - ✅ `frontend/src/app/api/chat/route.ts` — API route built
  - ✅ Uses Vercel AI SDK to dynamically generate read-only Neo4j Cypher queries
  - ✅ Returns provenance-tracked answers including the exact Cypher query used
- [x] **SHAP → LLM grounding** — DONE
  - ✅ `src/explainability/shap_tools.py` — `format_shap_for_llm()` converts SHAP output to markdown
  - ✅ `src/api/routes/report.py` — feeds SHAP context into LLM system prompt
  - ✅ `frontend/src/app/api/report/route.ts` — injects `shapContext` + `graphContext` into system prompt
  - ✅ System prompt includes "STRICT DIRECTIVE" to mathematically ground recommendations

### 3.5 Offline / Local LLM Fallback (Day 5) ✅

- [x] Install `@ai-sdk/openai-compatible` for Ollama integration
- [x] Configure local model provider (Ollama base URL)
- [x] Build Cloud AI ↔ Offline AI toggle in the UI
- [x] **Bengali font subsetting optimisation** — DONE
  - [x] Configure `next/font` with `subsets` and `unicodeRange` for Bangla glyphs only
- [x] **Bangla NLP pipeline** — DONE
  - [x] Load `csebuetnlp/banglabert` for Bangla sentiment analysis of ad copy
  - [x] Load `BAAI/bge-m3` for multilingual embeddings (dense + sparse retrieval)
  - [x] Handle Banglish code-mixed text preprocessing
- [x] **Refine Bangla executive report quality** — DONE
  - [x] Test report generation in both `bn` and `en` locales
  - [x] Ensure Bangla output reads naturally for SME marketers

### 3.6 Edge Optimisation & Polish (Day 7) ❌

- [ ] **Incremental Static Regeneration (ISR)**
  - Add `revalidate` export to static dashboard/reporting pages
  - Pre-compute standard Pareto frontiers and historical reports
- [ ] **Selective prefetching**
  - Disable default aggressive `<Link>` prefetching
  - Bind prefetch triggers to explicit hover/touch intent
- [ ] **Dynamic imports**
  - Wrap `lightweight-charts` and `chart.js` with `next/dynamic` + `ssr: false`
  - Reduce initial Time to Interactive (TTI) on low-end devices
- [ ] **UI polish pass**
  - Mobile responsive testing (sidebar → Sheet drawer on small screens)
  - Loading states, error boundaries, skeleton screens
  - Micro-animations and hover effects for premium feel
- [ ] **Landing page** (`src/app/[locale]/page.tsx` — 5.7 KB exists but may need polish)

---

## 4. Detailed Independent Track: Developer B (Simulation Engine, AI & Data)

**Focus:** Layers 1–4. Delivering mathematically rigorous, graph-grounded simulation logic.

### 4.1 Database & Infrastructure Provisioning (Day 1) ✅

- [x] Create `docker-compose.yml` with all three services:
  - Neo4j 5.18.0 (ports 7474/7687, persistent volume)
  - Weaviate 1.24.1 (ports 8080/50051, persistent volume)
  - Redis 7-alpine (port 6379, AOF persistence, password-protected)
- [x] Write Neo4j client wrapper (`src/api/db/neo4j_client.py`)
- [x] Write Weaviate client wrapper (`src/api/db/weaviate_client.py`)
- [x] Write Neo4j index creation script (`scripts/create_neo4j_indexes.py` — 8.6 KB)
- [x] Write infrastructure test script (`scripts/test_infrastructure.py` — 4.2 KB)
- [x] Scaffold FastAPI application (`src/api/main.py` — 10.4 KB)
  - CORS configuration, health check, route registration
- [x] Create Pydantic domain schemas
  - `src/schemas/simulation.py` (4.6 KB) — simulation request/response contracts
  - `src/schemas/dashboard.py` — dashboard data shapes
  - `src/api/schemas.py` (3.9 KB) — API-level request/response models
- [x] Set up Python environment with `requirements.txt` (35 dependencies)
- [x] Create `.env` with all environment variable placeholders (2.5 KB)
- [x] Write `start_backend.ps1` launch script (3.4 KB)

### 4.2 Bayesian MMM — Engine 1: Macro Simulation (Day 2) ✅

- [x] Implement `src/simulation/bayesian_mmm.py` (13.4 KB)
  - Bayesian multi-linear regression using PyMC-Marketing
  - **Adstock transformation** (Eq. 1): autoregressive decay with channel-specific λ
  - **Hill function** (Eq. 2): non-linear S-curve saturation with (S, K) per channel
  - Posterior sampling and credible interval extraction
- [x] Create macro simulation facade (`src/simulation/macro.py`)
- [x] Write training/tuning pipeline (`src/training/tune_train.py` — 4 KB)
- [x] Write training metrics utilities (`src/training/metrics.py`)
- [x] Write comprehensive macro simulation tests (`tests/test_macro_simulation.py` — 9 KB)

### 4.3 ABM & Markov Chain — Engines 2 & 3: Micro Simulation (Day 3) ✅ *(Ahead of Schedule)*

- [x] Implement `src/simulation/abm_engine.py` (6.7 KB)
  - Mesa 3.0 agent-based model with vectorised `AgentSet` operations
  - Simulates consumer agents with demographic/psychographic attributes
  - Models ad exposure, word-of-mouth diffusion, brand perception shifts
- [x] Implement `src/simulation/agent_model.py` (1.5 KB)
  - Individual agent class with loyalty, media consumption, geolocation attributes
- [x] Create micro simulation facade (`src/simulation/micro.py`)
- [x] Write ABM unit tests (`tests/test_abm_engine.py` — 9.3 KB)
- [x] Implement `src/simulation/markov_attribution.py` (7 KB)
  - Transition probability matrix construction from journey logs
  - **Removal Effect** calculation: baseline vs. channel-removed conversion delta
  - Channel-level causal contribution quantification
- [x] Write Markov attribution tests (`tests/test_markov_attribution.py` — 2.9 KB)

### 4.4 Optimisation & Explainability (Day 4) ✅ *(Ahead of Schedule)*

- [x] Implement `src/simulation/optimization.py` (4 KB)
  - NSGA-II Genetic Algorithm via `pymoo`
  - Multi-objective: maximise revenue + ROI simultaneously
  - Budget constraint enforcement across all channels
  - Pareto frontier extraction
- [x] Write optimisation tests (`tests/test_optimization.py` — 2 KB)
- [x] Implement `src/explainability/shap_explainer.py` (3.8 KB)
  - SHAP TreeExplainer for feature contribution decomposition
- [x] Implement `src/explainability/shap_tools.py` (7.4 KB)
  - Utility functions for SHAP value extraction, formatting, and visualisation
- [x] Write explainability tests (`tests/test_explainability.py` — 2.6 KB)
- [x] Build engine orchestrator (`src/simulation/engine_runner.py` — 12 KB)
  - Sequences: MMM → ABM → Markov → Optimisation → SHAP
  - Aggregates outputs into unified simulation response
- [x] Write orchestrator tests (`tests/test_simulate_init.py` — 6.3 KB)

### 4.5 Ingestion, Scraping & Background Workers (Day 5) ✅

- [x] Implement `src/preprocessing/web_scraper.py` (4.6 KB)
  - Firecrawl integration for complex protected domains
  - Crawl4AI integration for routine high-volume scraping
  - Markdown extraction from JS-rendered pages
- [x] Write scraper tests (`tests/test_web_scraper.py` — 2.1 KB)
- [x] Implement data preprocessing pipeline
  - `src/preprocessing/pipelines.py` (3 KB) — ETL transforms
  - `src/preprocessing/dataset_io.py` (5.2 KB) — data loading/saving
  - `src/preprocessing/outliers.py` (2.4 KB) — outlier detection/handling
  - `src/preprocessing/config.py` (3.9 KB) — config management
- [x] Scaffold Celery worker infrastructure
  - `src/worker/main.py` (1.2 KB) — Celery app instantiation
  - `src/worker/tasks.py` (3.2 KB) — task definitions
  - `src/api/worker.py` (4.5 KB) — API-side worker integration
- [x] Build inference service (`src/inference/service.py` — 5.4 KB)
- [x] Build simulate route handler (`src/api/routes/simulate.py` — 10.3 KB)
- [x] Build dashboard results service (`src/api/services/dashboard_results.py` — 9.9 KB)
- [x] **Wire Celery workers to real simulation engines** — DONE
  - ✅ `src/api/worker.py` — imports `run_micro_simulation` and `run_macro_forecast` from `engine_runner`
  - ✅ `src/worker/tasks.py` — wires `run_full_simulation_task` and `run_forecast_task` to engine pipeline
  - ✅ `/api/v1/simulate` → Celery `run_simulation_task.delay()` → `engine_runner` → return task_id
  - ✅ `/api/v1/task/{task_id}` polling endpoint returns result when complete
- [x] **Schedule competitor scraping** — DONE
  - ✅ `scrape_competitor_data_task` added to Celery Beat schedule in `src/worker/main.py`
  - ✅ Scheduled to run daily at midnight for configured competitor URLs
- [x] **Populate Neo4j knowledge graph with sample data** — DONE
  - ✅ `scripts/seed_neo4j.py` (21.6 KB) — comprehensive seed script
  - ✅ Nodes: User, Campaign, Channel, AgentCluster, Competitor, MacroContext, Outcome
  - ✅ Edges: OWNS, ALLOCATED_TO, TARGETS, COMPETES_WITH, OPERATES_IN, GENERATES
  - ✅ 2 sample campaigns with full relationship graphs
- [x] **Populate Weaviate vector store** — DONE
  - ✅ `scripts/seed_weaviate.py` fetches Neo4j campaigns and scraped competitor contexts
  - ✅ Employs `src/nlp/pipeline.py` to generate embeddings using BAAI/bge-m3
- [x] **Build GraphRAG indexing pipeline** — DONE
  - ✅ `src/llm/graphrag_service.py` provides k-hop graph retrieval
  - ✅ `src/nlp/pipeline.py` provides NLP models (`BAAI/bge-m3`, `csebuetnlp/banglabert`)
  - ✅ Vector similarity component (Weaviate) seeded and integrated on the frontend

### 4.6 API Contract Tests & Validation ✅

- [x] API endpoint tests (`tests/test_api_endpoints.py` — 2.8 KB)
- [x] Contract validation tests (`tests/test_contract_validation.py` — 2.7 KB)
- [x] Integration smoke tests (`tests/test_integration_smoke.py` — 5.1 KB)

---

## 5. The "Handshake" Protocol (Day 6) 🟡

> **In progress — all Day 5 prerequisites complete.**

- [x] **Developer A:** `NEXT_PUBLIC_API_URL` in `.env.local` already points to `http://localhost:8000` — swap to ngrok URL when Dev B exposes staging server
- [x] **Developer A:** `/api/health` proxy route built (`frontend/src/app/api/health/route.ts`) — forwards to FastAPI `/health` to verify Neo4j + Redis are reachable
- [x] **Developer A:** `useBackendHealth` hook built (`src/hooks/useBackendHealth.ts`) — polls `/api/health` and returns per-service status
- [x] **Developer A:** `BackendHealthBanner` component built (`src/components/dashboard/BackendHealthBanner.tsx`) — surfaces degraded services in the dashboard UI with a dismiss + retry button
- [x] **Developer A:** `useTaskPoller` hook built (`src/hooks/useTaskPoller.ts`) — polls `/api/simulate/[taskId]` until Celery task reaches SUCCESS or FAILURE
- [x] **Both:** Developer B pushes the real FastAPI backend to staging (ngrok or local)
- [x] **Both:** Verify: Pydantic/TypeScript shared contracts pass end-to-end
- [ ] **Both:** Fix UI rendering bugs with real mathematical data (different scales, edge cases)
- [ ] **Both:** Test full simulation flow: Wizard input → backend compute → charts render → report generates
- [ ] **Both:** Test both Bangla and English locales end-to-end

---

## 6. Final Polish & Deployment (Day 7) ❌

- [ ] **Frontend Performance:**
  - [ ] ISR (`revalidate`) on static pages
  - [ ] Dynamic imports for chart libraries
  - [ ] Selective prefetching (disable aggressive Link prefetch)
  - [ ] Bengali font subset optimisation
- [ ] **Backend Performance:**
  - [ ] Neo4j query indexing and optimisation
  - [ ] Redis caching for frequently-requested simulations
  - [ ] API response time benchmarking
- [ ] **Final Testing:**
  - [ ] Full E2E flow on 2G throttled connection
  - [ ] Mobile responsive testing
  - [ ] Bangla/English locale switching under load
- [ ] **Presentation Prep:**
  - [ ] Demo script with realistic sample data
  - [ ] Screenshots/recordings of key flows
  - [ ] Talking points mapping features to whitepaper sections

---

## 7. Architecture File Inventory

Quick reference of all implemented files and their roles:

### Frontend (`frontend/`)
```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx              # ✅ Root locale layout (Clerk + i18n provider)
│   │   ├── page.tsx                # ✅ Landing page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # ✅ Dashboard layout (sidebar)
│   │   │   ├── page.tsx            # ✅ Main dashboard page
│   │   │   ├── analytics/page.tsx  # ✅ Analytics sub-page
│   │   │   └── reporting/          # ✅ Reporting sub-page
│   │   ├── onboarding/             # ✅ Simulation wizard
│   │   ├── sign-in/                # ✅ Clerk sign-in
│   │   └── sign-up/                # ✅ Clerk sign-up
│   ├── api/
│   │   ├── forecast/               # ✅ Forecast proxy route
│   │   ├── report/route.ts         # ✅ LLM report generation
│   │   └── simulate/               # ✅ Simulation proxy route
│   └── globals.css                 # ✅ Global styles
├── components/
│   ├── ui/                         # ✅ 14 shadcn/ui components
│   ├── charts/
│   │   ├── SaturationCurveChart.tsx # ✅ Hill function S-curve
│   │   ├── AllocationDonutChart.tsx # ✅ Budget allocation donut
│   │   ├── ROITrackingChart.tsx     # ✅ iROAS tracking (7.7 KB)
│   │   └── MarkovFunnelChart.tsx    # ✅ Markov funnel journey (13 KB)
│   ├── dashboard/
│   │   ├── DashboardView.tsx       # ✅ Primary dashboard
│   │   ├── DashboardEmptyState.tsx  # ✅ Empty state
│   │   └── AnalyticsView.tsx       # ✅ Analytics view
│   ├── onboarding/
│   │   └── SimulationWizard.tsx    # ✅ Multi-step wizard (15KB)
│   ├── ExecutiveReport.tsx         # ✅ AI report component
│   ├── DataTable.tsx               # ✅ TanStack Table
│   ├── LanguageSwitcher.tsx        # ✅ Locale toggle
│   └── app-sidebar.tsx             # ✅ Navigation sidebar
├── i18n/
│   ├── routing.ts                  # ✅ Locale routing config
│   └── request.ts                  # ✅ Server-side locale resolution
├── lib/
│   ├── types/contracts.ts          # ✅ TypeScript domain contracts
│   ├── dashboard.ts                # ✅ Dashboard data utilities
│   ├── onboarding.ts               # ✅ Onboarding utilities
│   └── utils.ts                    # ✅ General utilities
└── messages/
    ├── en.json                     # ✅ English translations
    └── bn.json                     # ✅ Bangla translations
```

### Backend (`src/`)
```
src/
├── api/
│   ├── main.py                     # ✅ FastAPI app (10KB)
│   ├── schemas.py                  # ✅ API schemas
│   ├── service.py                  # ✅ API service layer
│   ├── worker.py                   # ✅ Worker integration
│   ├── routes/
│   │   ├── simulate.py             # ✅ Simulate endpoint (10KB)
│   │   └── report.py              # ✅ Report context endpoint (7.7KB)
│   ├── services/
│   │   └── dashboard_results.py    # ✅ Dashboard service (10KB)
│   └── db/
│       ├── neo4j_client.py         # ✅ Neo4j driver wrapper
│       └── weaviate_client.py      # ✅ Weaviate client wrapper
├── simulation/
│   ├── bayesian_mmm.py             # ✅ Bayesian MMM (13KB)
│   ├── abm_engine.py              # ✅ ABM Mesa 3.0 (7KB)
│   ├── agent_model.py             # ✅ Agent class (1.5KB)
│   ├── markov_attribution.py      # ✅ Markov chains (7KB)
│   ├── optimization.py            # ✅ NSGA-II pymoo (4KB)
│   ├── engine_runner.py           # ✅ Orchestrator (12KB)
│   ├── macro.py                   # ✅ Macro facade
│   └── micro.py                   # ✅ Micro facade
├── explainability/
│   ├── shap_explainer.py          # ✅ SHAP TreeExplainer (4KB)
│   └── shap_tools.py             # ✅ SHAP utilities + LLM formatting (10KB)
├── llm/
│   ├── __init__.py                # ✅ Package init
│   └── graphrag_service.py        # ✅ GraphRAG retrieval service (8.2KB)
├── nlp/
│   └── pipeline.py                # ✅ NLP models & Banglish preprocessing
├── preprocessing/
│   ├── web_scraper.py             # ✅ Firecrawl + Crawl4AI (5KB)
│   ├── pipelines.py               # ✅ ETL pipeline (3KB)
│   ├── dataset_io.py             # ✅ Data I/O (5KB)
│   ├── outliers.py               # ✅ Outlier detection (2KB)
│   └── config.py                 # ✅ Config management (4KB)
├── inference/
│   └── service.py                 # ✅ Inference service (5KB)
├── training/
│   ├── tune_train.py             # ✅ Training pipeline (4KB)
│   └── metrics.py                # ✅ Evaluation metrics (1KB)
├── worker/
│   ├── main.py                    # ✅ Celery app (1KB)
│   └── tasks.py                  # ✅ Task definitions (3KB)
└── schemas/
    ├── simulation.py              # ✅ Domain schemas (5KB)
    └── dashboard.py               # ✅ Dashboard schemas
```

---

## 8. Remaining Critical Path (Prioritised)

### 🔴 P0 — Must complete for a working demo

| # | Task | Owner | Est. Hours | Depends On | Status |
|:--|:--|:--|:--|:--|:--|
| 1 | Wire Celery workers → `engine_runner.py` | Dev B | 3h | — | ✅ Done |
| 2 | Seed Neo4j with sample campaign graph data | Dev B | 3h | — | ✅ Done |
| 3 | Build ROI/iROAS tracking chart component | Dev A | 3h | — | ✅ Done |
| 4 | Build Markov funnel journey visualisation | Dev A | 4h | — | ✅ Done |
| 5 | Integration handshake: frontend → real backend | Both | 4h | #1, #2 | 🟡 Partial (report route wired; full UI→backend flow unverified) |
| 6 | End-to-end simulation flow test | Both | 2h | #5 | ✅ Done (`scripts/test_e2e_engine.py` passes) |
| 7 | Increase unit test coverage for `training` and `worker` modules | Dev B | 3h | — | ✅ Done (`test_worker.py` and `test_training.py`) |

### 🟡 P1 — Significantly improves demo quality

| # | Task | Owner | Est. Hours | Depends On | Status |
|:--|:--|:--|:--|:--|:--|
| 7 | Build GraphRAG retrieval pipeline (LlamaIndex → Neo4j → LLM) | Dev B | 5h | #2 | ✅ Done (Neo4j Cypher retrieval + Weaviate LlamaIndex frontend integrated) |
| 8 | Feed SHAP output into executive report context | Dev A | 2h | #5 | ✅ Done (`format_shap_for_llm()` → report route → LLM system prompt) |
| 9 | Bangla NLP: load banglabert + bge-m3 | Dev B | 4h | — | ✅ Done (`src/nlp/pipeline.py` singleton) |
| 10 | Populate Weaviate with campaign embeddings | Dev B | 3h | #9 | ✅ Done (`scripts/seed_weaviate.py` populates `Campaign` and `CompetitorContext`) |
| 11 | Dynamic imports for chart libraries | Dev A | 1h | — | ❌ Not Started |
| 12 | Bengali font subsetting | Dev A | 1h | — | ✅ Done |
| 15 | Text-to-Cypher natural language graph queries | Dev B | 4h | #7 | ✅ Done (implemented on frontend via `api/chat` route) |

### 🟢 P2 — Polish for presentation

| # | Task | Owner | Est. Hours | Depends On |
|:--|:--|:--|:--|:--|
| 13 | ISR edge caching (`revalidate`) | Dev A | 1h | — |
| 14 | Selective prefetching (disable aggressive Link) | Dev A | 1h | — |
| 15 | Text-to-Cypher natural language graph queries | Dev B | 4h | #7 |
| 16 | Graph community detection & pre-generated summaries | Dev B | 3h | #7 |
| 17 | Mobile responsive polish + micro-animations | Dev A | 3h | — |
| 18 | Demo script + presentation materials | Both | 2h | All above |
