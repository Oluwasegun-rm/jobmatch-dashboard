PY := python3
PIP := $(PY) -m pip
PYTEST := $(PY) -m pytest
VENV ?= .venv

.PHONY: install backend-install backend-run frontend-install frontend-dev dev test lint format clean frontend

install: backend-install

backend-setup:
	@if ! command -v uv >/dev/null 2>&1; then \
		echo "uv is required. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"; \
		exit 1; \
	fi
	uv venv $(VENV)

backend-install: backend-setup
	uv pip install --python $(VENV)/bin/python -r backend/requirements.txt

backend-run: backend-install
	PYTHONPATH=backend/src $(VENV)/bin/python -m uvicorn backend.app:app --reload --port 8000

# Alias
backend-run-plain:
	$(MAKE) backend-run

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

dev: backend-run

test: backend-install
	OPENAI_ENABLED=0 PYTHONPATH=backend/src $(VENV)/bin/python -m pytest -q backend/tests

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
