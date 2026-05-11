Project Overview

JobMatch AI Dashboard is a portfolio-ready, keyword-based matcher that compares a resume to a job description. It extracts skills using a transparent vocabulary, computes a simple overlap score, highlights matched and missing skills, and suggests concrete improvements.

Design Principles

- Keep it simple: readable functions, clear names, minimal surface area
- Transparent logic: keyword skills and aliases you can tweak in `src/config.py`
- Reliability: safe defaults and graceful failure modes
- Testable core: suggestions and scoring are decoupled from the UI

Key Modules

- `backend/src/jobmatch/parser.py` — normalization and keyword extraction
- `backend/src/jobmatch/scorer.py` — overlap computation and scoring
- `backend/src/jobmatch/analyzer.py` — orchestration and suggestions
- `backend/src/jobmatch/storage.py` — minimal SQLite save + fetch
- `backend/app.py` — FastAPI service that exposes analyze/save/recent
- `frontend/app.py` — Streamlit UI to collect input and display results via API

Data

- `data/sample_jobs.csv` includes three example roles you can use for demos

Running Locally

- Install: `make install`
- Run UI: `make run`
- Tests: `make test`

Next Steps (Optional)

- Add weights to skills and adjust scoring
- Expose an API for automation
- Enrich suggestions with section-aware parsing or metrics prompts
