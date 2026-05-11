from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, List, Optional

from dotenv import load_dotenv


# Load environment variables from .env if present
load_dotenv()


DEFAULT_SKILLS: List[str] = [
    "Python",
    "SQL",
    "Pandas",
    "NumPy",
    "Scikit-learn",
    "TensorFlow",
    "PyTorch",
    "Machine Learning",
    "Data Visualization",
    "Matplotlib",
    "Seaborn",
    "FastAPI",
    "REST",
    "Git",
    "Docker",
    "AWS",
    "Azure",
    "GCP",
    "NLP",
    "Excel",
    "Tableau",
    "Power BI",
]


# Map of alias -> canonical skill name (case-insensitive aliases)
SKILL_ALIASES: Dict[str, str] = {
    # Languages & libs
    "py": "Python",
    "python3": "Python",
    "scikit learn": "Scikit-learn",
    "sklearn": "Scikit-learn",
    "tf": "TensorFlow",
    "torch": "PyTorch",
    "np": "NumPy",
    # Platforms
    "amazon web services": "AWS",
    "google cloud": "GCP",
    "microsoft azure": "Azure",
    # Concepts & tools
    "ml": "Machine Learning",
    "natural language processing": "NLP",
    "viz": "Data Visualization",
    "visualisation": "Data Visualization",
    "matplot lib": "Matplotlib",
    "sea born": "Seaborn",
}


def _split_csv_env(value: str | None) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class AppConfig:
    db_path: str
    skills: List[str]
    alias_map: Dict[str, str]  # alias (lower) -> canonical
    openai_api_key: Optional[str]
    openai_model: str
    openai_enabled: bool


def load_config() -> AppConfig:
    """Load configuration, merging default skills, aliases, and env extras.

    - EXTRA_SKILLS: optional comma-separated list of additional canonical skills
    - DB_PATH: path to SQLite database file (default: jobmatch.db)
    """
    extra_skills = _split_csv_env(os.getenv("EXTRA_SKILLS"))
    db_path = os.getenv("DB_PATH", "jobmatch.db")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    openai_model = os.getenv("OPENAI_MODEL", "gpt-5")
    openai_enabled = os.getenv("OPENAI_ENABLED", "false").lower() in {"1", "true", "yes", "on"}

    # Merge canonical skills (keep order: defaults first, then extras)
    skills = DEFAULT_SKILLS + [s for s in extra_skills if s not in DEFAULT_SKILLS]

    # Build alias map (include identity aliases for canonical skills)
    alias_map: Dict[str, str] = {}

    def add_alias(alias: str, canonical: str) -> None:
        alias_norm = alias.strip().lower()
        if alias_norm:
            alias_map[alias_norm] = canonical

    for s in skills:
        add_alias(s, s)
        # Also capture common hyphen/space variants
        add_alias(s.replace("-", " "), s)
        add_alias(s.replace(" ", "-"), s)

    for alias, canonical in SKILL_ALIASES.items():
        add_alias(alias, canonical)
        add_alias(alias.replace("-", " "), canonical)
        add_alias(alias.replace(" ", "-"), canonical)

    # Extras map to themselves
    for s in extra_skills:
        add_alias(s, s)
        add_alias(s.replace("-", " "), s)
        add_alias(s.replace(" ", "-"), s)

    return AppConfig(
        db_path=db_path,
        skills=skills,
        alias_map=alias_map,
        openai_api_key=openai_api_key,
        openai_model=openai_model,
        openai_enabled=openai_enabled and bool(openai_api_key),
    )
