JobMatch AI Dashboard – Agent Guide

This file is the authoritative, detailed handoff for agents maintaining or extending the project. It describes the intent, architecture, behavior, tooling, known issues, decisions, and next steps so work can continue seamlessly.

**Purpose And Goals**

- Compare a resume to a job description, extract skills, compute a transparent match score, show matched and missing skills, and provide concise suggestions.
- Demonstrate a clean, testable FastAPI backend and a modern Next.js frontend with a polished look and a small footprint.
- Include optional AI enhancements (OpenAI) while keeping a clear non-AI baseline.
- Provide a basic job search experience (Remotive) to feed real descriptions.
- Ship with SQLite persistence, unit tests, Makefile automation, and CI.

**High-Level Architecture**

- Frontend: Next.js 14 App Router in `frontend/` using Tailwind. Pages: `/`, `/dashboard`, `/analysis`, `/analytics`, `/settings`, `/jobs`.
- Backend: FastAPI in `backend/app.py`. Core logic in `backend/src/jobmatch/`.
- Persistence: SQLite via `jobmatch.storage` (optional, file path via env `DB_PATH`, default `jobmatch.db`).
- AI integration: OpenAI (server-side only) via `jobmatch.ai`. Fully optional; app works if disabled.
- Jobs provider: Remotive (no API key required). Exposed via `/jobs/categories` and `/jobs/search`.
- CI: GitHub Actions runs backend tests (AI disabled) and builds the frontend.
- Tooling: uv for Python venv management and pip installs; Makefile orchestrates dev tasks.

**Backend Modules (backend/src/jobmatch/)**

- `parser.py`: Lowercasing and non-alphanumeric cleanup. `extract_skills(text, alias_map)` returns a set of canonical skills via substring search on a normalized buffer with space-padding to reduce false positives.
- `scorer.py`: Set overlap scoring. `match_score(job_skills, resume_skills)` and `evaluate(job_skills, resume_skills)` produce score, matched, and missing sets.
- `config.py`: Loads default skills, alias map (canonicalization), OpenAI flags, and env (`EXTRA_SKILLS`, `DB_PATH`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_ENABLED`).
- `analyzer.py`: Baseline analysis pipeline using parser + scorer + non-AI suggestions, plus optional AI merge. If AI returns additional skills or a semantic score, merges them and blends score.
- `ai.py`: Safe OpenAI calls. Three capabilities:
  - `enhance_with_openai`: resume/job skills, semantic score, suggestions (JSON only).
  - `resume_feedback`: quick suggestions (JSON only) with truncation and guardrails.
  - `cover_letter`: tailored letter text with token budget and tone.
- `storage.py`: SQLite schema and helpers. `init_db` ensures schema and optional columns are present. `save_analysis`, `fetch_recent`, `fetch_by_id` return JSON-friendly structures.
- `providers/remotive_client.py`: Async HTTP client via httpx, category and job search, with minimal caching in `providers/cache.py`.
- `providers/models.py`: Dataclasses for jobs and categories.

**Backend API Endpoints (backend/app.py)**

- GET `/health`: Basic service liveness.
- POST `/analyze`: Body `{resume_text, job_text}`. Returns `{ok, result}` where result contains `score`, `matched_skills`, `missing_skills`, `resume_skills`, `job_skills`, and `suggestions`.
- POST `/save`: Persists analysis with optional job metadata. Returns `{ok, id}`.
- GET `/recent?limit=`: Returns latest analyses with key fields.
- GET `/analysis/{id}`: Full historical analysis, including stored texts and metadata.
- POST `/upload-resume`: Accepts `.pdf`, `.docx`, `.txt`. Extracts text.
- POST `/ai/feedback`: AI suggestions (or heuristic fallback) for a given resume and optional job.
- POST `/ai/cover-letter`: Tailored cover letter (fallback template if AI disabled).
- GET `/jobs/categories`: Remotive categories.
- GET `/jobs/search?query=&location=&category=&job_type=&page=&per_page=`: Remotive-backed search. Post-filters title, company, location, description, and tags by tokens. If strict all-tokens yields zero, falls back to any-token to avoid empty UI.

Notes
- Basic input size limits are in place for AI endpoints.
- CORS is open in dev; control via `ALLOWED_ORIGINS` in `.env` for deploys.

**Frontend App (Next.js 14, Tailwind)**

- Global nav: `frontend/components/TopNav.tsx`. Fixed, minimal links: Dashboard, Analysis, Analytics, Settings, Jobs.
- Page toolbar: `frontend/components/PageToolbar.tsx`. Title, search input slot, and right-aligned actions.
- Landing (`/`): Hero, How it works, CTA, footer (Stitch-inspired styling).
- Dashboard (`/dashboard`): Cards for average score, counts; recent analyses table from `/recent`.
- Analysis (`/analysis`):
  - Two textareas for resume and job description.
  - Upload (.pdf/.docx/.txt) to `/upload-resume`.
  - Analyze button calls `/analyze`; auto-saves to `/save` afterward.
  - History sidebar fetches `/recent`; entries load full analysis via `/analysis/{id}`.
  - Live AI feedback card (debounced) hits `/ai/feedback`; shows suggestions and bullet rewrites with copy buttons.
  - Cover letter generator calls `/ai/cover-letter` with a tone and shows editable text.
  - Save button for manual persistence. Undo toast for auto-save and duplicate flows restores prior inputs and recomputes.
- Jobs (`/jobs`):
  - Filters: query, location, category, job_type.
  - Pagination: page/per_page with total; 25/50/75/100 options.
  - Favorites: localStorage-backed star toggle and toolbar tabs (All, Favorites).
  - Quick View drawer: full HTML description, tags, metadata, and CTAs (Open Original, Use this job).
  - AbortController cancels in-flight searches on rapid filter changes.
  - Uses `/jobs/categories` and `/jobs/search`.
- Analytics (`/analytics`):
  - Metrics: totals, averages, best score, last 7 days volume.
  - Trend chart: 7-day score line (SVG), day labels.
  - In-demand skills: frequency bars from matched skills.
  - Recent table and CSV export.
- Settings (`/settings`): Static profile and toggles, styled placeholder.
- Styling: Tailwind with custom theme in `frontend/tailwind.config.js`. Avoids nested component libraries to keep footprint small.

**Data Flow And Persistence**

- Typical flow: Paste or upload resume -> paste job -> Analyze -> backend computes baseline and merges AI results -> frontend shows score, skills, suggestions -> auto-save to SQLite -> history updates -> you can load or duplicate.
- When selecting a job from Jobs, we persist `jobmatch:selected_job_meta` and `jobmatch:selected_job_description` in localStorage so Analysis can preload and auto-save on first analyze.

**Environment And Secrets**

- `.env.example` documents env variables. Do not commit real `.env` or keys.
- Frontend `.env.local` is intentionally ignored. A `.env.local.example` exists for guidance.
- Relevant vars:
  - `DB_PATH` (default `jobmatch.db`)
  - `ALLOWED_ORIGINS` (dev defaults open)
  - `OPENAI_API_KEY` (server-side only)
  - `OPENAI_MODEL` (default `gpt-5` in code; adjust to available model)
  - `OPENAI_ENABLED` (set to `true` to enable OpenAI features)
  - `NEXT_PUBLIC_API_BASE_URL` for the frontend

**Dev Tooling And Commands**

- uv-based Makefile (preferred for Python toolchain isolation):
  - `make dev`: recreate venv, install with uv, run Uvicorn on port 8000.
  - `make frontend`: install and run Next.js dev server on port 3000.
  - `make test`: run backend unit tests with AI disabled.
  - `make lint` and `make format`: ruff and black for backend.
  - `make clean`: remove caches.

Apple Silicon specifics
- We always delete `.venv` and recreate it.
- We pick a same-arch Python (prefer Homebrew arm64, then `/usr/bin/python3`) and skip CommandLineTools shim to prevent x86_64 wheels.
- If no arm64 Python is found, we fail fast and point to `brew install python@3.12`.

**Continuous Integration**

- `.github/workflows/ci.yml` has two jobs:
  - Backend: setup Python, install requirements, run tests with `OPENAI_ENABLED=0` and `PYTHONPATH=backend/src`.
  - Frontend: setup Node 20, `npm ci`, `npm run build`.

**Tests**

- `backend/tests/test_scorer.py`: overlap math and sets.
- `backend/tests/test_analyzer.py`: end-to-end analyzer with baseline scoring and basic assertions.
- Provider and API tests are stubbed or skipped in some environments that lack FastAPI binary deps.

**Known Issues And Fixes (Decision Log)**

- uv run `-r` unsupported: resolved by switching to `uv venv` and `uv pip`.
- Apple Silicon pydantic_core architecture ImportError: fixed by always recreating `.venv`, selecting a same-arch interpreter, and skipping CommandLineTools shim. Makefile encodes this.
- Next.js type error in Analysis: added missing state (`toastMsg`, `undoOpen`, etc.) and toasts.
- Jobs search zero-results: added any-token fallback to avoid empty pages.
- Search concurrency: AbortController added to cancel stale requests.

**Open PRs**

- PR #1 `fix/uv-arch-make`: Ensures uv venv matches host arch on macOS; always recreates venv; prefers Homebrew arm64 Python; fixes shell quoting. Merge when verified locally.

**Next Steps (Prioritized)**

1. Verify Makefile flow on target machines and merge PR #1. Consider pinning Python version to 3.12 in docs and CI.
2. Add provider toggle or fallback (e.g., Adzuna) to improve job coverage for certain queries.
3. Add request de-duplication and in-flight marker to Jobs to debounce user input.
4. Improve a11y (focus rings, aria labels) across buttons and drawers; add keyboard close for Quick View.
5. Add tests for `/analysis/{id}` and `/ai/feedback` heuristic fallbacks.
6. Add PR templates and CONTRIBUTING.md to guide future changes.
7. Optional: Dockerfiles for backend and frontend for deploy parity (keep simple).
8. Add production config notes (ALLOWED_ORIGINS, DB_PATH location, OPENAI_ENABLED false by default).

**Style And Quality Constraints**

- Prefer small, single-purpose functions and minimal abstractions.
- Keep logic explicit and readable; avoid black-boxes except behind clearly marked AI calls.
- Handle errors gracefully and return safe defaults; never crash the whole app for a single provider failure.
- Keep frontend self-contained and light; avoid heavy component frameworks.

**What Can Be Modified**

- You may modify backend code under `backend/src`, tests under `backend/tests`, frontend files under `frontend/`, docs, scripts, and Makefile.
- Do not add secrets. Do not remove safety checks. Keep public behavior consistent or document changes.

**Quick Commands**

- Backend dev: `make dev` (then open http://localhost:8000/docs)
- Frontend dev: `make frontend` (then open http://localhost:3000)
- Tests: `make test`
- Lint/Format: `make lint` / `make format`
- Build frontend for prod: `npm --prefix frontend run build`

**Contact And Ownership**

- Repo: https://github.com/Oluwasegun-rm/jobmatch-dashboard
- Default branch: `main`
- Active branch for Makefile fix: `fix/uv-arch-make` (PR #1)

If you inherit this project mid-flight, start by running `make dev` and `make frontend` on your machine. Confirm the venv arch line shows `arm64` on Apple Silicon, and verify both the backend OpenAPI docs and the Next app load. Then proceed with the Next Steps list above.
