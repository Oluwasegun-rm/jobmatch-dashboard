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
    narrative: str
    ai_used: bool
    narrative_source: str  # 'ai' or 'baseline'

    def to_dict(self) -> Dict:
        return {
            "score": self.score,
            "resume_skills": sorted(self.resume_skills),
            "job_skills": sorted(self.job_skills),
            "matched_skills": sorted(self.matched_skills),
            "missing_skills": sorted(self.missing_skills),
            "suggestions": self.suggestions,
            "narrative": self.narrative,
            "meta": {"ai_used": self.ai_used, "narrative_source": self.narrative_source},
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


def _build_narrative(score: int, matched: Set[str], missing: Set[str]) -> str:
    matched_list = sorted(list(matched))
    missing_list = sorted(list(missing))
    top_matched = ", ".join(matched_list[:5]) or "none"
    top_missing = ", ".join(missing_list[:5]) or "none"
    parts: List[str] = []
    parts.append(f"The resume aligns with the role at {score}% based on explicit skill overlap and stated requirements.")
    parts.append(f"Strengths include {top_matched}, indicating relevant hands-on experience in key areas.")
    if top_missing != "none":
        parts.append(f"Notable gaps are {top_missing}; addressing or framing adjacent experience here would strengthen fit.")
    else:
        parts.append("There are no obvious missing skills from the stated requirements.")
    parts.append("Prioritize the most relevant achievements near the top and quantify outcomes to reinforce impact.")
    return " ".join(parts)


def analyze(resume_text: str, job_text: str) -> AnalysisResult:
    cfg = load_config()
    resume_skills = extract_skills(resume_text, cfg.alias_map)
    job_skills = extract_skills(job_text, cfg.alias_map)

    baseline: ScoreResult = evaluate(job_skills, resume_skills)
    tips = _suggestions(baseline.missing_skills, baseline.score)
    # Baseline narrative summary (3–4 sentences)
    narrative = _build_narrative(baseline.score, baseline.matched_skills, baseline.missing_skills)

    # Optional AI enhancement (combine suggestions, conservative score blend; DO NOT merge skills used for scoring)
    ai_out = enhance_with_openai(resume_text, job_text, cfg.skills)
    if ai_out:
        # Keep baseline sets untouched to avoid AI hallucinations inflating overlap
        merged = baseline
        # Blend score with semantic score conservatively (baseline-weighted and clamped)
        try:
            semantic = int(ai_out.get("semantic_score", baseline.score) or baseline.score)
        except Exception:
            semantic = baseline.score
        semantic = max(0, min(semantic, 100))
        prelim = int(round(0.8 * baseline.score + 0.2 * semantic))
        lower = max(0, baseline.score - 15)
        upper = min(100, baseline.score + 15)
        score = max(lower, min(prelim, upper))
        # Merge suggestions
        ai_suggestions = [str(x) for x in (ai_out.get("suggestions") or [])]
        merged_tips = tips + [t for t in ai_suggestions if t not in tips]
        # Prefer AI narrative if provided and sufficiently detailed; else fall back to structured baseline
        narrative_ai_raw = str(ai_out.get("narrative") or "").strip()
        # Validate: require at least ~2 sentences and reasonable length
        sentences = [s for s in narrative_ai_raw.replace("\n", " ").split(".") if s.strip()]
        if len(narrative_ai_raw) < 120 or len(sentences) < 2:
            narrative_ai = _build_narrative(score, baseline.matched_skills, baseline.missing_skills)
        else:
            narrative_ai = narrative_ai_raw
        return AnalysisResult(
            score=score,
            resume_skills=resume_skills,
            job_skills=job_skills,
            matched_skills=merged.matched_skills,
            missing_skills=merged.missing_skills,
            suggestions=merged_tips,
            narrative=narrative_ai,
            ai_used=True,
            narrative_source="ai" if narrative_ai == narrative_ai_raw else "baseline",
        )

    # Baseline result when AI disabled/unavailable
    return AnalysisResult(
        score=baseline.score,
        resume_skills=resume_skills,
        job_skills=job_skills,
        matched_skills=baseline.matched_skills,
        missing_skills=baseline.missing_skills,
        suggestions=tips,
        narrative=narrative,
        ai_used=False,
        narrative_source="baseline",
    )
