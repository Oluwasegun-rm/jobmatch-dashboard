PY := python3
PIP := $(PY) -m pip
PYTEST := $(PY) -m pytest
VENV ?= .venv
# Allow overriding backend port: use `PORT=8001 make dev`
PORT ?= 8000
# Detect host arch (arm64 on Apple Silicon)
HOST_ARCH := $(shell uname -m)
# Prefer Homebrew arm64 Python on Apple Silicon if present
PYPATH := $(shell if [ -x /opt/homebrew/bin/python3 ]; then echo /opt/homebrew/bin/python3; else echo python3; fi)

.PHONY: install backend-install backend-run frontend-install frontend-dev dev test lint format clean frontend docker-up docker-down test-docker

install: backend-install

backend-setup:
	@if ! command -v uv >/dev/null 2>&1; then \
		echo "uv is required. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"; \
		exit 1; \
	fi
	@# Always recreate venv to avoid stale/mismatched wheels
	rm -rf "$(VENV)"
	@# Pick a Python that matches host arch (prefer /usr/bin on macOS, then Homebrew)
	PY_CAND=""; \
	if [ -n "$(PYEXE)" ] && [ -x "$(PYEXE)" ]; then \
		PY_CAND="$(PYEXE)"; \
	else \
		for C in /opt/homebrew/bin/python3 /usr/bin/python3 `command -v python3 2>/dev/null || true`; do \
			if [ -n "$$C" ] && [ -x "$$C" ]; then \
				EXE=`"$$C" -c 'import sys; print(sys.executable)' 2>/dev/null || echo $$C`; \
				case "$$EXE" in *CommandLineTools*|*Python.framework*) continue ;; esac; \
				CARCH=`"$$C" -c 'import platform; print(platform.machine())' 2>/dev/null || echo unknown`; \
				if [ "$$CARCH" = "$(HOST_ARCH)" ]; then PY_CAND="$$C"; break; fi; \
			fi; \
		done; \
	fi; \
	if [ -z "$$PY_CAND" ]; then \
		echo "[backend] Could not find a Python matching arch $(HOST_ARCH)."; \
		echo "[backend] On Apple Silicon, install Homebrew Python and retry:"; \
		echo "  brew install python@3.12"; \
		echo "Or specify it explicitly: PYEXE=/opt/homebrew/bin/python3 make dev"; \
		exit 1; \
	fi; \
	echo "[backend] Using python: $$PY_CAND"; \
	uv venv -p "$$PY_CAND" "$(VENV)"
	@"$(VENV)/bin/python" -c 'import platform, sys; print("[backend] venv:", platform.machine(), sys.executable)'

backend-install: backend-setup
	uv pip install --python $(VENV)/bin/python -r backend/requirements.txt

backend-run: backend-install
	# Quick sanity check to catch pydantic_core arch issues early
	@PYTHONPATH=backend/src $(VENV)/bin/python -c "import pydantic_core" 2>/dev/null || (echo "[backend] Failed to import pydantic_core. Use Homebrew Python 3.12 (arm64) and re-run: brew install python@3.12 && make clean && PYEXE=/opt/homebrew/bin/python3 make dev" && exit 1)
	PYTHONPATH=backend/src $(VENV)/bin/python -m uvicorn backend.app:app --reload --port $(PORT)

# Alias
backend-run-plain:
	$(MAKE) backend-run

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

# Default dev uses Docker to avoid local Python issues
dev: docker-up

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

test-docker:
	@if docker compose version >/dev/null 2>&1; then \
		docker compose build backend >/dev/null && docker compose run --rm -e OPENAI_ENABLED=0 backend sh -lc 'PYTHONPATH=/app:/app/backend/src pytest -q tests'; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		docker-compose build backend >/dev/null && docker-compose run --rm -e OPENAI_ENABLED=0 backend sh -lc 'PYTHONPATH=/app:/app/backend/src pytest -q tests'; \
	else \
		echo "Docker Compose not found. Install Docker Desktop."; \
		exit 1; \
	fi
docker-up:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "Docker is required. Install Docker Desktop and retry."; \
		exit 1; \
	fi
	# Ensure Docker engine is running; if not, try to start Colima automatically if available
	@if ! docker system info >/dev/null 2>&1; then \
		if command -v colima >/dev/null 2>&1; then \
			echo "[docker] Starting Colima (Docker engine)..."; \
			colima start >/dev/null 2>&1 || true; \
			echo "[docker] Waiting for Docker engine to be ready..."; \
			I=0; while ! docker system info >/dev/null 2>&1 && [ $$I -lt 60 ]; do sleep 1; I=$$((I+1)); done; \
		fi; \
	fi
	@if ! docker system info >/dev/null 2>&1; then \
		echo "[docker] Docker daemon is not running. Please start Docker Desktop, then run: make dev"; \
		exit 1; \
	fi
	# Run with Compose (prefer v2). Clear DOCKER_HOST to avoid stale sockets.
	@if docker compose version >/dev/null 2>&1; then \
		DOCKER_HOST= docker compose up --build backend; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		DOCKER_HOST= docker-compose up --build backend; \
	else \
		echo "Docker Compose not found. Install Docker Desktop (which includes Compose)."; \
		exit 1; \
	fi

docker-down:
	@if docker compose version >/dev/null 2>&1; then \
		docker compose down; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		docker-compose down; \
	else \
		echo "No Docker Compose found"; \
	fi
