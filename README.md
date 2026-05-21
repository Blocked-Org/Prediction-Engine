# Brand Simulation Engine

Graph-augmented Bayesian simulation platform for SME marketing intelligence in emerging markets (Bangladesh-first, bilingual UX).

## What This Project Contains

The system is organized as a 6-layer stack:

1. Data sources: endogenous ad data, exogenous web intelligence, and transactional logs.
2. Ingestion and processing: ETL plus queue-based jobs.
3. Storage and knowledge layer: PostgreSQL + TimescaleDB for time-series, Neo4j graph, vector storage, and analytics-ready datasets.
4. Simulation engine: Bayesian MMM, agent-based simulation, attribution, optimization, and explainability.
5. LLM orchestration: report generation over structured simulation outputs.
6. Application layer: Next.js bilingual dashboard and API routes.

## Repository Structure

- `frontend/`: Next.js app, route handlers, components, i18n messages, Jest tests.
- `src/`: FastAPI service, simulation engines, preprocessing, training, worker tasks.
- `docker-compose.yml` & `docker-compose.prod.yml`: local infra bootstrap and production stack definition.
- `Dockerfile`: Multi-stage production build for the backend API and Celery workers.
- `.github/workflows/`: GitHub Actions pipeline for CI/CD.
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

### 2) Automated Setup (Install Tools & Dependencies)

A PowerShell script is provided to automatically create the Python virtual environment, install all backend requirements, synchronize environment variables, and install the Next.js frontend dependencies.

```powershell
.\install.ps1
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

The `install.ps1` script already handles `npm install`. To start the development server:

```powershell
cd frontend
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
- `POST /api/v1/simulate` : Triggers the Triple-Engine (Macro MMM, Micro ABM, Optimization) via Celery. Protected by Role-Based Access Control (RBAC): `owner`, `admin`, and `analyst` roles allowed. Supports dynamic `budget_overrides` from the interactive sandbox.
- `POST /api/v1/simulate/init` : Registers a new campaign graph. Allowed roles: `owner`, `admin`.
- `GET /api/v1/simulate/results/{clerk_user_id}` : Loads dashboard results. Allowed roles: `owner`, `admin`, `analyst`, `viewer` (all active roles).
- `POST /api/v1/forecast` : Triggers predictive forecasting via Celery.

### Role-Based Access Control (RBAC)

The backend enforces robust Role-Based Access Control using Clerk's `org_role` claims. User roles are mapped to our normalized levels (`owner`, `admin`, `analyst`, `viewer`):

| Endpoint | Allowed Roles | Rationale |
|---|---|---|
| `POST /api/v1/simulate` | owner, admin, analyst | Viewers cannot execute heavy simulations |
| `POST /api/v1/simulate/init` | owner, admin | Restricts graph changes to owners and admins |
| `GET /api/v1/simulate/results/{id}` | owner, admin, analyst, viewer | Everyone can view analytical results |

*The `GET /api/v1/simulate/status/{id}` endpoint remains fully public for read-only polling.*

### API Key Management

The backend includes a secure, tenant-scoped API Key CRUD system at `/api/v1/keys`:

- `GET /api/v1/keys` : Lists active keys (exposing `key_prefix` and `name` — never the full key). Allowed roles: `owner`, `admin`.
- `POST /api/v1/keys` : Creates a new API key. Generates a secure token `pe_k_{secrets.token_urlsafe(32)}` and stores its SHA-256 hash. Plaintext raw key is returned **exactly once** in this response. Allowed roles: `owner`, `admin`.
- `DELETE /api/v1/keys/{key_id}` : Soft-deletes a key (sets `is_active=False`). Allowed roles: `owner`, `admin`.

Frontend route handlers (Next.js):
- `POST /api/forecast` : Frontend handshake to backend.
- `POST /api/report` : Fully integrated Vercel AI SDK route. Generates LLM Executive Reports using Google Gemini or Ollama. Supports typewriter-effect streaming (`useCompletion`) and injects real-time context from the Neo4j Knowledge Graph using the native `neo4j-driver`.

## Testing and Quality Checks

**Frontend:**
```powershell
cd frontend
npm run test
npm run build
```

**Backend:**
The Python unit test harness is fully wired using `pytest`, featuring robust mocking of external ML/Graph services.
```powershell
pytest tests/
```
> **Current Status:** 102+ automated tests passing across the frontend and backend, covering the complete handshake (GraphRAG, NLP Pipeline, Bayesian Macro simulation, and Next.js State Management).

## Continuous Integration (CI/CD)

The repository uses **GitHub Actions** for CI/CD. The pipeline (`.github/workflows/ci.yml`) automatically runs on pushes and pull requests to `main`:
1. **Lint & Type Check:** Verifies code quality for both frontend (`eslint`, `tsc`) and backend (`ruff`, `mypy`).
2. **Backend Tests:** Spins up PostgreSQL, Neo4j, and Redis service containers, applies Alembic migrations, and runs the Pytest suite.
3. **Docker Build:** Builds and verifies the multi-stage production image.

## Production Deployment

A production-ready `Dockerfile` and `docker-compose.prod.yml` are provided. The production stack includes resource limits and automatic restart policies, and enforces dependency health checks across the database services.

To launch the production stack:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Developer / Coverage:**
Install developer test dependencies (one-time) before running coverage reports:
```powershell
pip install -r requirements-dev.txt
```

Run the full test suite with coverage:
```powershell
pytest --cov=src --cov-report=term-missing
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
- `CLERK_JWKS_URL`
- `CLERK_ISSUER`
- `CLERK_AUDIENCE`

## Notes

- Bilingual UX is implemented with `next-intl` locale segments.
- Executive report generation supports cloud/offline selection in the UI with streaming text generation.
- Interactive Simulation Sandbox allows real-time slider reactivity and client-side Hill function visualization.
- The pipeline is fully integrated end-to-end: from Neo4j Graph Retrieval -> PyMC/Mesa Engines -> Next.js Streaming Dashboard.
