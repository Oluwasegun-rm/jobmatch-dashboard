Contributing Guide
==================

Thanks for your interest in improving JobMatch AI Dashboard!

Project Goals
- Keep the baseline matching transparent and testable (keyword overlap)
- Layer optional AI that never hides baseline behavior
- Maintain a small, readable codebase with clear responsibilities

Development Workflow
1. Fork and create a feature branch off main:
   - git checkout -b feature/your-change
2. Run locally with Docker:
   - export OPENAI_API_KEY=sk-...
   - make dev
   - cd frontend && npm install && npm run dev
3. Write tests for backend changes (pytest in backend/tests)
4. Lint/format backend:
   - make lint && make format
5. Commit with conventional-ish messages:
   - feat(scope): short summary
   - fix(scope): short summary
   - docs(scope): short summary
6. Open a PR against main. Fill in the PR template.

Coding Standards
- Python: type hints, small functions, explicit error handling, no silent failures unless defaulting to safe behavior is required
- JS/TS: minimal client state, avoid heavy deps; align to existing style and Tailwind tokens
- Keep changes minimal and focused; avoid introducing unnecessary abstractions

Security & Secrets
- Never commit real secrets. Use environment variables and .env.local/.env on your machine only
- Report security issues privately (see SECURITY.md)

CI & Tests
- CI runs backend tests and builds frontend on each PR
- Keep tests fast and isolated; disable AI in tests (OPENAI_ENABLED=0)

Releases & Changelog
- Squash merge PRs with clear titles; maintain a concise, informative history

Thank you for contributing!
