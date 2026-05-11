from __future__ import annotations

import os
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict

from jobmatch.analyzer import analyze
from jobmatch.storage import save_analysis, fetch_recent, fetch_by_id, init_db
from jobmatch.providers.remotive_client import fetch_categories as remotive_categories, fetch_jobs as remotive_jobs
from jobmatch.providers.models import JobItem
from pypdf import PdfReader
try:
    import docx  # type: ignore
except Exception:  # pragma: no cover - optional dep resolution handled by requirements
    docx = None
from jobmatch.ai import resume_feedback as ai_resume_feedback
from jobmatch.ai import bullet_rewrites as ai_bullet_rewrites
from jobmatch.ai import cover_letter as ai_cover_letter
from jobmatch.config import load_config


app = FastAPI(title="JobMatch AI Backend", version="0.1.0")

# CORS for frontend calls
origins_env = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in origins_env.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    resume_text: str
    job_text: str


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
def _startup() -> None:
    # Ensure DB exists
    init_db()


@app.post("/analyze")
def analyze_endpoint(req: AnalyzeRequest) -> Dict[str, Any]:
    # Basic input size guardrails
    if len(req.resume_text) > 50_000 or len(req.job_text) > 50_000:
        raise HTTPException(status_code=413, detail="Input too large (limit 50k chars)")
    result = analyze(req.resume_text, req.job_text)
    return {"ok": True, "result": result.to_dict()}


class SaveRequest(BaseModel):
    resume_text: str
    job_text: str
    score: int
    matched_skills: list[str]
    missing_skills: list[str]
    job_source: str | None = None
    job_url: str | None = None
    job_title: str | None = None
    job_company: str | None = None


@app.post("/save")
def save_endpoint(req: SaveRequest) -> Dict[str, Any]:
    rid = save_analysis(
        resume_text=req.resume_text,
        job_text=req.job_text,
        score=req.score,
        matched_skills=req.matched_skills,
        missing_skills=req.missing_skills,
        job_source=req.job_source,
        job_url=req.job_url,
        job_title=req.job_title,
        job_company=req.job_company,
    )
    return {"ok": True, "id": rid}


@app.get("/recent")
def recent(limit: int = 10) -> Dict[str, Any]:
    rows = fetch_recent(limit=limit)
    return {"ok": True, "results": rows}


# Jobs endpoints (Remotive provider)

@app.get("/jobs/categories")
async def jobs_categories(source: str = Query("remotive")) -> Dict[str, Any]:
    if source != "remotive":
        raise HTTPException(status_code=400, detail="Only 'remotive' is supported currently")
    cats = await remotive_categories()
    return {"ok": True, "results": [{"id": c.id, "name": c.name} for c in cats]}


@app.get("/jobs/search")
async def jobs_search(
    query: str = "",
    location: str | None = None,
    category: str | None = None,
    source: str = Query("remotive"),
    page: int = 1,
    per_page: int = 50,
    job_type: str | None = None,
) -> Dict[str, Any]:
    if source != "remotive":
        raise HTTPException(status_code=400, detail="Only 'remotive' is supported currently")
    # Bounds for pagination
    if page <= 0:
        page = 1
    per_page = max(10, min(per_page, 100))
    jobs: list[JobItem] = await remotive_jobs(query=query, category=category)
    loc = (location or "").strip().lower()
    if loc:
        jobs = [j for j in jobs if loc in (j.location or "").lower()]
    jt = (job_type or "").strip().lower()
    if jt:
        # Accept exact or contains for internship etc.
        def _jt_ok(x: str | None) -> bool:
            s = (x or "").lower()
            if not s:
                return False
            if s == jt:
                return True
            # Soft contains for common synonyms
            if jt in {"intern", "internship", "internships"} and ("intern" in s):
                return True
            return jt in s
        jobs = [j for j in jobs if _jt_ok(j.job_type)]

    # Additional token-based filtering to improve matches
    tokens = [t for t in query.lower().split() if t]
    if tokens:
        def _hay(j: JobItem) -> str:
            parts = [j.title or "", j.company or "", j.location or "", j.description or ""]
            if j.tags:
                parts.extend(j.tags)
            return " \n ".join(parts).lower()
        all_matches = [j for j in jobs if all(tok in _hay(j) for tok in tokens)]
        if all_matches:
            jobs = all_matches
        else:
            # If strict 'all tokens' yields none, fall back to 'any token'
            any_matches = [j for j in jobs if any(tok in _hay(j) for tok in tokens)]
            jobs = any_matches or jobs

    total = len(jobs)
    start = (page - 1) * per_page
    end = start + per_page
    results = jobs[start:end]
    return {
        "ok": True,
        "page": page,
        "per_page": per_page,
        "total": total,
        "results": [
            {
                "id": j.id,
                "source": j.source,
                "title": j.title,
                "company": j.company,
                "location": j.location,
                "url": j.url,
                "posted_at": j.posted_at,
                "description": j.description,
                "job_type": j.job_type,
                "tags": j.tags,
                "salary": j.salary,
            }
            for j in results
        ],
    }


@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Accept a resume file and extract text.

    Supports .pdf, .docx, .txt. Returns extracted text for client-side analysis.
    """
    name = (file.filename or "").lower()
    content = await file.read()
    # Basic size limit: 8 MB
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (limit 8MB)")

    extracted = ""
    try:
        if name.endswith(".pdf"):
            # Use pypdf
            import io

            reader = PdfReader(io.BytesIO(content))
            parts = []
            for page in reader.pages:
                try:
                    parts.append(page.extract_text() or "")
                except Exception:
                    continue
            extracted = "\n".join(parts)
        elif name.endswith(".docx"):
            if docx is None:
                raise HTTPException(status_code=500, detail="DOCX support not available")
            import io

            doc = docx.Document(io.BytesIO(content))  # type: ignore[attr-defined]
            extracted = "\n".join(p.text for p in doc.paragraphs)
        elif name.endswith(".txt"):
            # Try utf-8 then latin-1
            try:
                extracted = content.decode("utf-8")
            except Exception:
                extracted = content.decode("latin-1", errors="ignore")
        else:
            raise HTTPException(status_code=415, detail="Unsupported file type. Use PDF, DOCX, or TXT.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {e}")

    if not extracted.strip():
        raise HTTPException(status_code=422, detail="No text extracted from resume")

    return {"ok": True, "text": extracted}


class FeedbackRequest(BaseModel):
    resume_text: str
    job_text: str | None = None


@app.post("/ai/feedback")
def ai_feedback(req: FeedbackRequest) -> Dict[str, Any]:
    # Guard input length; keep this much for AI context
    resume_txt = (req.resume_text or "").strip()
    job_txt = (req.job_text or "").strip() if req.job_text else None
    if len(resume_txt) > 40_000 or (job_txt and len(job_txt) > 40_000):
        raise HTTPException(status_code=413, detail="Input too large (limit 40k chars)")

    cfg = load_config()
    suggestions: list[str] = []

    rewrites: list[dict] = []
    if cfg.openai_enabled and cfg.openai_api_key:
        suggestions = ai_resume_feedback(resume_txt, job_txt)
        # Try a few bullet rewrites as well
        rewrites = ai_bullet_rewrites(resume_txt, job_txt, max_items=3)

    # Heuristic fallback if AI disabled or no output
    if not suggestions:
        basic: list[str] = []
        t = resume_txt
        if len(t) < 400:
            basic.append("Add more detail. Aim for a concise 1–2 page resume with highlights.")
        if "responsible for" in t.lower():
            basic.append("Replace weak phrasing like 'responsible for' with stronger verbs (Led, Spearheaded).")
        if not any(ch.isdigit() for ch in t):
            basic.append("Quantify impact by adding metrics (%, $, #).")
        if not any(b in t for b in ["•", "- ", "* "]):
            basic.append("Use concise bullet points for readability.")
        suggestions = basic[:6]

    return {"ok": True, "suggestions": suggestions, "rewrites": rewrites}


class CoverLetterRequest(BaseModel):
    resume_text: str
    job_text: str
    tone: str | None = "professional"


@app.post("/ai/cover-letter")
def ai_cover_letter_endpoint(req: CoverLetterRequest) -> Dict[str, Any]:
    if len(req.resume_text or "") > 40_000 or len(req.job_text or "") > 40_000:
        raise HTTPException(status_code=413, detail="Input too large (limit 40k chars)")
    cfg = load_config()
    text = ""
    if cfg.openai_enabled and cfg.openai_api_key:
        text = ai_cover_letter(req.resume_text, req.job_text, (req.tone or "professional"))
    if not text:
        # Fallback template
        text = (
            "Dear Hiring Team,\n\nI’m excited to apply for this role. My background closely aligns with the job description, "
            "and I have hands-on experience in the listed technologies. I consistently focus on measurable outcomes, "
            "collaboration, and clear communication. I’d welcome the chance to discuss how I can contribute.\n\nSincerely,\nYour Name"
        )
    return {"ok": True, "cover_letter": text}


@app.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: int) -> Dict[str, Any]:
    row = fetch_by_id(analysis_id)
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"ok": True, "result": row}
