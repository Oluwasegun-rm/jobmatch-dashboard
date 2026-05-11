from __future__ import annotations

from typing import Any, Dict, List, Optional
import os
import httpx

from .models import JobItem, JobList


USAJOBS_HOST = os.getenv("USAJOBS_HOST", "https://data.usajobs.gov")
USAJOBS_USER_AGENT = os.getenv("USAJOBS_USER_AGENT")
USAJOBS_API_KEY = os.getenv("USAJOBS_API_KEY")


def _enabled() -> bool:
    return bool(USAJOBS_USER_AGENT and USAJOBS_API_KEY)


def is_enabled() -> bool:
    return _enabled()


def _map_job(item: Dict[str, Any]) -> JobItem:
    title = str(item.get("PositionTitle") or "")
    org = str(item.get("OrganizationName") or "")
    # Locations can be list; use display if present
    loc = str(item.get("PositionLocationDisplay") or "")
    desc = str(
        (item.get("PositionFormattedDescription") or "")
    )
    url = ""
    try:
        uris = item.get("ApplyURI") or []
        if uris:
            url = str(uris[0])
    except Exception:
        url = ""
    job_type = None
    try:
        sch = item.get("PositionSchedule") or []
        if sch:
            job_type = str(sch[0].get("Name") or "") or None
    except Exception:
        job_type = None
    posted = str(item.get("PublicationStartDate") or "")
    return JobItem(
        id=str(item.get("MatchedObjectId") or item.get("PositionID") or url or title),
        source="usajobs",
        title=title,
        company=org,
        location=loc,
        url=url,
        posted_at=posted,
        description=desc,
        job_type=job_type,
        tags=None,
        salary=None,
    )


async def fetch_jobs(
    query: str,
    location: Optional[str] = None,
    *,
    page: int = 1,
    per_page: int = 50,
    timeout: float = 10.0,
) -> JobList:
    if not _enabled():
        return []
    q = (query or "").strip() or ""
    loc = (location or "United States").strip()
    page = max(1, int(page))
    per_page = max(10, min(int(per_page or 50), 100))
    params: Dict[str, str] = {
        "Keyword": q,
        "LocationName": loc,
        "Page": str(page),
        "ResultsPerPage": str(per_page),
    }
    headers = {
        "User-Agent": USAJOBS_USER_AGENT or "jobmatch/unknown",
        "Authorization-Key": USAJOBS_API_KEY or "",
        "Accept": "application/json",
    }
    url = f"{USAJOBS_HOST}/api/search"
    async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json() or {}
    # USAJOBS response structure: SearchResult -> SearchResultItems
    try:
        items = data.get("SearchResult", {}).get("SearchResultItems", [])
    except Exception:
        items = []
    jobs: JobList = []
    for it in items:
        obj = it.get("MatchedObjectDescriptor") or {}
        jobs.append(_map_job(obj))
    return jobs
