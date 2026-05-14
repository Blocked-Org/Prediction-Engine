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

### 3) Run FastAPI

```powershell
uvicorn src.api.main:app --reload --port 8000
```

### 4) Run Celery worker

```powershell
celery -A src.worker.main worker --loglevel=info
```

### 5) Run frontend

```powershell
cd frontend
npm install
npm run dev
```

App URL: `http://localhost:3000/en`

## API Endpoints (Current)

- `GET /health`
- `GET /healthz`
- `POST /v1/predict/batch`
- `POST /api/v1/simulate` (mock response path, queued integration planned)
- `POST /api/v1/forecast` (mock response path, queued integration planned)

Frontend route handlers (Next.js):
- `POST /api/forecast`
- `POST /api/report`

## Testing and Quality Checks

Frontend:

```powershell
cd frontend
npm run test
npm run build
```

Backend:

- Python unit test harness is not fully wired yet in this repo state.
- If adding backend tests, install `pytest` in the active environment and run from repository root.

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
