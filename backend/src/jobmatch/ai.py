from __future__ import annotations

import json
from typing import Any, Dict, List, Set

from .config import load_config


def _safe_json_parse(s: str) -> Dict[str, Any]:
    try:
        return json.loads(s)
    except Exception:
        return {}


def enhance_with_openai(resume_text: str, job_text: str, vocab: List[str]) -> Dict[str, Any]:
    """Use OpenAI to infer skills, a semantic score, and suggestions.

    Returns a dict with optional keys: resume_skills, job_skills, semantic_score, suggestions
    If OpenAI is not enabled or any failure occurs, returns an empty dict.
    """
    cfg = load_config()
    if not cfg.openai_enabled or not cfg.openai_api_key:
        return {}

    # Import lazily to avoid hard dependency during tests when AI disabled
    try:
        from openai import OpenAI  # type: ignore
    except Exception:
        return {}

    client = OpenAI(api_key=cfg.openai_api_key)
    system = (
        "You are a resume-job matching assistant. Extract skills (as proper-case canonical names) from resume and job "
        "based on the provided vocabulary. Compute a semantic match score from 0-100 reflecting how well resume aligns. "
        "Return concise improvement suggestions. Output strict JSON with keys: resume_skills (array of strings), "
        "job_skills (array of strings), semantic_score (int), suggestions (array of strings). Do not include explanations."
    )
    vocab_str = ", ".join(sorted(set(vocab)))
    user = (
        f"Vocabulary: [{vocab_str}]\n\nResume:\n{resume_text}\n\nJob Description:\n{job_text}"
    )

    try:
        resp = client.chat.completions.create(
            model=cfg.openai_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=600,
        )
        content = resp.choices[0].message.content or "{}"
        data = _safe_json_parse(content)
        # Enforce types
        out: Dict[str, Any] = {}
        if isinstance(data.get("resume_skills"), list):
            out["resume_skills"] = [str(x) for x in data["resume_skills"]]
        if isinstance(data.get("job_skills"), list):
            out["job_skills"] = [str(x) for x in data["job_skills"]]
        try:
            out["semantic_score"] = int(data.get("semantic_score", 0))
        except Exception:
            pass
        if isinstance(data.get("suggestions"), list):
            out["suggestions"] = [str(x) for x in data["suggestions"]]
        return out
    except Exception:
        # Fail silently; baseline logic will still run
        return {}


def resume_feedback(resume_text: str, job_text: str | None = None) -> List[str]:
    """Return concise resume improvement suggestions using OpenAI.

    If OpenAI is not enabled or any error occurs, returns an empty list.
    """
    cfg = load_config()
    if not cfg.openai_enabled or not cfg.openai_api_key:
        return []
    try:
        from openai import OpenAI  # type: ignore
    except Exception:
        return []

    # Truncate long inputs to control token usage
    def _truncate(s: str, limit: int = 12000) -> str:
        return s if len(s) <= limit else s[:limit]

    resume_text = _truncate(resume_text)
    jt = _truncate(job_text) if job_text else None

    client = OpenAI(api_key=cfg.openai_api_key)
    sys = (
        "You are a resume coach. Provide 3-6 concise, actionable suggestions to improve a resume. "
        "Prefer strong action verbs, quantification, clarity, and relevance to the target job if provided. "
        "Output strict JSON: {\"suggestions\": [string, ...]} with no extra commentary."
    )
    user = f"Resume:\n{resume_text}\n\n" + (f"Job Description (optional):\n{jt}\n" if jt else "")
    try:
        resp = client.chat.completions.create(
            model=cfg.openai_model,
            messages=[
                {"role": "system", "content": sys},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=300,
        )
        content = resp.choices[0].message.content or "{}"
        data = json.loads(content)
        if isinstance(data.get("suggestions"), list):
            return [str(x) for x in data["suggestions"]][:8]
        return []
    except Exception:
        return []


def bullet_rewrites(resume_text: str, job_text: str | None = None, max_items: int = 3) -> List[Dict[str, str]]:
    """Suggest improved rewrites for a few resume bullet lines using OpenAI.

    Returns a list of {original, improved}. Empty list if disabled or any error.
    """
    cfg = load_config()
    if not cfg.openai_enabled or not cfg.openai_api_key:
        return []
    try:
        from openai import OpenAI  # type: ignore
    except Exception:
        return []

    # Grab candidate bullets/lines from resume
    lines = [ln.strip() for ln in resume_text.splitlines() if ln.strip()]
    # Prefer existing bullets or lines that look like responsibility statements
    cand: List[str] = []
    for ln in lines:
        if ln.startswith(("•", "-", "*")) or "responsible for" in ln.lower() or len(ln.split()) >= 6:
            # Strip bullet prefix
            clean = ln.lstrip("•-* ")
            if clean not in cand:
                cand.append(clean)
        if len(cand) >= max_items:
            break
    if not cand:
        return []

    try:
        client = OpenAI(api_key=cfg.openai_api_key)
        sys = (
            "Rewrite the provided resume bullet lines to be concise, start with strong action verbs, and include metrics where plausible. "
            "Do not fabricate specifics beyond general quantification. Output strict JSON: {\"rewrites\": [{\"original\": str, \"improved\": str}, ...]}"
        )
        user = "Bullets to rewrite:\n" + "\n".join(f"- {b}" for b in cand)
        if job_text:
            user += f"\n\nTarget Job (optional):\n{job_text[:6000]}"
        resp = client.chat.completions.create(
            model=cfg.openai_model,
            messages=[
                {"role": "system", "content": sys},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
            max_tokens=500,
        )
        content = resp.choices[0].message.content or "{}"
        data = json.loads(content)
        out: List[Dict[str, str]] = []
        for item in data.get("rewrites", [])[:max_items]:
            if isinstance(item, dict) and item.get("original") and item.get("improved"):
                out.append({"original": str(item["original"]), "improved": str(item["improved"])})
        return out
    except Exception:
        return []


def cover_letter(resume_text: str, job_text: str, tone: str = "professional") -> str:
    """Generate a tailored cover letter using OpenAI. Returns plain text."""
    cfg = load_config()
    if not cfg.openai_enabled or not cfg.openai_api_key:
        return ""
    try:
        from openai import OpenAI  # type: ignore
    except Exception:
        return ""

    def _trunc(s: str, limit: int = 12000) -> str:
        return s if len(s) <= limit else s[:limit]

    resume_text = _trunc(resume_text)
    job_text = _trunc(job_text)

    sys = (
        "You are an expert career assistant. Draft a concise (250-400 words) cover letter tailored to the provided job. "
        "Use a {tone} tone, highlight relevant experience and quantifiable impact from the resume, and avoid hallucinating facts. "
        "Output plain text only, no JSON, no markdown."
    ).format(tone=tone)
    user = f"Resume:\n{resume_text}\n\nJob Description:\n{job_text}"
    try:
        client = OpenAI(api_key=cfg.openai_api_key)
        resp = client.chat.completions.create(
            model=cfg.openai_model,
            messages=[
                {"role": "system", "content": sys},
                {"role": "user", "content": user},
            ],
            temperature=0.5,
            max_tokens=700,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception:
        return ""
