"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import PageToolbar from '../../components/PageToolbar'

type Category = { id: string; name: string }
type JobItem = {
  id: string
  source: string
  title: string
  company: string
  location: string
  url: string
  posted_at: string
  description: string
  job_type?: string | null
  tags?: string[] | null
  salary?: string | null
}
type SearchResponse = { ok: boolean; results: JobItem[]; total: number; page: number; per_page: number }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export default function JobsPage() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [jobType, setJobType] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [providers, setProviders] = useState<{id:string; name:string}[]>([{ id: 'remotive', name: 'Remotive' }])
  const [source, setSource] = useState<string>('remotive')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<JobItem[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewJob, setPreviewJob] = useState<JobItem | null>(null)
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [total, setTotal] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch(`${API_BASE}/jobs/categories?source=${encodeURIComponent(source)}`)
        const data = await res.json()
        if (data?.ok) setCategories(data.results)
      } catch (e) {
        // ignore categories errors in UI
      }
    }
    async function loadProviders() {
      try {
        const res = await fetch(`${API_BASE}/jobs/providers`)
        const data = await res.json()
        if (data?.ok && Array.isArray(data.results) && data.results.length) {
          setProviders(data.results)
          // Keep source if still available, else reset
          if (!data.results.find((p:any)=>p.id===source)) setSource(data.results[0].id)
        }
      } catch {}
    }
    loadProviders()
    loadCategories()
    try {
      const raw = localStorage.getItem('jobmatch:favorites')
      if (raw) setFavs(new Set<string>(JSON.parse(raw)))
    } catch {}
  }, [source])

  useEffect(() => {
    return () => {
      try { abortRef.current?.abort() } catch {}
    }
  }, [])

  async function onSearch(p: number = page, pp: number = perPage) {
    setError(null)
    setLoading(true)
    setResults([])
    try {
      try { abortRef.current?.abort() } catch {}
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const params = new URLSearchParams()
      if (query.trim()) params.set('query', query.trim())
      if (category) params.set('category', category)
      if (location.trim()) params.set('location', location.trim())
      if (jobType) params.set('job_type', jobType)
      if (source) params.set('source', source)
      params.set('page', String(p))
      params.set('per_page', String(pp))
      const res = await fetch(`${API_BASE}/jobs/search?${params.toString()}`, { signal: ctrl.signal })
      const data: SearchResponse = await res.json()
      if (!data?.ok) throw new Error('Search failed')
      setResults(data.results)
      setTotal(data.total || 0)
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Failed to search')
    } finally {
      setLoading(false)
    }
  }

  function htmlToText(html: string): string {
    try {
      const el = document.createElement('div')
      el.innerHTML = html
      return (el.textContent || el.innerText || '').trim()
    } catch {
      return html.replace(/<[^>]+>/g, '').trim()
    }
  }

  function useJob(job: JobItem) {
    // Persist selected job to localStorage so analyzer page can preload
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'jobmatch:selected_job_meta',
        JSON.stringify({
          source: job.source,
          url: job.url,
          title: job.title,
          company: job.company,
        })
      )
      // Store a plain-text version of the job description
      localStorage.setItem('jobmatch:selected_job_description', htmlToText(job.description))
      window.location.href = '/analysis'
    }
  }

  function toggleFav(id: string) {
    const next = new Set(favs)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFavs(next)
    try { localStorage.setItem('jobmatch:favorites', JSON.stringify(Array.from(next))) } catch {}
  }

  function stripHtml(html: string, max = 180): string {
    try {
      const el = document.createElement('div')
      el.innerHTML = html
      const txt = el.textContent || el.innerText || ''
      return txt.length > max ? txt.slice(0, max - 1) + '…' : txt
    } catch {
      const txt = html.replace(/<[^>]+>/g, '')
      return txt.length > max ? txt.slice(0, max - 1) + '…' : txt
    }
  }

  return (
    <div className="min-h-screen">
      {/* Main */}
      <main className="min-h-screen flex flex-col">
        <PageToolbar title="Jobs" placeholder="Search saved jobs...">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFavoritesOnly(false); setPage(1); onSearch(1, perPage) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${!favoritesOnly ? 'border-primary text-primary bg-primary-fixed/30' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}
            >All</button>
            <button
              onClick={() => { setFavoritesOnly(true); setPage(1); onSearch(1, perPage) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${favoritesOnly ? 'border-primary text-primary bg-primary-fixed/30' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}
            >Favorites</button>
          </div>
        </PageToolbar>
        <div className="p-container-padding max-w-[1200px] mx-auto w-full space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-card-padding border-b border-outline-variant bg-surface-container-lowest">
              <span className="text-[12px] text-on-surface-variant uppercase font-bold">Search</span>
            </div>
            <div className="p-card-padding grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="col-span-2">
                <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Query</label>
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm" placeholder="e.g., data analyst, machine learning" />
              </div>
              <div>
                <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm" placeholder="e.g., USA, Europe" />
              </div>
              <div>
                <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm">
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Job Type</label>
                <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm">
                  <option value="">All</option>
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Source</label>
                <select value={source} onChange={(e)=>{ setSource(e.target.value); setPage(1); onSearch(1, perPage) }} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm">
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-card-padding bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-4">
                {error && <p className="text-error text-sm">{error}</p>}
              </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onSearch(page, perPage)} disabled={loading} className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2">
                    {loading ? 'Searching…' : 'Search'}
                    <span className="material-symbols-outlined">search</span>
                  </button>
                  <div className="hidden md:flex items-center gap-2 text-sm">
                    <span className="text-on-surface-variant">Per page</span>
                    <select value={perPage} onChange={(e)=>{ const pp = Number(e.target.value); setPerPage(pp); setPage(1); onSearch(1, pp) }} className="p-1 border border-outline-variant rounded">
                      {[25,50,75,100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 gap-4">
            {loading && (
              <>
                {[...Array(3)].map((_,i) => (
                  <div key={i} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 animate-pulse">
                    <div className="h-4 w-40 bg-surface-container rounded mb-2" />
                    <div className="h-3 w-60 bg-surface-container rounded mb-3" />
                    <div className="h-3 w-full bg-surface-container rounded" />
                  </div>
                ))}
              </>
            )}
            {results
              .filter(j => !favoritesOnly || favs.has(j.id))
              .map((j) => (
              <div key={j.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 transition-all hover:shadow-md hover:border-primary/40" role="group" aria-label={`${j.title} at ${j.company}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary">work</span>
                      <h3 className="text-[16px] font-semibold truncate group-hover:underline">{j.title}</h3>
                    </div>
                    <p className="text-sm text-on-surface-variant truncate">{j.company} • {j.location}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {j.job_type && <span className="px-2 py-0.5 text-[11px] rounded-full border border-outline-variant bg-surface-container-low">{j.job_type.replace('_',' ')}</span>}
                      {j.salary && <span className="px-2 py-0.5 text-[11px] rounded-full border border-outline-variant bg-primary-fixed text-on-primary-container">{j.salary}</span>}
                      <span className="text-[11px] text-on-surface-variant">{new Date(j.posted_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant line-clamp-2">{stripHtml(j.description)}</p>
                    {j.tags && j.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {j.tags.slice(0,6).map((t) => (
                          <span key={t} className="px-2 py-0.5 text-[11px] rounded-full bg-surface-container-low border border-outline-variant">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleFav(j.id)} title={favs.has(j.id) ? 'Unfavorite' : 'Favorite'} className={`px-2 py-1.5 rounded-lg text-sm font-bold border ${favs.has(j.id) ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                      <span className="material-symbols-outlined">{favs.has(j.id) ? 'star' : 'star_rate'}</span>
                    </button>
                    <button onClick={() => { setPreviewJob(j); setPreviewOpen(true) }} className="border border-outline-variant px-3 py-1 rounded-lg text-sm font-bold hover:bg-surface-container-low">Preview</button>
                    <a href={j.url} target="_blank" className="border border-outline-variant px-3 py-1 rounded-lg text-sm font-bold hover:bg-surface-container-low">View</a>
                    <button onClick={() => useJob(j)} className="bg-primary text-on-primary px-3 py-1 rounded-lg text-sm font-bold">Use this job</button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && results.length === 0 && (
              <p className="text-sm text-on-surface-variant">No results yet. Try a search.</p>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-on-surface-variant">Page {page} of {Math.max(1, Math.ceil(total / perPage))} • {total} results</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (page > 1) { const p = page - 1; setPage(p); onSearch(p, perPage) } }}
                disabled={loading || page <= 1}
                className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-surface-container-low"
              >Previous</button>
              <button
                onClick={() => { const maxP = Math.max(1, Math.ceil(total / perPage)); if (page < maxP) { const p = page + 1; setPage(p); onSearch(p, perPage) } }}
                disabled={loading || page >= Math.max(1, Math.ceil(total / perPage))}
                className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-surface-container-low"
              >Next</button>
            </div>
          </div>

          {/* Quick View Drawer */}
          {previewOpen && previewJob && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/30" onClick={()=> setPreviewOpen(false)} />
              <div className="absolute right-0 top-0 h-full w-full max-w-[720px] bg-white border-l border-outline-variant shadow-xl p-6 overflow-y-auto">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-[20px] font-semibold truncate">{previewJob.title}</h3>
                    <p className="text-sm text-on-surface-variant truncate">{previewJob.company} • {previewJob.location}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {previewJob.job_type && <span className="px-2 py-0.5 text-[11px] rounded-full border border-outline-variant bg-surface-container-low">{previewJob.job_type.replace('_',' ')}</span>}
                      {previewJob.salary && <span className="px-2 py-0.5 text-[11px] rounded-full border border-outline-variant bg-primary-fixed text-on-primary-container">{previewJob.salary}</span>}
                      <span className="text-[11px] text-on-surface-variant">{new Date(previewJob.posted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button className="text-on-surface-variant hover:text-primary" onClick={()=> setPreviewOpen(false)} title="Close">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                {previewJob.tags && previewJob.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previewJob.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 text-[11px] rounded-full bg-surface-container-low border border-outline-variant">{t}</span>
                    ))}
                  </div>
                )}
                <div className="mt-4 prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: previewJob.description }} />
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <a href={previewJob.url} target="_blank" className="border border-outline-variant px-3 py-1 rounded-lg text-sm font-bold hover:bg-surface-container-low">Open Original</a>
                  <button onClick={() => { useJob(previewJob); setPreviewOpen(false) }} className="bg-primary text-on-primary px-3 py-1 rounded-lg text-sm font-bold">Use this job</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
