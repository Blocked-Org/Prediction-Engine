# Brand Simulation Engine

Graph-augmented Bayesian simulation platform for SME marketing intelligence in emerging markets (Bangladesh-first, bilingual UX).

## What This Project Contains

The system is organized as a 6-layer stack:

1. Data sources: endogenous ad data, exogenous web intelligence, and transactional logs.
2. Ingestion and processing: ETL plus queue-based jobs.
3. Storage and knowledge layer: Neo4j graph, vector storage, and analytics-ready datasets.
4. Simulation engine: Bayesian MMM, agent-based simulation, attribution, optimization, and explainability.
5. LLM orchestration: report generation over structured simulation outputs.
6. Application layer: Next.js bilingual dashboard and API routes.

## Repository Structure

- `frontend/`: Next.js app, route handlers, components, i18n messages, Jest tests.
- `src/`: FastAPI service, simulation engines, preprocessing, training, worker tasks.
- `docker/` and `docker-compose.yml`: local infra bootstrap.
- `shared/examples/`: contract payload examples.

## Prerequisites

- Docker Compose v2+
- Node.js 20+
- Python 3.11+

## Local Setup

### 1) Start local infrastructure

```powershell
docker compose up -d
```

### 2) Python environment and backend dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3) Configure Environment & Initialize Database

Ensure your `.env` points to the local Docker services (e.g., `NEO4J_URI=bolt://localhost:7687`), then run the index creation script to prepare the graph database:

```powershell
python scripts/create_neo4j_indexes.py
```

### 4) Start the Backend (FastAPI + Celery)

A convenient PowerShell script is provided to start both the API server and the background worker simultaneously:

```powershell
.\start_backend.ps1
```

*(Alternatively, run them separately using `uvicorn src.api.main:app --reload --port 8000` and `celery -A src.worker.main worker --loglevel=info --pool=solo`)*

### 5) Run the Frontend

```powershell
cd frontend
npm install
npm run dev
```

App URL: `http://localhost:3000/en` or `http://localhost:3000/bn`

### 6) LLM Fallback (Optional)
For offline local AI reporting, ensure Ollama is installed and running:
```powershell
ollama run gemma4:26b
```

## API Endpoints (Fully Integrated)

- `GET /health` : System health check
- `POST /api/v1/simulate` : Triggers the Triple-Engine (Macro MMM, Micro ABM, Optimization) via Celery.
- `POST /api/v1/forecast` : Triggers predictive forecasting via Celery.

Frontend route handlers (Next.js):
- `POST /api/forecast` : Frontend handshake to backend.
- `POST /api/report` : Generates LLM Executive Reports using Google Gemini or Ollama.

## Testing and Quality Checks

**Frontend:**
```powershell
cd frontend
npm run test
npm run build
```

**Backend:**
The Python unit test harness is fully wired using `pytest`.
```powershell
pytest
```

## Troubleshooting & Robust Installation

If you face difficulties installing tools and dependencies, check the following common issues:

1. **`pip install` fails on Windows (lxml wheel error):**
   * Some packages (like `crawl4ai` and `weaviate-client`) depend on `lxml`, which requires **Microsoft C++ Build Tools** to compile on Windows.
   * **Fix:** Download the [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), check "Desktop development with C++", and install it. Only then should you run `pip install -r requirements.txt`.
   * *Fallback Fix:* If you strictly cannot install build tools, install standard dependencies individually (`fastapi uvicorn celery redis pydantic pyyaml pymc...` etc.) and omit `crawl4ai` or `lxml`.
   * *Symptom:* The `.\start_backend.ps1` script will tell you `uvicorn.exe` or `celery.exe` is missing.

2. **Docker commands fail (`docker compose up`):**
   * If you receive an error like "The term 'docker' is not recognized", ensure **Docker Desktop** is installed and running on your machine.
   * **Fix:** Launch the Docker Desktop UI, wait for the engine to initialize, and restart your VS Code terminal before trying again.

3. **Frontend node issues:**
   * The frontend enforces Node `>=20.0.0` in `package.json`. Make sure you are not using outdated node versions to avoid Next.js build errors.

## Environment Variables

Common variables used by the current code paths:

- `FRONTEND_URL` (FastAPI CORS origin, default `http://localhost:3000`)
- `PE_MODEL_PATH`
- `PE_METADATA_PATH`
- `PE_BACKGROUND_PARQUET`
- `PE_RANDOM_STATE`
- `FIRECRAWL_API_KEY`
- `NEO4J_URI`
- `NEO4J_USER`
- `NEO4J_PASSWORD`

## Notes

- Bilingual UX is implemented with `next-intl` locale segments.
- Executive report generation supports cloud/offline selection in the UI.
- Day 6 focus is API handshake and replacing remaining mock output paths with full backend execution.
