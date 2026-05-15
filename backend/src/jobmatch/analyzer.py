from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Set

from .config import load_config
from .parser import extract_skills
from .scorer import evaluate, ScoreResult
from .ai import enhance_with_openai
import re


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
    top_missing = ", ".join(missing_list[:6]) or "none"
    total_req = len(matched | missing) or len(matched_list) + len(missing_list)
    parts: List[str] = []
    parts.append(f"Overall alignment is {score}% based on explicit keyword overlap against stated requirements.")
    if matched_list:
        parts.append(f"Matched highlights: {top_matched}. This indicates relevant exposure to key technologies/competencies.")
    else:
        parts.append("No explicit overlaps were detected with the stated requirements.")
    if missing_list:
        parts.append(f"Missing/weak areas: {top_missing}. Add brief, verifiable evidence (projects, bullets, or quantified outcomes) to close these gaps.")
    if total_req:
        parts.append("Place the most relevant items near the top of the resume, and quantify impact (%, $, #) to strengthen the narrative.")
    else:
        parts.append("Tailor the resume summary to the role and quantify a few key outcomes to create a stronger first impression.")
    return " ".join(parts)


def analyze(resume_text: str, job_text: str) -> AnalysisResult:
    cfg = load_config()

    # Build a dynamic alias map that augments the configured vocabulary with
    # candidates derived from the job description text. This lets us capture
    # stack- and library-specific tokens like "Node.js", "C#", ".NET", "Kubernetes",
    # or acronyms that aren't in the default list, without hardcoding every skill.
    alias_map = dict(cfg.alias_map)

    def _norm(s: str) -> str:
        # Normalize similar to parser.normalize_text: lower + hyphens to spaces
        return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s.lower().replace("-", " ")).strip())

    STOP = {
        # lightweight stoplist to avoid common false positives
        "and", "or", "with", "the", "a", "an", "of", "for", "to", "in", "on", "by",
        "this", "that", "these", "those", "you", "your", "we", "our", "at",
        "intern", "internship", "engineer", "engineering", "developer", "software",
        "saas", "applications", "application", "team", "product", "role", "experience",
        "years", "year", "work", "ability", "strong", "excellent", "knowledge",
        "tools", "technologies", "tech", "stack", "system", "systems", "service", "services",
        "document", "documents", "company", "customers", "users", "platform",
    }

    def _dynamic_tokens(text: str, limit: int = 200) -> set[str]:
        cand: set[str] = set()
        # 1) tokens with special chars typical in tech names
        for m in re.finditer(r"\b[\w]+(?:[.#\-/][\w]+)+\b", text, re.IGNORECASE):
            cand.add(m.group(0))
        # 2) acronyms (2-6 uppercase letters)
        for m in re.finditer(r"\b[A-Z]{2,6}\b", text):
            cand.add(m.group(0))
        # 3) Title-case words likely to be technologies (avoid short common English)
        for m in re.finditer(r"\b[A-Z][a-z]{2,}\b", text):
            w = m.group(0)
            if w.lower() not in STOP:
                cand.add(w)
        # 4) Keep it bounded and mapped to normalized tokens
        toks: set[str] = set()
        for raw in cand:
            n = _norm(raw)
            if not n or len(n) < 2:
                continue
            if n in STOP:
                continue
            # Avoid overly generic tokens
            if n in {"data", "cloud", "server", "client", "api", "web", "mobile"}:
                continue
            toks.add(n)
            if len(toks) >= limit:
                break
        return toks

    def _canon(n: str) -> str:
        # Canonical display: for short acronyms, uppercase; else title case per token
        if re.fullmatch(r"[a-z]{2,6}", n) and n.isalpha():
            return n.upper()
        return " ".join([t.upper() if len(t) <= 3 and t.isalpha() else t.capitalize() for t in n.split()])

    dyn = _dynamic_tokens(job_text)
    for n in dyn:
        # Only add if not already known
        if n not in alias_map:
            alias_map[n] = _canon(n)

    resume_skills = extract_skills(resume_text, alias_map)
    job_skills = extract_skills(job_text, alias_map)

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
        # Validate: require at least ~3 sentences and reasonable length
        sentences = [s for s in narrative_ai_raw.replace("\n", " ").split(".") if s.strip()]
        if len(narrative_ai_raw) < 180 or len(sentences) < 3:
            narrative_ai = _build_narrative(score, baseline.matched_skills, baseline.missing_skills)
        else:
            narrative_ai = narrative_ai_raw
        # Always append a concise breakdown for clarity
        detail_tail = _build_narrative(score, baseline.matched_skills, baseline.missing_skills)
        if detail_tail not in narrative_ai:
            narrative_ai = f"{narrative_ai} {detail_tail}"
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
    # Baseline detailed narrative
    detail = _build_narrative(baseline.score, baseline.matched_skills, baseline.missing_skills)
    return AnalysisResult(
        score=baseline.score,
        resume_skills=resume_skills,
        job_skills=job_skills,
        matched_skills=baseline.matched_skills,
        missing_skills=baseline.missing_skills,
        suggestions=tips,
        narrative=f"{narrative} {detail}",
        ai_used=False,
        narrative_source="baseline",
    )
