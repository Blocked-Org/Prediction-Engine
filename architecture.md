# System Architecture

## Graphical Architecture

```mermaid
flowchart TD
    %% Define Styles
    classDef input fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef ingest fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;
    classDef process fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef llm fill:#f3e5f5,stroke:#8e24aa,stroke-width:2px;
    classDef storage fill:#fff3e0,stroke:#f57c00,stroke-width:2px;
    classDef api fill:#e0f7fa,stroke:#0097a7,stroke-width:2px;
    classDef ui fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;

    %% 1. Input Data Layer
    subgraph InputLayer ["1. Data Sources"]
        A1("Endogenous<br/>(Ad Platforms, CRM)"):::input
        A2("Exogenous<br/>(Competitor Intel, Macro)"):::input
        A3("Transactional<br/>(Sales Data, LTV)"):::input
    end

    %% 2. Ingestion & Streaming
    subgraph IngestLayer ["2. Ingestion & Processing"]
        I1("ETL Pipeline<br/>(Airbyte / Fivetran)"):::ingest
        I2("Message Queue<br/>(Kafka / Redis PubSub)"):::ingest
        I3("Web Scraping<br/>(Firecrawl & Crawl4AI)"):::ingest
    end

    %% 3. Storage Layer
    subgraph StorageLayer ["3. Storage & Knowledge Base"]
        C1[("Graph Database<br/>(Neo4j)")]:::storage
        C2[("Vector Store<br/>(Pinecone/Weaviate)")]:::storage
        C3[("Data Lake<br/>(BigQuery/Snowflake)")]:::storage
    end

    %% 4. AI Processing Layer (Python Backend)
    subgraph AILayer ["4. AI & Simulation Engine (FastAPI)"]
        B1("Macro-Simulation<br/>(Bayesian MMM / PyMC-Marketing)"):::process
        B2("Micro-Simulation<br/>(ABM / Mesa 3.0 / Markov)"):::process
        B3("Optimization Engine<br/>(NSGA-II / pymoo)"):::process
        B4("Explainability<br/>(SHAP TreeExplainer)"):::process
        B5("Task Queue<br/>(Celery Worker)"):::process
        
        B5 --> B1
        B5 --> B2
        B5 --> B3
        B5 --> B4
    end

    %% 5. LLM & Reasoning Layer
    subgraph LLMLayer ["5. LLM Orchestration"]
        L1("LlamaIndex"):::llm
        L2("GraphRAG Pipeline"):::llm
        L3("Cloud LLMs (Claude/Gemini)<br/>Offline (Qwen3-8B)"):::llm
        L1 <--> L2
        L1 --> L3
    end

    %% 6. Application Logic & User Interaction
    subgraph ApplicationLayer ["6. Application Layer (Next.js 15)"]
        D0("API Gateway / Auth<br/>(Clerk / NextAuth)"):::api
        D1("Next.js App Router<br/>(RSC)"):::ui
        D2("Visualizations<br/>(shadcn/ui, Lightweight Charts, Chart.js)"):::ui
        
        D0 --> D1
        D1 --> D2
    end

    %% Data Flow Connections
    InputLayer --> IngestLayer
    IngestLayer --> StorageLayer
    
    StorageLayer <--> AILayer
    StorageLayer <--> LLMLayer
    AILayer <--> LLMLayer
    
    LLMLayer --> D0
    AILayer --> D0
```

## 1. Data Sources

Three classes of data feed the ingestion pipeline:
- **Endogenous inputs:** Ad platforms (Meta, Google), CRM, and promotional data.
- **Exogenous inputs:** Competitor share of voice (scraped via Firecrawl and Crawl4AI) and macroeconomic time-series.
- **Transactional inputs:** Historical revenue logs, conversion events, and LTV.

## 2. Ingestion & Processing

Batch data is securely pulled by ETL tools (Airbyte or Fivetran). Real-time scraping events and streaming telemetry flow through a message queue (Kafka or Redis Pub/Sub), decoupling ingestion from downstream processing. Web scraping is handled by **Firecrawl** (for complex targets) and **Crawl4AI** (for high-volume undefended targets).

## 3. Storage & Knowledge Base

- **Neo4j (Graph DB):** Serves as the primary relationship mapper, storing the marketing input matrix as interconnected nodes and edges.
- **Pinecone / Weaviate (Vector Store):** Stores embeddings of creative assets and textual campaign data.
- **BigQuery / Snowflake (Data Lake):** Cold-storage repository for raw, unstructured historical logs.

## 4. AI & Simulation Engine

Heavy mathematical simulations execute in a dedicated Python environment (FastAPI), decoupled via a Celery task queue:
- **Macro-Simulation:** Bayesian MMM via **PyMC-Marketing** performs top-down budget forecasting.
- **Micro-Simulation:** ABM powered by **Mesa 3.0** and Markov Chains simulate granular user journeys.
- **Optimization Engine:** **NSGA-II Genetic Algorithm (pymoo)** evaluates thousands of budget combinations to find the Pareto frontier.
- **SHAP Explainability:** A SHAP TreeExplainer computes the exact marginal contribution of input features before passing outputs to the LLM, guaranteeing deterministic explainability.

## 5. LLM Orchestration

Orchestrated by **LlamaIndex**, this layer bridges raw simulation outputs and natural-language explainability via the **GraphRAG** pipeline. Cloud inference uses **Claude 3.5 Sonnet** or **Gemini 1.5 Flash**. An offline fallback deploys **Qwen3-8B** locally via Ollama to ensure accessibility on limited network infrastructure.

## 6. Application Layer

- **Frontend:** **Next.js 15** with React Server Components (RSC) renders heavy data server-side, keeping the client bundle lean.
- **Authentication:** Managed by Clerk or NextAuth.
- **Visualizations:** Built with shadcn/ui, **Lightweight Charts**, and **Chart.js**.
- **Localization:** Full Bangla i18n via `next-intl`. 
- **Edge Optimization:** Aggressive low-bandwidth optimizations on Vercel ensure the dashboard is accessible on 2G/3G mobile infrastructure.