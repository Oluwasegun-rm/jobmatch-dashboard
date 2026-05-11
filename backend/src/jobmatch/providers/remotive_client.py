from __future__ import annotations

from typing import Any, Dict, List

import httpx

from .models import Category, CategoryList, JobItem, JobList
from .cache import provider_cache


REMOTIVE_BASE = "https://remotive.com/api/remote-jobs"


async def fetch_categories(timeout: float = 10.0) -> CategoryList:
    cache_key = "remotive:categories"
    cached = provider_cache.get(cache_key)
    if cached is not None:
        return cached
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(f"{REMOTIVE_BASE}/categories")
        resp.raise_for_status()
        data = resp.json()
    cats = [Category(id=str(item.get("slug") or item.get("id") or item.get("name")), name=str(item.get("name"))) for item in data]
    provider_cache.set(cache_key, cats, ttl_seconds=24 * 60 * 60)
    return cats


def _map_job(item: Dict[str, Any]) -> JobItem:
    return JobItem(
        id=str(item.get("id") or item.get("job_id") or item.get("slug") or item.get("url")),
        source="remotive",
        title=str(item.get("title", "")),
        company=str(item.get("company_name", "")),
        location=str(item.get("candidate_required_location", "")),
        url=str(item.get("url", "")),
        posted_at=str(item.get("publication_date", "")),
        description=str(item.get("description", "")),
        job_type=str(item.get("job_type") or "") or None,
        tags=item.get("tags") if isinstance(item.get("tags"), list) else None,
        salary=str(item.get("salary") or "") or None,
    )


async def fetch_jobs(query: str, category: str | None = None, *, limit: int | None = 200, timeout: float = 10.0, **_: Any) -> JobList:
    q = (query or "").strip()
    cat = (category or "").strip()
    lim = max(1, min(int(limit or 200), 500))  # safety bounds
    cache_key = f"remotive:search:{q}:{cat}:{lim}"
    cached = provider_cache.get(cache_key)
    if cached is not None:
        return cached

    params: Dict[str, str] = {}
    if q:
        params["search"] = q
    if cat:
        params["category"] = cat
    # Ask Remotive for enough items so our local pagination can honor per_page
    if lim:
        params["limit"] = str(lim)

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(REMOTIVE_BASE, params=params)
        resp.raise_for_status()
        data = resp.json() or {}

    jobs_raw: List[Dict[str, Any]] = data.get("jobs") or []
    jobs = [_map_job(x) for x in jobs_raw]
    provider_cache.set(cache_key, jobs, ttl_seconds=5 * 60)
    return jobs
