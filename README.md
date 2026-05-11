JobMatch AI Dashboard

Professional, well-documented template for comparing a resume to a job description, extracting skills, computing a match score, and offering suggestions. Frontend is Next.js; backend is FastAPI; optional OpenAI features and SQLite storage.

Purpose

JobMatch AI Dashboard is a simple, polished portfolio project that compares a resume against a job description, extracts relevant skills, computes a match score, identifies missing keywords, and proposes suggestions to improve the resume for the target role.

Features

- Paste resume text and job description directly into the app
- Clean, keyword-based skill extraction (transparent and editable)
- Match score based on overlap between job-required and resume-present skills
- Clear lists of matched and missing skills
- Actionable, plain-language suggestions to improve alignment
- Optional SQLite persistence for saving analysis results
- Beginner-friendly, readable Python with small functions and type hints

Tech Stack

- Frontend: Next.js (React), Tailwind CSS
- Backend: Python 3.9+, FastAPI, SQLite (stdlib)
- Tooling: Pytest, Ruff, Black, python-dotenv

Quick Start

1. Clone or open this folder
2. Backend setup
   - Create and activate a virtualenv
     - macOS/Linux: `python3 -m venv .venv && source .venv/bin/activate`
     - Windows (PowerShell): `py -m venv .venv; .venv\\Scripts\\Activate.ps1`
   - Copy `.env.example` to `.env` and edit if desired
   - Install backend deps: `make backend-install`
   - Run backend API: `make backend-run` (http://localhost:8000)
     - First run may show messages like "satisfying dependency requirements" while uv installs deps; it will then start Uvicorn
     - If `uv` is not installed, it will auto-fallback to system Python
     - You can also run explicitly without uv: `make backend-run-plain`
3. Frontend setup
   - `cd frontend && npm install`
   - `npm run dev` (http://localhost:3000)
   - Ensure `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` points to the backend (default http://localhost:8000)

Tests

- Run unit tests (backend): `make test`

Makefile Commands

- `make backend-install` — Install backend Python requirements
- `make backend-run` — Run FastAPI with Uvicorn (via uv)
- `make backend-run-plain` — Run FastAPI with Uvicorn (system Python)
- `make frontend-install` — Install frontend npm packages
- `make frontend-dev` — Run Next.js dev server
- `make dev` — Start backend (convenience)
- `make test` — Run backend tests with pytest
- `make lint` — Lint backend with ruff
- `make format` — Auto-format backend with ruff (fix) and black
- `make clean` — Remove caches and temporary files

Folder Structure

jobmatch-ai-dashboard/
- README.md
- AGENTS.md
- Makefile
- .gitignore
- .env.example
- frontend/
  - app/
    - layout.tsx
    - page.tsx
  - styles/globals.css
  - package.json
  - tailwind.config.js
  - postcss.config.js
  - next.config.mjs
- backend/
  - app.py
  - requirements.txt
  - src/
    - jobmatch/
      - __init__.py
      - analyzer.py
      - parser.py
      - scorer.py
      - storage.py
      - config.py
  - tests/
    - __init__.py
    - test_analyzer.py
    - test_scorer.py
- data/
  - sample_jobs.csv
- docs/
  - project_overview.md
- scripts/
  - seed_data.py

Usage Notes

- The app uses a simple, explicit vocabulary and alias list for skills. Edit `backend/src/jobmatch/config.py` to adjust skills or add aliases. You can also provide extra comma-separated skills via `EXTRA_SKILLS` in `.env`.
- The SQLite database file path defaults to `jobmatch.db` in the project root. Override via `DB_PATH` in `.env`.
- For local dev CORS, backend allows all origins by default. Set `ALLOWED_ORIGINS` in `.env` when deploying.

CI

- GitHub Actions workflow at `.github/workflows/ci.yml` runs backend tests and builds the frontend on pushes and pull requests to `main`.

Future Improvements

1. Weighted scoring by importance/frequency in the job description
2. Section-aware parsing (experience vs. summary vs. skills)
3. Export analysis as PDF/Markdown
4. Optional semantic matching (e.g., embeddings) while keeping the keyword system as a transparent baseline
5. Multi-resume comparison and batch processing
6. Advanced analytics views and filters in the dashboard
