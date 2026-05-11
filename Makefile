PY := python3
PIP := $(PY) -m pip
PYTEST := $(PY) -m pytest
VENV ?= .venv
# Detect host arch (arm64 on Apple Silicon)
HOST_ARCH := $(shell uname -m)
# Prefer Homebrew arm64 Python on Apple Silicon if present
PYPATH := $(shell if [ -x /opt/homebrew/bin/python3 ]; then echo /opt/homebrew/bin/python3; else echo python3; fi)

.PHONY: install backend-install backend-run frontend-install frontend-dev dev test lint format clean frontend

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
	for C in /opt/homebrew/bin/python3 /usr/bin/python3 `command -v python3 2>/dev/null || true`; do \
		if [ -n "$$C" ] && [ -x "$$C" ]; then \
			# Skip CommandLineTools shim (often x86_64 or outdated)
			EXE=`"$$C" -c 'import sys; print(sys.executable)' 2>/dev/null || echo $$C`; \
			case "$$EXE" in *CommandLineTools*) continue ;; esac; \
			CARCH=`"$$C" -c 'import platform; print(platform.machine())' 2>/dev/null || echo unknown`; \
			if [ "$$CARCH" = "$(HOST_ARCH)" ]; then PY_CAND="$$C"; break; fi; \
		fi; \
	done; \
	if [ -z "$$PY_CAND" ]; then \
		echo "[backend] Could not find a Python matching arch $(HOST_ARCH). On Apple Silicon, run: brew install python@3.12"; \
		exit 1; \
	fi; \
	echo "[backend] Using python: $$PY_CAND"; \
	uv venv -p "$$PY_CAND" "$(VENV)"
	@"$(VENV)/bin/python" -c 'import platform, sys; print("[backend] venv:", platform.machine(), sys.executable)'

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
