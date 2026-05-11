from __future__ import annotations

import pytest

# Skip entire module if fastapi cannot import in this environment (e.g., arch mismatch)
pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # type: ignore

from backend.app import app


client = TestClient(app)


def test_jobs_categories_only_remotive_supported(monkeypatch):
    # Mock provider call to avoid network
    async def fake_cats(timeout: float = 10.0):
        from jobmatch.providers.models import Category

        return [Category(id="software-dev", name="Software Dev")]

    from jobmatch import providers as jp  # type: ignore[attr-defined]
    from jobmatch.providers import remotive_client

    monkeypatch.setattr(remotive_client, "fetch_categories", fake_cats)
    resp = client.get("/jobs/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["results"][0]["name"] == "Software Dev"


def test_jobs_search_filters_location_and_limits(monkeypatch):
    async def fake_jobs(query: str, category: str | None = None, timeout: float = 10.0):
        from jobmatch.providers.models import JobItem

        return [
            JobItem(
                id="1",
                source="remotive",
                title="Data Analyst",
                company="A",
                location="USA Only",
                url="https://example.com/1",
                posted_at="2024-01-01",
                description="desc",
            ),
            JobItem(
                id="2",
                source="remotive",
                title="ML Engineer",
                company="B",
                location="Europe",
                url="https://example.com/2",
                posted_at="2024-01-02",
                description="desc",
            ),
        ]

    from jobmatch.providers import remotive_client

    monkeypatch.setattr(remotive_client, "fetch_jobs", fake_jobs)

    # Filter by location 'usa' (case-insensitive)
    resp = client.get("/jobs/search", params={"query": "data", "location": "usa", "limit": 1})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert len(data["results"]) == 1
    assert data["results"][0]["location"].lower().startswith("usa")
