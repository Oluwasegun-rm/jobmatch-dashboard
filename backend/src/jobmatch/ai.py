from __future__ import annotations

import json
from typing import Any, Dict, List, Set
import os
import logging

from .config import load_config


logger = logging.getLogger(__name__)


def _safe_json_parse(s: str) -> Dict[str, Any]:
    try:
        return json.loads(s)
    except Exception:
        return {}


def _extract_json(content: str) -> Dict[str, Any]:
    """Attempt to parse JSON from a string, stripping code fences or extra text if needed."""
    data = _safe_json_parse(content)
    if data:
        return data
    txt = content.strip()
    # Remove code fences
    if txt.startswith("```"):
        try:
            txt = "\n".join(ln for ln in txt.splitlines() if not ln.strip().startswith("```") )
        except Exception:
            pass
    data = _safe_json_parse(txt)
    if data:
        return data
    # Fallback to bracket slice
    try:
        i = txt.find("{")
        j = txt.rfind("}")
        if i != -1 and j != -1 and j > i:
            return _safe_json_parse(txt[i:j+1])
    except Exception:
        pass
    return {}


def enhance_with_openai(resume_text: str, job_text: str, vocab: List[str]) -> Dict[str, Any]:
    """Use OpenAI to infer skills, a semantic score, and suggestions.

    Returns a dict with optional keys: resume_skills, job_skills, semantic_score, suggestions
    If OpenAI is not enabled or any failure occurs, returns an empty dict.
    """
    cfg = load_config()
    if not cfg.openai_enabled or not cfg.openai_api_key:
        logger.info("enhance_with_openai: disabled=%s key_present=%s", bool(cfg.openai_enabled), bool(cfg.openai_api_key))
        return {}

    # Import lazily to avoid hard dependency during tests when AI disabled
    try:
        from openai import OpenAI  # type: ignore
    except Exception as e:
        logger.warning("enhance_with_openai: failed to import OpenAI SDK: %s", type(e).__name__)
        return {}

    client = OpenAI(api_key=cfg.openai_api_key)
    system = (
        "You are a precise resume–job matching assistant. Duties: (1) extract skills (proper‑case canonical names) from the "
        "resume and job using ONLY the provided vocabulary, (2) compute a conservative semantic match score (0–100) reflecting "
        "alignment, (3) produce 3–4 clear, objective sentences (60–120 words total) explaining the match: name 2–3 overlapping "
        "skills and 1–2 significant gaps, and give a brief guidance sentence. Avoid vague phrases; do not invent experience; no "
        "bullet points or markdown. Scoring guidance: if there are few or no overlaps with the job’s required skills, keep the "
        "score ≤ 40; for partial/adjacent overlap, 45–70 is typical; only output ≥ 90 for an almost perfect match across nearly all "
        "key requirements. NEVER output 100 unless the resume clearly covers virtually all explicit requirements. Output strict JSON "
        "only with keys: resume_skills (array of strings), job_skills (array of strings), semantic_score (int), suggestions (array of "
        "strings), narrative (string). No text outside the JSON."
    )
    # Truncate very long inputs to keep token usage in check
    def _trunc(s: str, limit: int = 12000) -> str:
        return s if len(s) <= limit else s[:limit]
    resume_text = _trunc(resume_text)
    job_text = _trunc(job_text)
    logger.info(
        "enhance_with_openai: model=%s enabled=%s resume_len=%d job_len=%d",
        cfg.openai_model, bool(cfg.openai_enabled), len(resume_text or ""), len(job_text or ""),
    )
    vocab_str = ", ".join(sorted(set(vocab)))
    user = (
        "Use the following to extract canonical skills (for skills arrays ONLY) and write the narrative independently of the list.\n"
        f"Vocabulary (for canonicalization only): [{vocab_str}]\n\nResume (full text):\n{resume_text}\n\nJob Description (full text):\n{job_text}"
    )

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]

    def _run_with_model(model_name: str) -> Dict[str, Any]:
        # Attempt 1: JSON mode
        try:
            resp = client.chat.completions.create(
                model=model_name,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=800,
            )
            content = resp.choices[0].message.content or "{}"
            data = _extract_json(content)
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
            if isinstance(data.get("narrative"), str):
                out["narrative"] = str(data["narrative"]).strip()
            logger.info(
                "enhance_with_openai: ok model=%s semantic=%s resume_skills=%d job_skills=%d narrative_len=%d",
                model_name, out.get("semantic_score"), len(out.get("resume_skills", [])), len(out.get("job_skills", [])), len((out.get("narrative") or "")),
            )
            return out
        except Exception as e1:
            logger.warning("enhance_with_openai: model=%s first call failed (%s): %s; retrying without response_format", model_name, type(e1).__name__, str(e1))
            # Attempt 2: no response_format
            try:
                resp = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=800,
                )
                content = resp.choices[0].message.content or "{}"
                data = _extract_json(content)
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
                if isinstance(data.get("narrative"), str):
                    out["narrative"] = str(data["narrative"]).strip()
                logger.info(
                    "enhance_with_openai: ok (retry) model=%s semantic=%s resume_skills=%d job_skills=%d narrative_len=%d",
                    model_name, out.get("semantic_score"), len(out.get("resume_skills", [])), len(out.get("job_skills", [])), len((out.get("narrative") or "")),
                )
                return out
            except Exception as e2:
                logger.warning("enhance_with_openai: model=%s second call failed (%s): %s; trying responses API", model_name, type(e2).__name__, str(e2))
                # Attempt 3: Responses API with JSON schema
                try:
                    schema = {
                        "name": "jobmatch_analysis",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "resume_skills": {"type": "array", "items": {"type": "string"}},
                                "job_skills": {"type": "array", "items": {"type": "string"}},
                                "semantic_score": {"type": "integer", "minimum": 0, "maximum": 100},
                                "suggestions": {"type": "array", "items": {"type": "string"}},
                                "narrative": {"type": "string", "minLength": 160},
                            },
                            "required": ["resume_skills", "job_skills", "semantic_score", "suggestions", "narrative"],
                            "additionalProperties": False,
                        },
                    }
                    resp = client.responses.create(
                        model=model_name,
                        input=[
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ],
                        response_format={"type": "json_schema", "json_schema": schema},
                        temperature=0.2,
                        max_output_tokens=800,
                    )
                    # Extract text from Responses API output
                    content = getattr(resp, "output_text", None)
                    if not content:
                        try:
                            parts: List[str] = []
                            for item in getattr(resp, "output", []) or []:
                                for c in getattr(item, "content", []) or []:
                                    t = getattr(c, "text", None)
                                    if hasattr(t, "value"):
                                        parts.append(t.value)
                                    elif isinstance(t, str):
                                        parts.append(t)
                            content = "\n".join(parts)
                        except Exception:
                            content = "{}"
                    data = _extract_json(content or "{}")
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
                    if isinstance(data.get("narrative"), str):
                        out["narrative"] = str(data["narrative"]).strip()
                    logger.info(
                        "enhance_with_openai: ok (responses) model=%s semantic=%s resume_skills=%d job_skills=%d narrative_len=%d",
                        model_name, out.get("semantic_score"), len(out.get("resume_skills", [])), len(out.get("job_skills", [])), len((out.get("narrative") or "")),
                    )
                    return out
                except Exception as e3:
                    logger.error("enhance_with_openai: model=%s responses API failed (%s): %s", model_name, type(e3).__name__, str(e3))
                    return {}

    # Try with configured model first
    primary_out = _run_with_model(cfg.openai_model)
    if primary_out:
        return primary_out

    # Fallback model if configured (e.g., OPENAI_FALLBACK_MODEL=gpt-4o-mini)
    fallback_model = os.getenv("OPENAI_FALLBACK_MODEL", "gpt-4o-mini")
    if fallback_model and fallback_model != cfg.openai_model:
        logger.warning("enhance_with_openai: falling back to model=%s", fallback_model)
        fb_out = _run_with_model(fallback_model)
        if fb_out:
            return fb_out

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
        "You are a resume coach. Return concrete, job-aware feedback in strict JSON. "
        "Structure: {\"suggestions\": [string...], \"missing_keywords\": [string...]} . "
        "Guidelines: (1) 4–8 suggestions that reference missing or weak areas by name; prefer action verbs and quantification; "
        "(2) missing_keywords: up to 10 high-signal skills/keywords explicitly present in the job text but absent or unclear in the resume; proper case. "
        "No markdown, no commentary outside JSON."
    )
    user = (
        "Resume (full text):\n" + resume_text + "\n\n" + ("Job (full text):\n" + jt + "\n" if jt else "")
    )
    try:
        resp = client.chat.completions.create(
            model=cfg.openai_model,
            messages=[
                {"role": "system", "content": sys},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=500,
        )
        content = resp.choices[0].message.content or "{}"
        data = json.loads(content)
        out: List[str] = []
        if isinstance(data.get("suggestions"), list):
            out = [str(x) for x in data["suggestions"]][:8]
        # We keep returning suggestions list for backward-compat; /ai/feedback will read missing_keywords separately
        return out
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
            "Rewrite the provided resume bullet lines to be concise, action-first, and quantified when plausible. "
            "Do not invent facts. Return strict JSON: {\"rewrites\": [{\"original\": str, \"improved\": str, \"rationale\": str}, ...]}"
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
                out.append({"original": str(item["original"]), "improved": str(item["improved"]), "rationale": str(item.get("rationale") or "")})
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
