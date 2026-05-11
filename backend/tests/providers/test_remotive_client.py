from __future__ import annotations

import respx
import httpx
import pytest

from jobmatch.providers.remotive_client import REMOTIVE_BASE, fetch_categories, fetch_jobs


@pytest.mark.asyncio
@respx.mock
async def test_fetch_categories_maps_response():
    route = respx.get(f"{REMOTIVE_BASE}/categories").mock(
        return_value=httpx.Response(200, json=[{"id": 1, "name": "Software Dev", "slug": "software-dev"}])
    )
    cats = await fetch_categories()
    assert route.called
    assert len(cats) == 1
    assert cats[0].name == "Software Dev"


@pytest.mark.asyncio
@respx.mock
async def test_fetch_jobs_maps_response_and_fields():
    payload = {
        "jobs": [
            {
                "id": 123,
                "title": "Data Analyst",
                "company_name": "ExampleCorp",
                "candidate_required_location": "USA Only",
                "url": "https://example.com/job/123",
                "publication_date": "2024-01-01T00:00:00",
                "description": "<p>Analyze things</p>",
            }
        ]
    }
    route = respx.get(REMOTIVE_BASE).mock(return_value=httpx.Response(200, json=payload))
    jobs = await fetch_jobs(query="data", category=None)
    assert route.called
    assert len(jobs) == 1
    j = jobs[0]
    assert j.title == "Data Analyst"
    assert j.company == "ExampleCorp"
    assert j.location == "USA Only"
    assert j.url.endswith("/123")
    assert j.source == "remotive"
