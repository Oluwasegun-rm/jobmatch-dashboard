PY := python3
PIP := $(PY) -m pip
PYTEST := $(PY) -m pytest

.PHONY: install backend-install backend-run frontend-install frontend-dev dev test lint format clean frontend

install: backend-install

backend-install:
	$(PIP) install -r backend/requirements.txt

backend-run:
    @# Prefer uv if available (faster, reproducible). Falls back to system Python.
    @if command -v uv >/dev/null 2>&1; then \
        echo "[backend] Starting with uv (first run may install deps)…"; \
        PYTHONPATH=backend/src uv run -r backend/requirements.txt python -m uvicorn backend.app:app --reload --port 8000; \
    else \
        echo "[backend] uv not found, starting with system Python"; \
        PYTHONPATH=backend/src python -m uvicorn backend.app:app --reload --port 8000; \
    fi

# Fallback if 'uv' is not installed
backend-run-plain:
    PYTHONPATH=backend/src python -m uvicorn backend.app:app --reload --port 8000

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

dev: backend-install backend-run

test:
	OPENAI_ENABLED=0 PYTHONPATH=backend/src $(PYTEST) -q backend/tests

lint:
	ruff check backend

format:
	ruff check --fix backend || true
	black backend

clean:
	rm -rf .pytest_cache .ruff_cache .mypy_cache
	rm -rf **/__pycache__ */**/__pycache__

frontend:
	npm --prefix frontend install && npm --prefix frontend run dev
