from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class JobItem:
    id: str
    source: str
    title: str
    company: str
    location: str
    url: str
    posted_at: str
    description: str
    job_type: Optional[str] = None
    tags: Optional[List[str]] = None
    salary: Optional[str] = None


@dataclass(frozen=True)
class Category:
    id: str
    name: str


JobList = List[JobItem]
CategoryList = List[Category]
