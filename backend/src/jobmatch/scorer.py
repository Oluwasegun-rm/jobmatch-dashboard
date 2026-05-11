from __future__ import annotations

from dataclasses import dataclass
from typing import Set, Dict, Any


@dataclass(frozen=True)
class ScoreResult:
    score: int
    matched_skills: Set[str]
    missing_skills: Set[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": self.score,
            "matched_skills": sorted(self.matched_skills),
            "missing_skills": sorted(self.missing_skills),
        }


def match_score(job_skills: Set[str], resume_skills: Set[str]) -> int:
    """Compute a simple percentage overlap score.

    Score = 100 * |intersection| / max(1, |job_skills|)
    """
    if not job_skills:
        # No explicit requirements -> neutral baseline
        return 0
    matched = job_skills & resume_skills
    denom = max(1, len(job_skills))
    return int(round(100 * (len(matched) / denom)))


def evaluate(job_skills: Set[str], resume_skills: Set[str]) -> ScoreResult:
    matched = job_skills & resume_skills
    missing = job_skills - resume_skills
    score = match_score(job_skills, resume_skills)
    return ScoreResult(score=score, matched_skills=matched, missing_skills=missing)
