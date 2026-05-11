from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Set

from .config import load_config
from .parser import extract_skills
from .scorer import evaluate, ScoreResult
from .ai import enhance_with_openai


@dataclass(frozen=True)
class AnalysisResult:
    score: int
    resume_skills: Set[str]
    job_skills: Set[str]
    matched_skills: Set[str]
    missing_skills: Set[str]
    suggestions: List[str]

    def to_dict(self) -> Dict:
        return {
            "score": self.score,
            "resume_skills": sorted(self.resume_skills),
            "job_skills": sorted(self.job_skills),
            "matched_skills": sorted(self.matched_skills),
            "missing_skills": sorted(self.missing_skills),
            "suggestions": self.suggestions,
        }


def _suggestions(missing: Set[str], score: int) -> List[str]:
    if not missing and score == 100:
        return [
            "Great alignment. Consider quantifying impact with metrics (e.g., % improvements)."
        ]
    tips: List[str] = []
    for skill in sorted(missing):
        tips.append(f"Add a concrete example that demonstrates '{skill}' (project, task, or result).")
    if score < 70:
        tips.append("Tailor your summary to highlight the most relevant skills near the top.")
    return tips


def analyze(resume_text: str, job_text: str) -> AnalysisResult:
    cfg = load_config()
    resume_skills = extract_skills(resume_text, cfg.alias_map)
    job_skills = extract_skills(job_text, cfg.alias_map)

    baseline: ScoreResult = evaluate(job_skills, resume_skills)
    tips = _suggestions(baseline.missing_skills, baseline.score)

    # Optional AI enhancement (merges skills, combines suggestions, blends score)
    ai_out = enhance_with_openai(resume_text, job_text, cfg.skills)
    if ai_out:
        rs_ai = {s for s in (ai_out.get("resume_skills") or [])}
        js_ai = {s for s in (ai_out.get("job_skills") or [])}
        # Merge AI-extracted skills with baseline
        if rs_ai:
            resume_skills |= rs_ai
        if js_ai:
            job_skills |= js_ai
        # Recompute with merged skills
        merged = evaluate(job_skills, resume_skills)
        # Blend score with semantic score if available
        semantic = int(ai_out.get("semantic_score", merged.score) or merged.score)
        score = int(round((merged.score + max(0, min(semantic, 100))) / 2))
        # Merge suggestions
        ai_suggestions = [str(x) for x in (ai_out.get("suggestions") or [])]
        merged_tips = tips + [t for t in ai_suggestions if t not in tips]
        return AnalysisResult(
            score=score,
            resume_skills=resume_skills,
            job_skills=job_skills,
            matched_skills=merged.matched_skills,
            missing_skills=merged.missing_skills,
            suggestions=merged_tips,
        )

    # Baseline result when AI disabled/unavailable
    return AnalysisResult(
        score=baseline.score,
        resume_skills=resume_skills,
        job_skills=job_skills,
        matched_skills=baseline.matched_skills,
        missing_skills=baseline.missing_skills,
        suggestions=tips,
    )
