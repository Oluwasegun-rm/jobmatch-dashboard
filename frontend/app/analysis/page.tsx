"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PageToolbar from '../../components/PageToolbar'

type AnalyzeResponse = {
  ok: boolean
  result: {
    score: number
    matched_skills: string[]
    missing_skills: string[]
    resume_skills: string[]
    job_skills: string[]
    suggestions: string[]
    narrative: string
  }
}

type RecentItem = { id: number; created_at: string; score: number; matched_skills: string[]; missing_skills: string[]; job_title?: string | null; job_company?: string | null }
type JobMeta = { source?: string; url?: string; title?: string; company?: string }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export default function AnalysisPage() {
  const [resume, setResume] = useState('')
  const [job, setJob] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResponse['result'] | null>(null)
  const [history, setHistory] = useState<RecentItem[]>([])
  const [jobMeta, setJobMeta] = useState<JobMeta | null>(null)
  const [uploading, setUploading] = useState(false)
  const [jobUrl, setJobUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [fbLoading, setFbLoading] = useState(false)
  const [feedback, setFeedback] = useState<string[]>([])
  const [rewrites, setRewrites] = useState<{original:string; improved:string; rationale?: string}[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const [undoOpen, setUndoOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [prevResume, setPrevResume] = useState('')
  const [prevJob, setPrevJob] = useState('')
  // read query string on client for deep-linking

  const canAnalyze = useMemo(() => resume.trim().length > 0 && job.trim().length > 0, [resume, job])

  function htmlToText(html: string): string {
    try {
      const el = document.createElement('div')
      el.innerHTML = html
      return (el.textContent || el.innerText || '').trim()
    } catch {
      return html.replace(/<[^>]+>/g, '').trim()
    }
  }

  async function fetchHistory() {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jobmatch:token') : null
      const res = await fetch(`${API_BASE}/recent`, { headers: token ? { 'Authorization': `Bearer ${token}` } : undefined })
      const data = await res.json()
      if (data?.ok) setHistory(data.results)
    } catch {}
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const storedDesc = localStorage.getItem('jobmatch:selected_job_description')
      const storedMeta = localStorage.getItem('jobmatch:selected_job_meta')
      if (storedDesc && !job.trim()) setJob(htmlToText(storedDesc))
      if (storedMeta) setJobMeta(JSON.parse(storedMeta))
    } catch {}
  }, [])

  // If deep-linked with ?id=, load that analysis session
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const idParam = sp.get('id')
      if (!idParam) return
      const id = Number(idParam)
      if (!Number.isFinite(id)) return
      loadAnalysisById(id)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function computeAnalysis(r: string, j: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jobmatch:token') : null
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify({ resume_text: r, job_text: j }),
    })
    const data: AnalyzeResponse = await res.json()
    if (!data.ok) throw new Error('Analysis failed')
    setResult(data.result)
    return data.result
  }

  async function onAnalyze() {
    if (!canAnalyze) return
    setError(null)
    setLoading(true)
    setResult(null)
    try {
      setPrevResume(resume)
      setPrevJob(job)
      const analyzed = await computeAnalysis(resume, job)
      // Auto-save the analysis after successful analyze
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('jobmatch:token') : null
        const saveRes = await fetch(`${API_BASE}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            resume_text: resume,
            job_text: job,
            score: analyzed.score,
            matched_skills: analyzed.matched_skills,
            missing_skills: analyzed.missing_skills,
            job_source: jobMeta?.source ?? null,
            job_url: jobMeta?.url ?? null,
            job_title: jobMeta?.title ?? null,
            job_company: jobMeta?.company ?? null,
          }),
        })
        const saved = await saveRes.json()
        await fetchHistory()
        setToastMsg(`Analysis saved${saved?.id ? ` (#${saved.id})` : ''}.`)
        setUndoOpen(true)
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze')
    } finally {
      setLoading(false)
    }
  }

  async function loadAnalysisById(id: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/analysis/${id}`)
      const data = await res.json()
      if (!data?.ok) throw new Error('Failed to load analysis')
      const r = String(data.result.resume_text || '')
      const j = htmlToText(String(data.result.job_text || ''))
      setResume(r)
      setJob(j)
      setJobMeta({
        source: data.result.job_source || undefined,
        url: data.result.job_url || undefined,
        title: data.result.job_title || undefined,
        company: data.result.job_company || undefined,
      })
      await computeAnalysis(r, j)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setError(e?.message || 'Failed to load analysis')
    } finally {
      setLoading(false)
    }
  }

  async function onSave() {
    if (!result) return
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jobmatch:token') : null
      const res = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          resume_text: resume,
          job_text: job,
          score: result.score,
          matched_skills: result.matched_skills,
          missing_skills: result.missing_skills,
          job_source: jobMeta?.source ?? null,
          job_url: jobMeta?.url ?? null,
          job_title: jobMeta?.title ?? null,
          job_company: jobMeta?.company ?? null,
        }),
      })
      const data = await res.json()
      if (data?.ok) {
        await fetchHistory()
        alert(`Saved analysis ID ${data.id}`)
        try {
          localStorage.removeItem('jobmatch:selected_job_description')
          localStorage.removeItem('jobmatch:selected_job_meta')
        } catch {}
      } else throw new Error('Save failed')
    } catch (e: any) {
      alert(e?.message || 'Save failed')
    }
  }

  async function onUploadResume(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/upload-resume`, { method: 'POST', body: form })
      const data = await res.json()
      if (!data?.ok) throw new Error(data?.detail || 'Upload failed')
      setResume(data.text)
    } catch (e: any) {
      alert(e?.message || 'Failed to upload')
    } finally {
      setUploading(false)
    }
  }

  // Lightweight live resume feedback (client-side heuristics)
  // Replace heuristics with server-side AI feedback (debounced)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    let aborted = false
    if (!resume.trim()) {
      setFeedback([])
      return
    }
    setFbLoading(true)
    timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume_text: resume, job_text: job || null }),
        })
        const data = await res.json()
        if (!aborted) {
          setFeedback((data?.suggestions as string[]) || [])
          setMissing((data?.missing_keywords as string[]) || [])
          setRewrites(((data?.rewrites as any[]) || []).map((r) => ({ original: String(r.original || ''), improved: String(r.improved || ''), rationale: String(r.rationale || '') })))
        }
      } catch {
        if (!aborted) setFeedback([])
      } finally {
        if (!aborted) setFbLoading(false)
      }
    }, 700)
    return () => {
      aborted = true
      if (timer) clearTimeout(timer)
    }
  }, [resume, job])

  return (
    <div className="min-h-screen">
      {/* Main */}
      <main className="min-h-screen flex flex-col">
        <PageToolbar placeholder="Search analysis history..." />
        <div className="p-container-padding max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-gutter">
          {/* Left column */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="p-card-padding border-b border-outline-variant dark:border-neutral-800 flex justify-between items-center bg-surface-container-lowest dark:bg-neutral-900">
                <h2 className="text-[18px] font-semibold flex items-center gap-2 dark:text-neutral-100">
                  <span className="material-symbols-outlined text-primary">edit_note</span>
                  Workspace
                </h2>
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-2">
                    <input
                      value={jobUrl}
                      onChange={(e)=>setJobUrl(e.target.value)}
                      className="w-72 p-2 border border-outline-variant rounded-lg text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 placeholder:dark:text-neutral-400"
                      placeholder="Paste job link…"
                    />
                    <button
                      onClick={async ()=>{
                        const u = jobUrl.trim(); if (!u) return;
                        if (job.trim()) {
                          const ok = window.confirm('Replace current job description with extracted text?')
                          if (!ok) return
                        }
                        setImporting(true)
                        try {
                          // Try backend first
                          let ok = false
                          try {
                            const res = await fetch(`${API_BASE}/extract-job`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) })
                            const data = await res.json()
                            if (res.ok && data?.ok) {
                              setJob(String(data.text || ''))
                              setJobMeta({ ...(jobMeta||{}), url: String(data.source_url||u), title: String(data.title||'') })
                              ok = true
                            }
                          } catch {}
                          if (!ok) {
                            // Fallback to Next.js API route using TS Readability
                            const res2 = await fetch(`/api/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) })
                            const data2 = await res2.json()
                            if (!res2.ok || !data2?.ok) throw new Error(data2?.detail || 'Failed to extract')
                            setJob(String(data2.text || ''))
                            setJobMeta({ ...(jobMeta||{}), url: String(data2.source_url||u), title: String(data2.title||'') })
                          }
                          setToastMsg('Imported job description from link.')
                          setUndoOpen(true)
                        } catch(e:any) {
                          alert(e?.message || 'Failed to import job text. Paste manually.')
                        } finally { setImporting(false) }
                      }}
                      disabled={importing}
                      className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-surface-container-low dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-100"
                    >{importing ? 'Importing…' : 'Import'}</button>
                  </div>
                  <input id="resume-file" type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onUploadResume(f)
                  }} />
                  <label htmlFor="resume-file" className="flex items-center gap-2 text-sm font-semibold text-primary border border-outline-variant px-4 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-100">
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    {uploading ? 'Uploading…' : 'Upload Resume'}
                  </label>
                </div>
              </div>
               <div className="p-card-padding grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Resume Text</label>
                   <textarea value={resume} onChange={(e) => setResume(e.target.value)} className="w-full h-64 p-4 text-sm border border-outline-variant dark:border-neutral-800 rounded-lg resize-none bg-surface-container-lowest dark:bg-neutral-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" placeholder="Paste resume content here..." />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Job Description</label>
                   <textarea value={job} onChange={(e) => setJob(e.target.value)} className="w-full h-64 p-4 text-sm border border-outline-variant dark:border-neutral-800 rounded-lg resize-none bg-surface-container-lowest dark:bg-neutral-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" placeholder="Paste job requirements here..." />
                 </div>
               </div>
               <div className="p-card-padding bg-surface-container-low dark:bg-neutral-900 border-t border-outline-variant dark:border-neutral-800 flex items-center justify-between">
                {error && <p className="text-error text-sm">{error}</p>}
                <button onClick={onAnalyze} disabled={!canAnalyze || loading} className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2 dark:hover:opacity-90">
                  {loading ? 'Analyzing…' : 'Analyze Match'}
                  <span className="material-symbols-outlined">bolt</span>
                </button>
              </div>
            </div>

            {/* Live Resume Feedback */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm p-6">
              <span className="text-[12px] text-on-surface-variant uppercase font-bold">Live Resume Feedback</span>
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ul className="space-y-2">
                    {fbLoading && <li className="text-sm text-on-surface-variant">Analyzing…</li>}
                    {!fbLoading && feedback.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <div className="mt-1 w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[14px] text-primary">lightbulb</span>
                        </div>
                        <p>{tip}</p>
                      </li>
                    ))}
                    {!fbLoading && !feedback.length && <p className="text-sm text-on-surface-variant">Looking good. Add role-specific highlights and metrics.</p>}
                  </ul>
                </div>
                <div>
                  <span className="text-[12px] text-on-surface-variant uppercase font-bold">Missing Keywords</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missing.length ? missing.map((m)=> (
                      <span key={m} className="px-2 py-0.5 text-[11px] rounded-full bg-surface-container-low border border-outline-variant dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100">{m}</span>
                    )) : <span className="text-sm text-on-surface-variant">None</span>}
                  </div>
                </div>
              </div>
              {(!fbLoading && rewrites.length > 0) && (
                <div className="mt-4">
                  <span className="text-[12px] text-on-surface-variant uppercase font-bold">Suggested Bullet Rewrites</span>
                  <div className="mt-2 space-y-3">
                    {rewrites.map((r, i) => (
                      <div key={i} className="border border-outline-variant rounded-lg p-3">
                        <p className="text-[12px] text-on-surface-variant mb-1">Original</p>
                        <p className="text-sm mb-2">{r.original}</p>
                        <p className="text-[12px] text-on-surface-variant mb-1">Improved</p>
                        <div className="flex items-start gap-2">
                          <p className="text-sm flex-1">{r.improved}</p>
                          <button onClick={() => navigator.clipboard.writeText(r.improved)} className="px-2 py-1 border border-outline-variant rounded text-[12px] font-bold">Copy</button>
                        </div>
                        {r.rationale && <p className="mt-2 text-[12px] text-on-surface-variant">Why: {r.rationale}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {result && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Score card */}
                <div className="md:col-span-1 bg-white dark:bg-neutral-900 p-6 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm flex flex-col items-center text-center self-start md:sticky md:top-4">
                  <span className="text-[12px] text-on-surface-variant uppercase mb-2 font-bold">Overall Match</span>
                  <div className="text-5xl font-mono text-primary">{result.score}%</div>
                  <p className="text-sm text-on-surface-variant mt-2">{result.score >= 80 ? 'Strong Fit' : result.score >= 60 ? 'Good Fit' : 'Partial Fit'}</p>
                </div>
                {/* Skills */}
                <div className="md:col-span-2 bg-white dark:bg-neutral-900 p-6 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="md:basis-1/3">
                      <p className="text-sm font-bold mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-green-600">check_circle</span>Matched Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {result.matched_skills.length ? result.matched_skills.map((s) => (
                          <span key={s} className="px-3 py-1 bg-surface-container-low border border-outline-variant rounded-full text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100">{s}</span>
                        )) : <span className="text-sm text-on-surface-variant">None</span>}
                      </div>
                    </div>
                    <div className="md:basis-2/3">
                      <p className="text-sm font-bold mb-2 flex items-center gap-1 text-error"><span className="material-symbols-outlined">error</span>Missing Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {result.missing_skills.length ? result.missing_skills.map((s) => (
                          <span key={s} className="px-3 py-1 bg-error/10 border border-error/20 text-error rounded-full text-sm dark:bg-neutral-900 dark:border-neutral-700">{s}</span>
                        )) : <span className="text-sm text-on-surface-variant">None</span>}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Analysis Summary */}
                <div className="md:col-span-3 bg-white dark:bg-neutral-900 p-6 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm">
                  <span className="text-[12px] text-on-surface-variant uppercase font-bold">Analysis Summary</span>
                  {/* Overview */}
                  <div className="mt-2">
                    <span className="text-[12px] text-on-surface-variant uppercase font-semibold">Overview</span>
                    <p className="mt-1 text-sm text-on-surface-variant whitespace-pre-wrap">{result.narrative || 'This resume shows partial alignment with the role based on explicit skill overlap.'}</p>
                  </div>
                  {/* Matched / Missing quick chips */}
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[12px] text-on-surface-variant uppercase font-semibold">Matched Highlights</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.matched_skills.length ? result.matched_skills.slice(0,6).map((s) => (
                          <span key={s} className="px-2 py-0.5 text-[11px] rounded-full bg-surface-container-low border border-outline-variant dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100">{s}</span>
                        )) : <span className="text-sm text-on-surface-variant">None</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-[12px] text-on-surface-variant uppercase font-semibold">Missing / Weak Areas</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.missing_skills.length ? result.missing_skills.slice(0,6).map((s) => (
                          <span key={s} className="px-2 py-0.5 text-[11px] rounded-full bg-error/10 border border-error/20 text-error dark:bg-neutral-900 dark:border-neutral-700">{s}</span>
                        )) : <span className="text-sm text-on-surface-variant">None</span>}
                      </div>
                    </div>
                  </div>
                  {/* Action steps preview (subset of suggestions) */}
                  <div className="mt-4">
                    <span className="text-[12px] text-on-surface-variant uppercase font-semibold">Action Steps (Preview)</span>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-on-surface-variant">
                      {(result.suggestions || []).slice(0,2).map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                      {(!result.suggestions || result.suggestions.length === 0) && (
                        <li className="text-on-surface-variant">Tailor the summary to highlight the most relevant skills and quantify impact.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="md:col-span-3 bg-white dark:bg-neutral-900 p-6 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm">
                  <span className="text-[12px] text-on-surface-variant uppercase font-bold">Suggestions</span>
                  <ul className="mt-3 space-y-2">
                    {result.suggestions.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <div className="mt-1 w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[14px] text-primary">lightbulb</span>
                        </div>
                        <p>{tip}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                  <button onClick={onSave} className="border border-outline-variant px-4 py-2 rounded-lg text-sm font-bold hover:bg-surface-container-low dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-100">Save Result</button>
                  </div>
                </div>

                {/* Cover Letter */}
                <CoverLetterCard resume={resume} job={job} />
              </div>
            )}
          </div>

          {/* Right column: History */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm flex flex-col min-h-[300px]">
              <div className="p-card-padding border-b border-outline-variant dark:border-neutral-800 flex items-center justify-between">
                <h3 className="text-[18px] font-bold flex items-center gap-2 dark:text-neutral-100">
                  <span className="material-symbols-outlined text-on-surface-variant">history</span>
                  Analysis History
                </h3>
                <span className="text-[11px] text-on-surface-variant">{history.length} Sessions</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                  {history.map((h) => (
                    <div key={h.id} className="p-3 hover:bg-surface-container-low dark:hover:bg-neutral-800 rounded-lg border border-transparent hover:border-outline-variant dark:hover:border-neutral-700">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <button className="text-left flex-1" onClick={() => loadAnalysisById(h.id)} title="View analysis">
                          <p className="text-sm font-bold truncate">{h.job_title ? `${h.job_title} – ${h.job_company ?? ''}` : `Analysis #${h.id}`}</p>
                          <p className="text-[12px] text-on-surface-variant">{new Date(h.created_at).toLocaleString()}</p>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-bold ${h.score >= 80 ? 'text-green-600' : h.score >= 60 ? 'text-on-surface-variant' : 'text-error'}`}>{h.score}%</span>
                          <button
                            className="px-2 py-1 border border-outline-variant rounded text-[12px] font-bold hover:bg-surface-container-low dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-100"
                            title="Duplicate analysis"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setLoading(true)
                                try {
                                  // Load the original analysis payload directly to avoid state timing issues
                                  const res = await fetch(`${API_BASE}/analysis/${h.id}`)
                                  const data = await res.json()
                                  if (!data?.ok) throw new Error('Failed to load analysis')
                                  const r = String(data.result.resume_text || '')
                                  const j = String(data.result.job_text || '')
                                  const analyzed = await computeAnalysis(r, j)
                                  const saveRes = await fetch(`${API_BASE}/save`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      resume_text: r,
                                      job_text: j,
                                      score: analyzed.score,
                                      matched_skills: analyzed.matched_skills,
                                      missing_skills: analyzed.missing_skills,
                                      job_source: data.result.job_source ?? null,
                                      job_url: data.result.job_url ?? null,
                                      job_title: data.result.job_title ?? null,
                                      job_company: data.result.job_company ?? null,
                                    }),
                                  })
                                  const saved = await saveRes.json()
                                  await fetchHistory()
                                  setToastMsg(`Duplicated analysis${saved?.id ? ` (#${saved.id})` : ''}.`)
                                  setUndoOpen(true)
                                } catch {}
                                setLoading(false)
                              }}
                          >Duplicate</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-sm text-on-surface-variant p-3">No saved analyses yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Undo Toast */}
      {undoOpen && (
        <div className="fixed bottom-4 right-4 bg-surface border border-outline-variant shadow-lg rounded-lg p-4 flex items-center gap-3 dark:bg-neutral-900 dark:border-neutral-800">
          <span className="text-sm">{toastMsg || 'Saved.'}</span>
          <button
            onClick={async () => { setUndoOpen(false); setResume(prevResume); setJob(prevJob); await computeAnalysis(prevResume, prevJob) }}
            className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-bold hover:bg-surface-container-low dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-100"
          >Undo</button>
          <button onClick={()=> setUndoOpen(false)} className="text-on-surface-variant text-sm hover:underline">Dismiss</button>
        </div>
      )}
    </div>
  )
}

function CoverLetterCard({ resume, job }: { resume: string; job: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  async function generate(tone: string) {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/ai/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resume, job_text: job, tone })
      })
      const data = await res.json()
      setText((data?.cover_letter as string) || '')
      setOpen(true)
    } catch {
      setText('')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }
  function copy() {
    navigator.clipboard.writeText(text)
  }
  return (
    <div className="md:col-span-3 bg-white p-6 rounded-xl border border-outline-variant shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-on-surface-variant uppercase font-bold">Cover Letter</span>
        <div className="flex gap-2">
          <button disabled={loading} onClick={() => generate('professional')} className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-bold disabled:opacity-50">{loading ? 'Generating…' : 'Generate'}</button>
          <button disabled={!text} onClick={copy} className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-bold disabled:opacity-50">Copy</button>
        </div>
      </div>
      {open && (
        <div className="mt-3">
          <textarea className="w-full h-56 p-3 border border-outline-variant rounded-lg text-sm" readOnly value={text} />
        </div>
      )}
    </div>
  )
}
