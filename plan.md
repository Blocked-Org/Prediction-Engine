# 1-Week Hackathon Project Plan: Brand Simulation Engine

## 1. Project Context & The "Independence Boundary"
Based on the whitepaper for the "Graph-Augmented Bayesian Simulation Engine", you have exactly one week (e.g., Infinity AI BuildFest 2026) to deliver a highly complex 6-layer architecture. 

**The Key to Independent Work:** You have already established shared domain contracts (Pydantic/TypeScript) and a deterministic mock FastAPI layer. **This is your independence boundary.** 
* **Developer A (Frontend/LLM)** will build the entire UI and LLM integration relying *solely* on the mock API responses. They will not be blocked waiting for real mathematical models to be ready.
* **Developer B (AI/Data/Backend)** will build the actual PyMC, Agent-Based Models, and Graph databases behind the scenes. They will validate their work against the Pydantic schemas, ensuring it matches the mock API signatures. 
* On Day 6, you simply swap the mock endpoint logic for the real engine logic, and the system merges seamlessly.

---

## 2. Seven-Day Intensive Timeline

| Day | 👨‍💻 Developer A (Frontend & LLM) | 👨‍💻 Developer B (Simulation & Data) |
| :--- | :--- | :--- |
| **Day 1** | Next.js setup, i18n Bangla config, Auth (Clerk), Base Layouts. | Neo4j/Pinecone provisioning, FastAPI structure, Base PyMC environment setup. |
| **Day 2** | Dashboard UI scaffolding (shadcn/ui), DataTables for mock transaction logs. | Implement core Bayesian MMM (Adstock & Hill functions) using PyMC-Marketing. |
| **Day 3** | Implement complex visualisations (Lightweight Charts & Chart.js) using mock data. | Implement Agent-Based Modeling (Mesa 3.0) and Markov Chain attribution. |
| **Day 4** | Set up LlamaIndex on the frontend, connect to Vercel AI SDK for mock executive reports. | Implement NSGA-II Genetic Algorithm (pymoo) and SHAP TreeExplainer for deterministic metrics. |
| **Day 5** | Implement local Ollama (gemma4:26b) fallback, refine Bangla text and font subsetting. | Build web scraping workers (Firecrawl/Crawl4AI) and transition models to Celery/RQ workers. |
| **Day 6** | **INTEGRATION DAY:** Work with Dev B to test the real API endpoints. Fix any UI rendering bugs. | **INTEGRATION DAY:** Swap FastAPI mock responses for real model outputs. Ensure Pydantic validations pass. |
| **Day 7** | Vercel Edge caching (ISR), selective prefetching. UI Polish. | Final testing, database indexing, latency optimization. Prepare for presentation. |

---

## 3. Detailed Independent Track: Developer A (Frontend, UI & LLM)
**Focus:** Layers 5 & 6. Delivering a premium, fast, locally-aware user experience.

### Tasks to Complete Independently:
1. **Next.js 15 App Router & i18n:**
   * Scaffold the application. Set up `next-intl` immediately to support `/bn` and `/en` routing.
   * Implement font subsetting via `next/font` for Bengali to ensure fast loading on 2G/3G networks.
2. **Dashboard Assembly (Using Mock API):**
   * Use `shadcn/ui` to build the layout, sidebar, and responsive elements.
   * Fetch data from the `/forecast` and `/simulate` mock API endpoints.
   * Implement `TanStack Table` to display the raw mock transactional data cleanly.
3. **Data Visualisation:**
   * **Lightweight Charts (Canvas):** Build the Saturation S-Curve chart (mapping spend vs. response) and ROI tracking charts. Ensure they react to state changes.
   * **Chart.js:** Build the pie/donut charts for the Pareto-optimal budget allocation.
4. **LLM Orchestration (Layer 5):**
   * Integrate the Vercel AI SDK (Claude 3.5 Sonnet / Gemini Flash).
   * Feed the mock API JSON data directly into the LLM context window to generate natural-language "Executive Reports" in Bangla and English.
   * Setup a local instance of Ollama running `gemma4:26b`. Build a toggle in the UI to switch between "Cloud AI" and "Offline AI".
5. **Edge Optimization (Day 7):**
   * Configure `revalidate` on static pages (ISR).
   * Implement dynamic imports (`next/dynamic`) for the chart libraries so the initial page load is instant.

---

## 4. Detailed Independent Track: Developer B (Simulation Engine, AI & Data)
**Focus:** Layers 1-4. Delivering mathematically rigorous, graph-grounded simulation logic.

### Tasks to Complete Independently:
1. **Database & Ingestion (Layers 1-3):**
   * Spin up a Neo4j AuraDB instance and a Pinecone vector index.
   * Write standalone Python scripts using `Firecrawl` and `Crawl4AI` to scrape competitor pricing/ads and push them into Neo4j as graph nodes.
2. **The "Triple-Engine" Simulation (Layer 4):**
   * **Engine 1 (Macro):** Use `PyMC-Marketing` to build a Bayesian Multi-linear regression model. Code the mathematical transformations: Adstock (Eq. 1) and Hill Function (Eq. 2).
   * **Engine 2 (Micro):** Use `Mesa 3.0` to create a basic Agent-Based Model simulating 1,000 "agents" with different demographics interacting with ads.
   * **Engine 3 (Attribution):** Write a script calculating a Markov Chain transition matrix for simulated user journeys to determine the "Removal Effect".
3. **Optimization & Explainability:**
   * Write the `pymoo` NSGA-II Genetic Algorithm script that takes the outputs from the engines and finds the optimal budget spread.
   * Wrap the prediction output in a `SHAP TreeExplainer` to extract the exact percentage contribution of each feature (spend, competitor proxy, etc.).
4. **API Worker Queues (Prep for Day 6):**
   * Because PyMC and Genetic Algorithms take time to run, you cannot run them synchronously in FastAPI.
   * Set up `Celery` or `RQ` with Redis. When the `/simulate` endpoint is hit, it should queue a background job, run the math, and store the result.
   * Update the FastAPI endpoints to actually trigger these workers instead of returning static mock data.

---

## 5. The "Handshake" Protocol (Day 6)
To ensure the 1-week timeline is met, Day 6 is strictly reserved for the "Handshake".
* Developer B will push the "real" FastAPI backend to a staging server (or local network via ngrok).
* Developer A will point the Next.js frontend `.env` variables from the "mock server" to the "staging server".
* If the Pydantic/TypeScript shared contracts were strictly followed during Days 1-5, the UI will populate with real mathematical data instantly without breaking.
* Spend the rest of Day 6 fixing minor typing mismatches and latency issues.
