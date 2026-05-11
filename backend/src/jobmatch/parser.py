from __future__ import annotations

import re
from typing import Dict, Iterable, Set


_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")


def normalize_text(text: str) -> str:
    """Lowercase and replace non-alphanumeric characters with spaces.

    Also collapses whitespace to single spaces and returns a padded string to
    allow simple boundary checks using substring search.
    """
    lowered = text.lower().replace("-", " ")
    cleaned = _NON_ALNUM_RE.sub(" ", lowered)
    compact = re.sub(r"\s+", " ", cleaned).strip()
    return f" {compact} "


def normalize_phrase(phrase: str) -> str:
    return normalize_text(phrase)


def extract_skills(text: str, alias_map: Dict[str, str]) -> Set[str]:
    """Extract canonical skills from text using an alias->canonical map.

    The map should contain lowercase aliases mapping to canonical skill names.
    The function performs simple substring containment on normalized text, which
    is transparent and easy to adjust.
    """
    if not text.strip():
        return set()
    norm_text = normalize_text(text)
    found: Set[str] = set()
    # Use distinct aliases by length (longer first) to reduce trivial overlaps
    for alias in sorted(alias_map.keys(), key=len, reverse=True):
        norm_alias = normalize_phrase(alias).strip()
        if f" {norm_alias} " in norm_text:
            found.add(alias_map[alias])
    return found


def dedupe_preserve_order(items: Iterable[str]) -> list[str]:
    seen: Set[str] = set()
    result: list[str] = []
    for x in items:
        if x not in seen:
            seen.add(x)
            result.append(x)
    return result
