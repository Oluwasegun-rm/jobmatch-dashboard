JobMatch AI Dashboard
=====================

Compare a resume to a job description, extract skills, compute a transparent match score, surface matched/missing skills, and show concise improvement suggestions. Clean FastAPI backend, modern Next.js frontend, optional OpenAI enhancements, and SQLite persistence.

Links
- Frontend (Vercel): https://jobmatch-dashboard.vercel.app
- Backend (Railway): https://jobmatch-dashboard-production.up.railway.app

Features
- Analysis: paste/upload resume + paste job description
- Transparent skill extraction and overlap score (keyword-based baseline)
- Optional AI assist (GPT‑5 or fallback): multi-sentence narrative explanation and suggestions
- Jobs page (Remotive): filters, quick preview, select “Use this job” → Analysis
- Persistence (SQLite): auto-save analysis, history, and user-scoped recent
- Authentication: username/password with display name; JWT-like HMAC tokens
- Docker-first dev experience and CI

Architecture
- Frontend: Next.js 14 (App Router), Tailwind
- Backend: FastAPI, Python 3.12, SQLite
- Providers: Remotive API via httpx, tiny in-memory TTL cache
- AI: OpenAI SDK (chat.completions JSON-mode → retry → Responses API), conservative scoring and narrative guardrails

Screenshots
- Analysis, Jobs, and Settings pages fit a cohesive, minimal visual language (add images in docs/ when available)

Quick Start (Docker-first)
1. Set your OpenAI key (optional for baseline; required for AI narrative):
   export OPENAI_API_KEY=sk-...
   Optional: export OPENAI_FALLBACK_MODEL=gpt-4o-mini
2. Start backend (Docker):
   make dev
   Backend runs on http://localhost:8000; logs show AI and CORS configs
3. Start frontend:
   cd frontend && npm install && npm run dev
   Open http://localhost:3000 (NEXT_PUBLIC_API_BASE_URL should point to http://localhost:8000)

Auth
- Signup: POST /auth/signup (username, password, optional display_name)
- Login: POST /auth/login → returns token and user
- Me: GET /auth/me (bearer token) → returns user (DB-backed)
- Update display name: POST /auth/display-name
- Change username: POST /auth/change-username → returns refreshed token
- Change password: POST /auth/change-password

Core Endpoints
- GET /health → { status: ok }
- POST /analyze → returns score, matched/missing, AI narrative (when enabled)
- POST /save → persists result (user-scoped when authorized)
- GET /recent → latest analyses (authorized returns user’s items)
- GET /analysis/{id} → load a saved analysis
- Jobs: GET /jobs/categories, GET /jobs/search (tokenized post-filter + pagination)

Environment
- Backend
  - OPENAI_API_KEY: your key (required for AI features)
  - OPENAI_MODEL: default gpt-5
  - OPENAI_FALLBACK_MODEL: optional fallback (e.g., gpt-4o-mini)
  - OPENAI_ENABLED: true/false (true by default in Docker)
  - DB_PATH: SQLite path (default jobmatch.db)
  - AUTH_SECRET_KEY: HMAC secret for tokens (falls back to OPENAI_API_KEY or dev-secret)
  - ALLOWED_ORIGINS: comma-separated list of allowed origins (no quotes)
  - ALLOWED_ORIGIN_REGEX: optional regex (e.g., ^https://.*\.vercel\.app$)
- Frontend
  - NEXT_PUBLIC_API_BASE_URL: base URL of backend (e.g., http://localhost:8000 or Railway URL)

Testing
- Backend (local): make test
- Backend (Docker): make test-docker
- CI: GitHub Actions runs tests and builds frontend on pushes/PRs to main

Troubleshooting
- Apple Silicon (local Python wheels): use Docker (make dev) or Homebrew Python arm64. See AGENTS.md.
- CORS (prod on Vercel/Railway): set ALLOWED_ORIGINS to your Vercel URL without quotes or use ALLOWED_ORIGIN_REGEX for previews. The backend now explicitly handles OPTIONS preflight and echoes Access-Control-Allow-Origin for allowed origins.
- AI 400 errors: some accounts/models reject response_format; the backend auto-retries and can fall back to Responses API or a fallback model.

Contributing
- See CONTRIBUTING.md for workflow, commit style, and PR guidance.

License
- MIT (see LICENSE)

Credits
- Remotive API for job listings; OpenAI SDK for optional AI assist; FastAPI and Next.js communities.
