# NWIS MVP - Project Memory

## 1. Project

**Name:** eRTMAC-NWIS  
**Full Name:** Nearby Wells Intelligence System  
**SIH Problem Statement:** SIH26121 / PS121  
**Organization:** Oil India Limited  
**Category:** Software / Smart Automation

**Purpose:** An AI-powered offset-well knowledge and decision-support platform for drilling operations. The planned system helps drilling engineers understand nearby historical wells, identify similar wells, examine historical drilling events, and eventually predict drilling risks using historical data and AI.

## 2. Current Development Status

Current phase: **Phase 7 - FastAPI Integration / Intelligence Orchestration**

Status: **COMPLETE**

The SQLAlchemy/PostGIS schema and FastAPI database boundary are implemented and verified against PostgreSQL 18 on localhost:5432. The synthetic dataset (20 wells, 86 formations, 3,000 drilling logs, 43 events) is loaded. PostGIS spatial similarity and group-aware XGBoost multiclass risk prediction are integrated. Native PostgreSQL 18.3 + pgvector 0.8.6 RAG knowledge retrieval is live. Phase 7 FastAPI intelligence orchestration provides clean, modular endpoints exposing well catalogs, well details, similarity, on-demand risk prediction, and a unified intelligence endpoint aggregating well data, similarity, risk, and native pgvector RAG historical context for the future React frontend.

## 3. Development Strategy

Planned order:

1. Project structure
2. PostgreSQL + PostGIS
3. Synthetic dataset
4. Well similarity engine
5. ML risk model
6. RAG
7. FastAPI integration
8. React dashboard
9. WebSockets / simulated live drilling
10. Maps
11. Final integration
12. Docker
13. Final testing
14. GitHub/deployment preparation

Docker is intentionally postponed until the final phase.

## 4. Technology Stack

### Implemented or selected

- Python, FastAPI, Uvicorn
- SQLAlchemy ORM
- PostgreSQL with PostGIS
- GeoAlchemy2
- Pydantic and python-dotenv
- React, Vite, Axios, React Router, React-Leaflet, Leaflet, Recharts (existing scaffold)

### Planned

- Pandas, NumPy, scikit-learn, XGBoost, and joblib for ML risk prediction
- PyMuPDF, Sentence Transformers, PostgreSQL/pgvector, and an LLM API for RAG
- FastAPI WebSockets and browser WebSocket API
- Docker and Docker Compose

pgvector, RAG, WebSockets, and Docker are not implemented in this phase.

## 5. Current Architecture

```text
PostgreSQL + PostGIS
        |
    SQLAlchemy
        |
      FastAPI
        |
 similarity engine  +  ML risk inference (XGBoost joblib)
        |
 Future RAG, WebSockets, and React dashboard
```

The backend remains a single application. `backend/app/core/database.py` owns the engine, session factory, declarative base, and FastAPI session dependency. `backend/app/models/` owns the relational schema. Risk prediction is `FastAPI route -> risk_service -> ml.inference.predict -> risk_model.joblib`. The model is loaded once and reused; API requests do not train.

## 6. Database

Expected local database:

```text
Host: localhost
Port: 5432
Database: nwis
User: postgres
```

The connection string is supplied only through `backend/.env` as `DATABASE_URL`. PostGIS is required. pgvector is postponed until the RAG phase. No database password is stored in this file.

## 7. Database Tables

### wells

- `id`: integer primary key
- `well_id`: unique, indexed, not-null string
- `field`, `well_type`, `status`: strings
- `latitude`, `longitude`, `total_depth`: floats
- `location`: GeoAlchemy2 `POINT`, SRID 4326, longitude/latitude order

### formations

- `id`: integer primary key
- `well_id`: foreign key to `wells.id`
- `formation_name`, `lithology`: strings
- `top_depth`, `bottom_depth`, `pressure`, `temperature`: floats

### drilling_logs

- `id`: integer primary key
- `well_id`: foreign key to `wells.id`
- `timestamp`: datetime
- `depth`, `rop`, `wob`, `rpm`, `torque`, `standpipe_pressure`, `mud_density`: floats
- `event_label`: integer, where 0=NORMAL, 1=STUCK_PIPE, 2=MUD_LOSS, 3=HIGH_TORQUE

### events

- `id`: integer primary key
- `well_id`: foreign key to `wells.id`
- `depth`: float
- `formation`, `event_type`, `severity`: strings
- `description`, `cause`, `mitigation`, `outcome`: text

Relationships are `Well` to many `Formation`, `DrillingLog`, and `Event` records using SQLAlchemy `back_populates`.

## 8. Current Project Structure

```text
nwis-mvp/
├── PROJECT_MEMORY.md
├── README.md
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── core/__init__.py
│       ├── core/config.py
│       ├── core/database.py
│       ├── models/__init__.py
│       ├── models/well.py
│       ├── models/formation.py
│       ├── models/drilling_log.py
│       ├── models/event.py
│       ├── schemas/
│       │   ├── similarity.py
│       │   └── risk.py
│       ├── api/
│       │   ├── similarity.py
│       │   └── risk.py
│       └── services/
│           ├── similarity_engine.py
│           └── risk_service.py
├── data/
│   ├── load_data.py
│   └── raw/
│       ├── wells.csv
│       ├── formations.csv
│       ├── drilling_logs.csv
│       └── events.csv
├── ml/
│   ├── labels.py
│   ├── data/prepare_data.py
│   ├── training/train_risk_model.py
│   ├── inference/predict.py
│   ├── models/risk_model.joblib
│   ├── models/model_metadata.json
│   └── tests/test_predict.py
├── rag/
└── frontend/
```

The existing frontend scaffold remains in the repository from the earlier foundation task, but it is not being extended during Phase 2.

## 9. Completed Work

- [x] Project structure created
- [x] Backend-local Python environment created at `backend/.venv/`
- [x] Backend foundation dependencies installed in `backend/.venv/`
- [x] Environment-driven settings boundary created
- [x] SQLAlchemy engine, `SessionLocal`, `Base`, and `get_db()` created
- [x] Well model with PostGIS location column created
- [x] Formation model created
- [x] DrillingLog model created
- [x] Event model created
- [x] SQLAlchemy relationships and model imports created
- [x] FastAPI root and health endpoints updated for Phase 2
- [x] `/db-test` endpoint created
- [x] Startup table creation wired to configured database
- [x] PostgreSQL connection verified (`SELECT 1` succeeds)
- [x] PostGIS extension verified (PostGIS 3.6)
- [x] NWIS tables created and verified
- [x] `wells.location` verified as `POINT` with SRID 4326
- [x] Synthetic dataset generated and present in `data/raw/`
- [x] Transaction-safe CSV loader created at `data/load_data.py`
- [x] Synthetic dataset loaded: 20 wells
- [x] Synthetic dataset loaded: 86 formations
- [x] Synthetic dataset loaded: 3,000 drilling logs
- [x] Synthetic dataset loaded: 43 events
- [x] PostGIS locations populated and verified for all 20 wells
- [x] PostGIS nearby-well search implemented
- [x] Configurable search radius implemented
- [x] Formation similarity implemented
- [x] Depth similarity implemented
- [x] Geological similarity implemented
- [x] Weighted final score implemented
- [x] Top-N results implemented
- [x] FastAPI endpoint implemented at `GET /api/similarity/{well_id}`
- [x] Error handling implemented
- [x] Tests/verification completed
- [x] ML risk model trained with XGBClassifier (`multi:softprob`, 4 classes)
- [x] Group-aware well split (`GroupShuffleSplit`, 80/20 wells, `random_state=42`)
- [x] Balanced `sample_weight` applied on training rows only (no SMOTE)
- [x] Model saved at `ml/models/risk_model.joblib`
- [x] Metadata saved at `ml/models/model_metadata.json`
- [x] Standalone inference at `ml/inference/predict.py`
- [x] FastAPI endpoint implemented at `POST /api/risk/predict`
- [x] Risk inference tests completed
- [x] RAG (native pgvector on PostgreSQL 18.3)
- [x] FastAPI well catalog endpoint `GET /api/wells`
- [x] FastAPI well details endpoint `GET /api/wells/{well_id}`
- [x] FastAPI well similarity endpoint `GET /api/wells/{well_id}/similar`
- [x] FastAPI well risk endpoint `POST /api/wells/{well_id}/risk`
- [x] FastAPI unified intelligence endpoint `GET /api/wells/{well_id}/intelligence`
- [x] Intelligence orchestration service (`intelligence_service.py`)
- [x] Automated Phase 7 test suite (18 backend tests, 37 full repo tests passing)
- [x] Phase 8 Frontend Foundation Pass: Public Landing Page & Redesigned App Shell (IN PROGRESS)
- [ ] WebSocket simulation (Phase 10)
- [ ] Dedicated Maps Phase (Phase 10)
- [ ] Docker (Phase 12)

## 10. Current Decisions

- Develop locally first.
- PostgreSQL is the primary database and PostGIS stores spatial well locations.
- Use a single FastAPI backend, not microservices.
- Do not add pgvector before RAG (pgvector is now active).
- Do not add Docker before the final phase.
- Do not fabricate or regenerate the existing synthetic dataset during the loading phase.
- Keep implementations simple and explainable for an SIH MVP.
- Risk-model features are only: depth, rop, wob, rpm, torque, standpipe_pressure, mud_density. Target is `event_label`. Train/test split is by well_id to avoid row leakage.
- Class weighting for the MVP baseline is sklearn `compute_sample_weight(class_weight="balanced")` on training rows. Probabilities are raw `predict_proba` values and are not calibrated.
- Intelligence orchestration aggregates well metadata, formations, recent drilling logs (capped at 20), historical events, PostGIS offset similarity, on-demand ML risk classification, and native pgvector cosine RAG retrieval into a single consolidated payload.

## 11. Synthetic Dataset Status

The dataset is loaded and verified with 20 wells, 86 formations, 3,000 drilling logs, and 43 historical events. The loader uses CSV `well_id` values to map to database integer foreign keys, writes `POINT(longitude latitude)` values with SRID 4326, supports repeatable replacement loads, and rolls back the complete transaction on failure.

## 12. Important Constraints

Do not add Docker, WebSockets, or synthetic-data regeneration before their planned phases. Do not expose credentials. Do not mark ML or database work complete without real execution. Preserve completed components unless a change is required.

## 13. Current Next Step

**Phase 7 - FastAPI Integration / Intelligence Orchestration:** COMPLETE. All 10 Phase 7 automated tests passed; all 37 tests across the entire repository passed; manual verification of all endpoints succeeded without regressions.

The next planned phase is **Phase 8 - React Dashboard** (or frontend integration). Do not implement it automatically.

## 13a. Phase 5 Model Notes

- Dataset is synthetic.
- Real-world drilling data is required for production validation.
- High synthetic-test scores do not mean the model will perform similarly on real OIL drilling data.
- The model demonstrates architecture and workflow, not production readiness.

## 14. Known Issues

- No current issues after the dataset load. A previous PostGIS-enabled startup attempt used a closed SQLAlchemy transaction connection for `create_all`; startup now enables the extension in one transaction and creates tables with a fresh engine connection.
- The older frontend scaffold remains in the repository even though frontend functionality is deferred by the current Phase 2 instructions.

## 15. Resolved Issues

### Outside virtual environment

**Description:** A virtual environment was located outside the project at `D:\Oil-Sentry\.venv`.

**Solution:** Removed it and created the project-owned environment at `backend/.venv/`. The parent environment is no longer used.

## 16. Agent Instructions

Any coding agent must read this file before changing the project, check the current phase and completed work, preserve the architecture, avoid future phases, update this file after meaningful work, and only mark verified work as complete. Never place passwords, API keys, or tokens in this file.

## 17. Memory Update Rule

After meaningful implementation, update the status, completed checklist, structure, decisions, dependencies, known issues, and next step. Keep this file factual and concise.

## 18. Phase 6 - RAG System (COMPLETE with native pgvector)

- **PostgreSQL:** 18.3 (Service: `postgresql-x64-18` on port 5432)
- **pgvector:** 0.8.6 (Compiled natively with MSVC and installed; `CREATE EXTENSION vector` verified)
- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Embedding Dimension:** 384
- **Database Table:** `rag_documents` with native `embedding vector(384)`
- **Document Count:** 20 synthetic development reports under `rag/documents/` (grounded in database wells W001-W020; not real OIL operational documents)
- **Chunk Count:** 20 chunks (1 chunk per report, deterministic word chunking ~650 words with 80-word overlap)
- **Retrieval Engine:** PostgreSQL pgvector cosine distance operator `<=>` executed directly in PostgreSQL
- **Distance Metric:** Cosine distance; converted to similarity via `cosine_similarity = 1.0 - cosine_distance`
- **Retrieval Thresholds:** `top_k = 5`, `min_similarity = 0.10`
- **Fallback Status:** The previous temporary PostgreSQL JSON embedding fallback and in-process Python ranking have been completely removed.
- **LLM Credentials:** Not configured locally; `POST /api/rag/query` returns retrieved sources with clear documentation that generation requires LLM provider credentials. Grounding rules strictly forbid hallucinations or outside knowledge.
- **Verification:** All 27 test suite tests passed; verified vector dimensions (384), non-null embeddings (20/20), native distance calculations, live `POST /api/rag/query`, and operational table integrity (20 wells, 86 formations, 3,000 logs, 43 events).

## 19. Phase 7 - FastAPI Integration / Intelligence Orchestration (COMPLETE)

- **Service Layer:** `backend/app/services/intelligence_service.py` coordinates entity lookups, PostGIS similarity calculations, ML risk classifications, and native pgvector RAG queries.
- **Routes Added/Updated:**
  - `GET /api/wells`: Catalog of all 20 wells (`well_id`, `field`, `latitude`, `longitude`, `total_depth`, `well_type`, `status`).
  - `GET /api/wells/{well_id}`: Comprehensive detail for a specific well (metadata, location, formations ordered by depth, recent drilling logs capped at 20, historical events). Returns 404 for unknown wells.
  - `GET /api/wells/{well_id}/similar`: Well-scoped similarity search delegating to `similarity_engine.py` using PostGIS spatial filtering and multi-factor similarity weighting.
  - `POST /api/wells/{well_id}/risk`: On-demand drilling risk classification for a verified well using specified operational drilling parameters (`depth`, `rop`, `wob`, `rpm`, `torque`, `standpipe_pressure`, `mud_density`) via the trained XGBoost model.
  - `GET /api/wells/{well_id}/intelligence`: Unified intelligence orchestration endpoint aggregating well metadata, geological formations, latest 20 drilling logs, historical events, PostGIS offset similarities, automated ML risk inference on the latest drilling parameters, and deterministic native pgvector cosine RAG context (`"What historical drilling problems and mitigation occurred in or around well {well_id}?"`).
- **Database Query Efficiency:** Avoids N+1 queries. Single filtered query per related table with `.limit(20)` for recent drilling logs.
- **RAG & ML Preservation:**
  - Grounded deterministic RAG queries preserve `pgvector_cosine` backend, `pgvector_enabled: true`, `generation_status: llm_not_configured`, and clear notice regarding required LLM credentials without hallucinated responses.
  - XGBoost risk model (`ml/models/risk_model.joblib`) remains untouched and outputs 4-class probabilities and summaries.
  - PostGIS similarity algorithm and weights remain untouched.
- **Automated Tests:** 10 dedicated tests in `backend/tests/test_wells.py` validating 200 responses, schema adherence, 404 errors for unknown wells, 422 for invalid payloads, and unified intelligence output structure.
- **Test Suite Results:** All 37 tests across the repository pass (`backend/tests`: 18, `rag/tests`: 17, `ml/tests`: 2).
- **Manual Verification:** Live execution verified 200 OK for catalog, details, similar wells, risk prediction, and unified intelligence; verified 404 for unknown wells; verified no regressions on `GET /api/similarity/{well_id}`, `POST /api/risk/predict`, and `POST /api/rag/query`.
 
 ## 20. Phase 8 - React Frontend (IN PROGRESS)
 
- **Status:** IN PROGRESS (Design + UX Foundation Pass Complete)
- **Visual Design Philosophy:** Apple-inspired product presentation merged with modern petroleum industrial engineering software. Soft layered dark surfaces (`#07090e`, `#0c1017`, `#151e2b`), restrained borders (`rgba(255,255,255,0.07)`), warm petroleum amber accents (`#d4973b`), technical steel highlights (`#7b8c9e`), and tabular figures.
- **Two Distinct Experiences:**
  1. **Public Landing Page (`/`):**
     - Standalone immersive experience without the application sidebar.
     - Minimal top navigation: `eRTMAC-NWIS` brand, section anchors (`Platform`, `Intelligence`, `Technology`, `Spatial`), and `[ Enter Operations ]` CTA.
     - Hero Section: Eyebrow `NEARBY WELLS INTELLIGENCE SYSTEM · SIH 2026 PS121 · OIL INDIA LIMITED`, primary heading `SHOW UP FOR OIL. OIL SHOWS UP FOR YOU.`, exact creed quote `“Show up for Oil, Oil shows up for You”`, and high-fidelity local vector SVG geological strata cross-section (Alluvium, Girujan, Tipam, Surma, Barail) with active well trajectory and offset indicators.
     - In-between Cinematic Moment: Trajectory sensor node animation, large display typography `KNOW THE WELL. Before the well knows you.` with offset precision attribution.
     - Story Section: `Every well leaves a story.` with interactive 3-step pipeline flow: `Well (Isolated Assets) → History (Unified Memory) → Patterns (Predictive Decision)`.
     - Intelligence Section: 4 large horizontal capability blocks: `01 Similar Wells` (spatial & offset scoring), `02 Risk Intelligence` (XGBoost 4-state hazard classifier), `03 Historical Knowledge` (pgvector 384-D cosine retrieval), and `04 Field Context` (PostGIS spatial topology).
     - Technology Section: Visual flow stack: `DATA → SPATIAL INTELLIGENCE → MACHINE LEARNING → HISTORICAL KNOWLEDGE → DRILLING DECISION SUPPORT`.
     - Field Section: Subsurface spatial perspective diagram with target reservoir horizon and offset proximity radii.
     - Closing Section: Large typography `THE NEXT WELL DOESN'T START WITH A DRILL BIT. It starts with what we already know.` with CTA `ENTER NWIS OPERATIONS`.
     - Footer: Minimal Oil India Limited context, quick links, and operational status.
  2. **Internal NWIS Operations Platform (`/app/*`):**
     - Refined application shell with sticky `Sidebar` (`OPERATIONS`, `INTELLIGENCE`, `SYSTEM`, live status pills `SYSTEM OPERATIONAL` / `API CONNECTED`), quiet `Topbar` with breadcrumbs, and layered main content view.
     - `/app` (Overview): Operations overview header, 4 key metrics, Recharts risk distribution bar chart, recent events, priority wells, and spatial overview.
     - `/app/wells` (Well Registry): Real API integration with 20 wells, search filter, field/status/type dropdowns, and tabular view linking to dossiers.
     - `/app/wells/:wellId` (Well Details Dossier): Follows exact engineering dossier hierarchy: Well Overview, Formation Profile, Recent Drilling, Historical Events, Similar Wells, Risk Assessment, and Historical Grounded Intelligence. Real backend integration on W001; graceful error state on unknown wells (W999).
     - `/app/live` (Live Operations): Standby mode displaying `SIMULATION OFFLINE` (Phase 10 WebSockets not yet implemented), 7 sensor channels (Depth, ROP, WOB, RPM, Torque, SPP, Mud Density), and telemetry chart.
     - `/app/intelligence` (Intelligence Center): Query Workbench with curated queries, top-k selector, pgvector cosine search, and clear notice that LLM generation is unconfigured locally.
     - `/app/events` (Events Explorer): Fleet-wide incident explorer with 5 filters (Well, Field, Event, Severity, Formation) and full incident table.
     - `/app/reports` (Reports): Intelligence summary dossiers with live preview generator drawer and disabled PDF export.
     - `/app/system` (System Status): Real-time connectivity probe for FastAPI, PostgreSQL, PostGIS, pgvector, XGBoost, RAG, and unconfigured LLM.
- **Next Work:** Proceed to Phase 10 (Live Telemetry & WebSocket Streaming).

## 21. Phase 9 - Grounded LLM Generation Layer (VERIFIED)

- **Status:** IMPLEMENTED & TESTED (Automated test suite tested with deterministic mocks; local runtime verified in clean `llm_not_configured` state without real external API key).
- **Core Principles & Guardrails:**
  - Strictly grounded in PostgreSQL 18.3 + pgvector 0.8.6 retrieved document chunks.
  - Zero fabrication: The model is restricted to retrieved evidence; if evidence is insufficient, it reports: *"The available historical records do not provide enough evidence to answer this."*
  - Well IDs, depths, sensor values, and formation names are preserved exactly as retrieved.
  - No generic chatbot bubbles or hallucinatory extrapolation.
- **Provider Architecture (`rag/generation/`):**
  - `BaseLLMProvider` (`rag/generation/providers/base.py`): Abstract base class defining `provider_name`, `model_name`, `is_available()`, and `generate()`. Defines custom exception hierarchy (`LLMError`, `LLMAuthenticationError`, `LLMRateLimitError`, `LLMTimeoutError`, `LLMUnavailableError`) and `LLMResult` dataclass.
  - `OpenAIProvider` (`rag/generation/providers/openai_provider.py`): Subclasses `BaseLLMProvider` wrapping OpenAI chat completions with 25s timeout and mapped exceptions.
  - Provider Factory (`rag/generation/providers/__init__.py`): `get_provider(provider_name, api_key, model)`.
  - `LLMGenerator` (`rag/generation/generator.py`): Orchestrates prompt construction, deterministic confidence evaluation (`high`/`medium`/`low`), structured evidence extraction, structured limitations, and graceful fallback across all error conditions.
- **Environment Configuration:**
  - `LLM_PROVIDER`: Default `openai` (or `none`/`disabled`).
  - `LLM_MODEL`: Configurable model name (defaults to `gpt-4o-mini`).
  - `OPENAI_API_KEY`: Secret API key read strictly from server environment.
  - Secrets are never hardcoded, never logged, never returned in API responses, and never exposed to the frontend.
- **API Response Schema Updates (`backend/app/schemas/rag.py` & `backend/app/schemas/well.py`):**
  - Extended `RagQueryResponse` and `RagHistoricalContext` with backward-compatible fields:
    - `llm`: `RagLlmStatus` (`configured`, `provider`, `model`, `status`)
    - `evidence`: `list[RagEvidenceItem]` (`well_id`, `source`, `relevance`)
    - `confidence`: `str` (`high`, `medium`, `low`)
    - `limitations`: `list[str]`
    - `grounded`: `bool` (default `True`)
  - All existing fields (`question`, `answer`, `sources`, `retrieved`, `generation_status`, `retrieval_backend`, `pgvector_enabled`, `min_similarity`, `top_k`, `embedding_model`, `embedding_dimension`, `metadata`) strictly preserved.
- **Well Intelligence Integration (`backend/app/services/intelligence_service.py`):**
  - `GET /api/wells/{well_id}/intelligence` now passes target well context (field, well type, total depth, status, offset similar wells) to `query_historical_knowledge`.
  - Seamlessly returns grounded historical context and generation status without slowing down default execution when LLM is unconfigured.
- **Frontend Intelligence UI (`frontend/src/pages/IntelligenceCenter.jsx` & `frontend/src/components/intelligence/RetrievalResults.jsx`):**
  - Query workbench with curated engineering queries (Step 11), top-K selector, and "Ask Intelligence" button with loading indicator.
  - On-demand execution: Eliminates redundant model calls on page mount.
  - Dual technical metrics header: Retrieval status (pgvector, 384-dim all-MiniLM-L6-v2) and LLM synthesis layer status (provider, model, status, grounding mode).
  - AI-Generated Historical Insight card with Grounding shield badge, confidence pill, engineering analysis, limitations notice, and graceful unconfigured advisory notice: *"LLM generation is not configured. Historical evidence retrieval remains available."*
  - Retrieved operational evidence cards showing Well ID, document name, page, cosine match %, and excerpts.
- **Testing & Verification:**
  - Comprehensive automated unit tests (`rag/tests/test_llm_generation.py`): 10 passed testing provider interface, factory, prompt formatting with well context, deterministic confidence scoring, evidence extraction, mocked successful generation, auth errors, timeouts, rate limits, and empty retrieval.
  - Integration tests (`backend/tests/test_rag.py`): 5 passed testing request validation, response schema, unconfigured status, and mocked LLM generation.
  - Full suite status: 47 passed (0 regressions).
  - Real API call status: **Not executed against a paid OpenAI account** (no external API key provided in local environment). Tested and verified against mocked provider in automated test suite, and verified live on `http://127.0.0.1:8000/api/rag/query` in clean `llm_not_configured` state returning HTTP 200 with complete pgvector evidence.

## 22. Phase 10 - Maps / Spatial Intelligence (COMPLETE & VERIFIED)

- **Status:** COMPLETE & VERIFIED
- **Route:** `/app/map` (with backward-compatible `/map` redirect and `Field Map` sidebar navigation link with `MapPin` icon).
- **Architecture:**
  ```
  PostgreSQL 18 + PostGIS (SRID 4326)
            ↓
  FastAPI Endpoints (GET /api/wells, GET /api/wells/{well_id}/similar)
            ↓
  React Frontend Client (Axios API service)
            ↓
  React-Leaflet v4.2.1 + Leaflet v1.9.4
            ↓
  OpenStreetMap (with dark petroleum tile layer styling)
  ```
- **Geospatial Data Source:**
  - Strictly uses real coordinates from the existing PostgreSQL/PostGIS `wells` table (20 wells). Zero fake coordinates or hardcoded spatial datasets.
  - Initial map center dynamically computed from dataset average (`23.75° N, 87.00° E`); bounds dynamically fitted via `useMap().fitBounds()`.
- **Top Metrics Bar:**
  - Dynamically derived from API data: Total Wells (20), Producing Wells (9), Completed Wells (10), Operational Fields (4), and Selected Target Well ID.
- **Search & Filters Toolbar:**
  - Case-insensitive search input matching Well ID (e.g. `W001`) or Field (e.g. `Field-B`).
  - Field dropdown derived dynamically from API: `All Fields`, `Field-A`, `Field-B`, `Field-C`, `Field-D`.
  - Status dropdown derived dynamically from API: `All Statuses`, `Producing`, `Completed`, `Abandoned`.
  - Well Type dropdown derived dynamically from API: `All Types`, `Development`, `Exploration`.
  - Actions: `Fit All Wells` bounds controller and `Reset Filters` button.
  - Automatic synchronization: If the currently selected well becomes hidden by active filters, selection shifts gracefully to the first visible well (no stale panels).
- **Custom Technical Marker System (`L.divIcon`):**
  - Eliminates Vite bundler missing-asset bugs associated with default Leaflet PNGs.
  - Visual hierarchy:
    - Selected Well: Petroleum amber core (`#d4973b`), pulsing animation (`marker-selected-pulse`), well ID label badge, and elevated z-index.
    - Similar Offset Wells: Cyan/blue-steel ring (`#38bdf8`) with floating similarity percentage badge (`87%`).
    - Producing Wells: Operational emerald dot (`#22c55e`).
    - Completed Wells: Technical steel dot (`#7b8c9e`).
    - Abandoned Wells: Muted slate dot (`#475569`).
  - Interactive marker popups with Well ID, Field, Status, Well Type, Total Depth, offset similarity metrics, and `View Well Dossier →` navigation button.
- **Nearby Offset Similarity Intelligence:**
  - Automatically fetches `GET /api/wells/{well_id}/similar` (10 km radius, limit 5) on well selection.
  - Renders a dashed 10 km proximity radius circle around the selected well.
  - Selected Well Spatial Profile panel displays field, type, depth, PostGIS coordinates, and sorted list of nearby offset wells with distance (km) and similarity scores.
  - Direct dossier navigation: `Open Well Dossier ({well_id})` button navigates cleanly to `/app/wells/{well_id}`.
- **Legend & Controls:**
  - Semi-transparent dark floating legend explaining all marker categories and the 10 km search circle.
  - Dark petroleum styling for Leaflet container, zoom controls, and inverted OpenStreetMap tiles (`.spatial-map-dark-tiles`).
- **Verification & Build:**
  - Frontend production build (`npm run build`): Completed with code 0 (zero errors).
  - Backend regression tests: 47 passed (0 regressions).
  - Live browser verification: Executed via browser subagent on `http://localhost:5173/app/map` verifying tile rendering, marker clicks, popups, similarity computation, Field-B search filtering, filter reset, and dossier navigation.

## 23. Phase 11 - Live Telemetry & WebSocket Streaming (COMPLETE & VERIFIED)

- **Status:** COMPLETE & VERIFIED
- **WebSocket Endpoint:** `/ws/live` (conceptual `ws://127.0.0.1:8000/ws/live`, dynamically resolved on frontend via `VITE_API_URL` or `window.location`).
- **Telemetry Frequency:** 1 Hz cadence (1 packet/second via `asyncio.sleep(1.0)`).
- **Telemetry Data Schema (`backend/app/schemas/telemetry.py`):**
  - Seven physical parameters: `depth` (m), `rop` (m/hr), `wob` (kN), `rpm` (RPM), `torque` (kN·m), `standpipe_pressure` (psi), `mud_density` (g/cm³).
  - Risk block: `label` (e.g. `NORMAL`, `HIGH_TORQUE`, `MUD_LOSS`, `STUCK_PIPE`), `class_id` (0–3), `probability` (0.0–1.0), and full softmax distribution `probabilities` (`NORMAL`, `STUCK_PIPE`, `MUD_LOSS`, `HIGH_TORQUE`).
- **Telemetry Simulator (`backend/app/services/telemetry_simulator.py`):**
  - Generates realistic sequential drilling physics; depth progresses realistically based on active ROP (`depth += (rop / 3600.0)`).
  - Maintains continuous internal state with realistic sensor jitter and smooth interpolation towards scenario targets.
  - Strictly synthetic demonstration: Telemetry is calibrated benchmark simulation and never claimed to be real Oil India SCADA data.
  - Zero output class forcing: Simulator modifies physical input features only; the existing trained XGBoost classifier remains the sole source of truth.
  - Controlled Scenarios:
    - `automatic`: Cycles through baseline drilling (30s) → high torque surge (15s) → recovery (10s) → mud loss drop (15s) → recovery (10s) → tight hole/stuck pipe (15s) → recovery.
    - `normal`: Continuous steady baseline drilling.
    - `high_torque`: High torque surge (`torque` > 30 kN·m, `rop` drop).
    - `mud_loss`: SPP drop (`standpipe_pressure` < 1600 psi, `mud_density` drop).
    - `stuck_pipe`: ROP collapse (`rop` < 5 m/hr, elevated `torque` and `wob`).
- **XGBoost Integration (`backend/app/services/risk_service.py`):**
  - Zero model reloading per message: Reuses loaded `ml/models/risk_model.joblib` via `predict_drilling_risk`.
  - Same preprocessing and inference pipeline as `POST /api/risk/predict`.
- **Database Non-Persistence (In-Memory Streaming):**
  - Strictly streams in memory. Zero database writes per tick (`drilling_logs` table remains unmutated).
- **Backend WebSocket Architecture (`backend/app/api/websocket.py`):**
  - Protocol actions: `start`, `stop` (pause), `set_scenario`, `ping`.
  - Well ID validation: Verifies target well exists in PostgreSQL database (rejects invalid wells such as `W999` with structured error).
  - Per-connection isolation: Each client session maintains independent simulator state; no shared mutable state.
  - Task lifecycle management: Server-side publisher task `asyncio.Task` is cancelled immediately on client disconnect to guarantee zero orphaned background tasks.
- **Frontend Hook (`frontend/src/hooks/useLiveTelemetry.js`):**
  - Custom hook managing WebSocket lifecycle, URL resolution, and message parsing.
  - Connection states: `DISCONNECTED`, `CONNECTING`, `LIVE`, `RECONNECTING`, `ERROR`.
  - Exponential backoff reconnection (1s, 2s, 4s, ... max 10s).
  - Stale socket protection preventing React StrictMode double-mount race conditions.
  - Bounded memory buffers: Telemetry history capped at `maxHistory` (60 frames), risk history capped at 30 items.
- **Frontend Operations Dashboard (`frontend/src/pages/LiveOperations.jsx`):**
  - Retains existing route `/app/live`.
  - Prominent disclaimer banner: *"SIMULATED LIVE TELEMETRY: Demonstrating 1 Hz streaming architecture and real-time XGBoost hazard inference across sequential drilling dynamics. Calibrated benchmark simulation, not actual Oil India production SCADA."*
  - Live status indicator: `● LIVE STREAMING · 1 Hz` with pulsing green dot.
  - Target Well Selector: Populated from `GET /api/wells` (`W001`–`W020`).
  - Simulation Scenario Selector: Dropdown for automatic or manual scenario injection.
  - Stream Controls: `[ Pause Stream ]` / `[ Start Stream ]` and `[ Reconnect ]`.
  - Telemetry Channels status strip: 7 sensor status pills with `1.0 Hz (Synchronized)`.
  - 7 Metric Cards: Real-time values, engineering units, and min/max reference gauges.
  - Multi-channel Recharts Chart: Streaming dynamics line chart (ROP, Torque, WOB, SPP).
  - Risk Monitor Panel: Model prediction badge, confidence percentage, softmax distribution bars, and scrolling prediction history log.
- **Testing & Verification:**
  - Backend integration tests (`backend/tests/test_websocket.py`): 7 dedicated tests covering handshake, schema validation, 7 feature presence, XGBoost predictions, start/pause controls, invalid well rejection, scenario switching, ping/pong, and model fallback.
  - Full backend test suite: **54 passed, 0 failures** (`backend/tests`: 25, `rag/tests`: 27, `ml/tests`: 2).
  - Frontend production build: `npm run build` succeeded with code 0 in 4.99s.
  - Headless browser verification: Executed on `http://localhost:5173/app/live` confirming live 1 Hz streaming, updating metric cards, dynamic Recharts plots, and real-time XGBoost classification.
  - Route regression verification: `/`, `/app`, `/app/wells`, `/app/wells/W001`, `/app/map`, `/app/live`, `/app/intelligence`, `/app/events`, `/app/reports`, `/app/system` all functional.

## 24. Phase 14 - Gemini LLM Integration (IMPLEMENTED; MOCK-VERIFIED)

- **Provider architecture:** Added `GeminiProvider` under the existing `rag/generation/providers/` abstraction; OpenAI remains supported and unchanged. The provider factory accepts `LLM_PROVIDER=gemini`.
- **SDK and configuration:** Uses the official `google-genai` Python SDK lazily on the backend only. `GEMINI_API_KEY` and optional `GEMINI_MODEL` (default `gemini-3.8-flash`) are documented in `backend/.env.example`; no credentials are committed, logged, or returned.
- **Grounding:** `rag/generation/context_builder.py` normalizes only already-retrieved well metadata, formations, similar wells, historical events, latest synthetic telemetry, XGBoost prediction, active simulated alerts, and pgvector evidence. Gemini receives no database session or SQL capability. Prompts explicitly treat retrieved content as untrusted data, reject embedded instructions, require synthetic-data labelling, and prohibit calling predictions or simulated alerts confirmed incidents.
- **Generation endpoint:** Added `POST /api/intelligence/query` for a selected well and question. It reuses the existing intelligence orchestration, alert service, XGBoost prediction, and RAG retrieval, then validates structured generation output with Pydantic. Evidence and risk metadata are backend-owned and preserved on missing configuration, malformed output, or provider failure. `POST /api/rag/query` remains unchanged.
- **Frontend:** `/app/intelligence` now includes a well selector and grounded natural-language query panel showing answer, findings, XGBoost context, evidence, limitations, loading, and error states.
- **Verification:** 7 deterministic Gemini/context/endpoint tests passed and 16 combined generation tests passed without any live Gemini request. `npm run build` passed. Complete legacy pytest execution exceeded the environment's 30-second command window during database-backed RAG cases, so it is not claimed as a full-suite pass in this phase.
- **Live-provider check (2026-09-30):** The official SDK was installed and a configured-key request reached Gemini using `gemini-3.8-flash`. A subsequent request received Google’s transient high-demand 503 response, correctly mapped to `llm_unavailable`; no successful live structured answer is claimed. `gemini-2.5-flash` was rejected by Google as unavailable to new users, so the default was updated to `gemini-3.8-flash`.
- **RAG runtime reliability:** Sentence-transformer loading now defaults to cached-only mode (`EMBEDDING_LOCAL_FILES_ONLY=true`) to prevent unavailable Hugging Face metadata checks from delaying intelligence queries. A live `POST /api/intelligence/query` request for W005 returned HTTP 200 in approximately six seconds with preserved evidence.
- **Known limitation:** Successful live structured generation, quota behavior, and endpoint-level verification remain pending a non-busy Gemini service response. The API key is stored only in ignored `backend/.env` and should be rotated because it was shared in chat.
