JobMatch AI Dashboard – Agent Guide

Purpose and Goals

This project is a polished, beginner-friendly portfolio that compares a resume to a job description, extracts skills, computes a match score, identifies missing keywords, and provides simple suggestions. The goal is to demonstrate clean Python, data processing basics, a usable Streamlit dashboard, optional storage, tests, and automation-ready structure.

Architecture Overview

- Frontend: Next.js app (`frontend/`) renders inputs and results, and calls backend APIs.
- Backend: FastAPI service (`backend/app.py`) exposes `/analyze`, `/save`, and `/recent`.
- Core logic lives in small, testable modules under `backend/src/jobmatch/`:
  - `parser.py`: text normalization and keyword extraction
  - `scorer.py`: overlap and score computation
  - `analyzer.py`: orchestrates parsing + scoring + suggestions
  - `config.py`: skill vocabulary and environment config
  - `storage.py`: minimal SQLite persistence
- Tests validate key logic for analyzer and scorer under `backend/tests/`.

Folder Responsibilities

- `frontend/`: Streamlit-based UI
- `backend/`: FastAPI app and core modules
- `backend/src/jobmatch/`: Core logic and config
- `backend/tests/`: Pytest-based unit tests for core logic
- `data/`: Example datasets (CSV for sample jobs)
- `docs/`: Additional documentation (high-level overview)
- `scripts/`: Small utilities (e.g., seeding data)

Coding Rules and Conventions

- Prefer small, single-purpose functions
- Use clear, descriptive names and type hints where helpful
- Handle errors gracefully; return safe defaults when feasible
- Keep dependencies minimal and avoid unnecessary abstractions
- No hardcoded secrets; load via environment variables
- Prefer pure functions in core logic for testability
- Keep comments short and useful; avoid explaining the obvious

How Agents Should Operate

1. Read before changing. Skim `README.md`, `AGENTS.md`, and the module you plan to modify.
2. Keep changes minimal and focused. The best change is the smallest correct one.
3. Maintain working state. Prefer incremental improvements that keep the app and tests passing.
4. Update or add tests if behavior changes materially.
5. Do not introduce new frameworks or background services without explicit need.
6. Use existing patterns and structure; avoid new layers unless necessary.

What Can and Cannot Be Modified

- Can modify: files under `src/`, tests under `tests/`, docs, scripts, and Makefile as needed to maintain or improve the MVP.
- Avoid: breaking the public behavior of the Streamlit app without a compelling reason.
- Do not add secrets or remove safety checks. Do not introduce overly complex abstractions.

Implementation Priorities

1. The app must work end-to-end with a clean UI.
2. Keep logic transparent and understandable (keyword-based skills, readable rules).
3. Maintain test coverage for analyzer and scorer.
4. Ensure storage interactions are safe and optional.
5. Improve iteratively; ship small, verifiable changes.

Assumptions Policy

- If requirements are ambiguous, prefer the simpler behavior.
- Ask for clarification only when necessary to avoid incorrect changes.
- Document assumptions briefly in code comments or commit messages when relevant.
