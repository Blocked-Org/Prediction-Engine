### Phase 1: Data Ingestion & Feature Engineering (The Inputs)
This is the foundational layer where the engine collects and prepares the data.
*   **Controllable Marketing Data:** Consolidating historical spend, impressions, pricing, and promotional data from CRM and media platforms.
*   **Exogenous/External Data:** Ingesting macroeconomic indicators, seasonality, and competitor proxy data using a hybrid scraping architecture (**Firecrawl** and **Crawl4AI**) to extract data dynamically.
*   **Creative Feature Extraction:** Using Bangla-native NLP (`csebuetnlp/banglabert` and `BAAI/bge-m3` embeddings) to extract sentiment and semantic features from code-mixed "Banglish" ad copy.
*   **Cold-Start Engine:** For new products with no history, implementing **Transfer Learning** and **Synthetic Data Generation** to initialize the simulation with analogous past campaign benchmarks.

### Phase 2: Mathematical Data Transformation
Raw spending data must be mathematically transformed before the AI can analyze it:
*   **Adstock Transformation:** Modeled via an autoregressive process ($A_t = X_t + \lambda A_{t-1}$) to capture the delayed memory retention of advertising exposure.
*   **Saturation (The Hill Function):** Applying the non-linear S-curve ($f(x) = \frac{x^S}{K^S + x^S}$) to identify the half-saturation point and capture diminishing returns on scaling ad spend.

### Phase 3: The Core Predictive Engine (The Brain)
This is where the actual machine learning and simulation occur, utilizing three distinct models working together:
*   **Bayesian Marketing Mix Modeling (MMM):** The macro-level forecaster using **PyMC-Marketing**. It incorporates priors to isolate base sales from incremental sales, maintaining stability even with sparse data.
*   **Agent-Based Modeling (ABM):** The micro-level audience simulator, powered by **Mesa 3.0**, which models the behavior of fictive consumer agents for granular audience-specific scenario testing.
*   **Markov Chain Modeling:** Analyzes customer journey logs to calculate transition probabilities and the "removal effect" of specific channels in the conversion funnel.

### Phase 4: Prescriptive Optimization & Explainability (The Strategist)
Once the engine models the market, it prescribes optimal budget allocation and provides verifiable reasoning:
*   **Genetic Algorithms (NSGA-II):** Implemented via **pymoo**, evaluating thousands of budget combinations through crossover and mutation to discover the Pareto frontier.
*   **SHAP Deterministic Explainability:** A SHAP TreeExplainer calculates the exact mathematical contribution of every feature, guaranteeing that subsequent LLM explanations are hallucination-free.

### Phase 5: Dynamic Scenario UI & Orchestration (The Output)
The complex math is accessible through a high-performance executive dashboard and LLM orchestration layer:
*   **GraphRAG & LLM Orchestration:** **LlamaIndex** drives a GraphRAG pipeline over Neo4j to provide grounded multi-hop reasoning. The system uses cloud models (Claude/Gemini) and an offline local fallback (**Qwen3-8B** via Ollama) for resilient operation.
*   **Dashboard Application:** A **Next.js 15** frontend hosted on Vercel, heavily optimized for 2G/3G networks, featuring full Bangla i18n and interactive charting via **Lightweight Charts** and **Chart.js**.
