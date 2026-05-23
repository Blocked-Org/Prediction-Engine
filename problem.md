# Problem Definition

## 1. The Core User Problem

Bangladesh is entering a decisive moment to shift from AI adoption to AI production. However, local SME digital marketing relies heavily on retrospective platform dashboards and Multi-Touch Attribution (MTA), which is fundamentally flawed for predictive simulation.

MTA models require persistent user-level tracking via cookies, which has been fractured by "walled gardens" (Meta, Google) and privacy laws. Most importantly, MTA is descriptive, not causal. It cannot simulate what *will* happen if budgets are reallocated. Consequently, marketers allocate budgets based on intuition rather than statistical evidence.

Beyond MTA, traditional forecasting suffers from critical blind spots:
- **The "Cold-Start" Problem:** Regression models fail to predict outcomes for new campaigns lacking historical interaction data.
- **Linear Scalability Fallacy:** Naïve models assume proportional returns, failing to account for diminishing returns as campaigns scale.
- **Temporal Lag Neglect:** Failing to account for the delayed psychological impact (memory retention) of ad exposure.
- **Unquantified Creative Impact:** Treating campaign creatives as an unquantifiable black box, ignoring a massive driver of performance variance.

## 2. Target Audience

The specific focus of this platform is **Small and Medium-sized Enterprises (SMEs) in Bangladesh**, a market with a population of over 170 million and a rapidly expanding digital advertising sector.

Historically, advanced predictive capabilities like Bayesian Marketing Mix Modeling (MMM) were economically inaccessible enterprise solutions. This architecture democratizes these tools, deploying them via an accessible Next.js 15 application engineered for the 2G/3G mobile infrastructure prevalent in rural and peri-urban Bangladesh, complete with full Bangla localization.

## 3. Measurable Impact (KPIs)

The system's success is measured by its ability to accurately forecast and improve specific metrics:
- **Increasing Incremental Return on Ad Spend (iROAS):** Isolating revenue causally driven by advertising from organic base sales.
- **Identifying Marginal Return on Investment (mROI):** Calculating the projected revenue from the next incremental taka to identify the exact threshold of diminishing returns.
- **Reducing Customer Acquisition Cost (CAC):** Optimizing budget allocation via non-linear models.

## 4. Why AI is Required

Traditional software cannot solve this problem. Advanced AI and specific architectural components are strictly required:
- **Bayesian Inference (PyMC-Marketing):** To maintain stability across sparse data and use priors for realistic forecasting.
- **Mathematical Transformations:** Utilizing **Adstock** ($A_t = X_t + \lambda A_{t-1}$) to model delayed retention, and **Hill Functions** ($f(x) = \frac{x^S}{K^S + x^S}$) to model S-curves of diminishing returns.
- **Competitor Proxy Scraping:** Using **Firecrawl** and **Crawl4AI** to autonomously ingest competitor intelligence, updating baseline market share assumptions dynamically.
- **Transfer Learning & Synthetic Data:** To solve the Cold-Start Problem for entirely new products.
- **Genetic Algorithms (NSGA-II):** Using **pymoo** to navigate massive search spaces and discover the Pareto optimal budget distribution.
- **SHAP TreeExplainer:** Guaranteeing deterministic, mathematically anchored explanations to prevent LLM hallucinations.
- **GraphRAG & LLM Orchestration:** Weaving a Neo4j knowledge graph into retrieval to allow multi-hop reasoning, using **LlamaIndex** with cloud models or a local offline **Qwen3-8B** fallback.
- **Bangla-Native NLP:** Using `csebuetnlp/banglabert` and `BAAI/bge-m3` to accurately extract sentiment from code-mixed "Banglish" ad copy.