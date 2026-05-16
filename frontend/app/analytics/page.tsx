"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import PageToolbar from '../../components/PageToolbar'

type RecentItem = {
  id: number
  created_at: string
  score: number
  matched_skills: string[]
  missing_skills: string[]
  job_title?: string | null
  job_company?: string | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function AnalyticsPage() {
  const [items, setItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/recent?limit=100`)
        const data = await res.json()
        if (data?.ok) setItems(data.results)
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const total = items.length
  const avgScore = useMemo(() => (total ? Math.round(items.reduce((a, b) => a + b.score, 0) / total) : 0), [items, total])
  const bestScore = useMemo(() => (total ? items.reduce((m, r) => (r.score > m ? r.score : m), 0) : 0), [items, total])
  const last7Count = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 6)
    return items.filter((r) => new Date(r.created_at) >= cutoff).length
  }, [items])

  // Trend: last 7 days average score by day (YYYY-MM-DD)
  const trend = useMemo(() => {
    const labels: string[] = []
    const avgs: number[] = []
    for (let i = 6; i >= 0; i--) {
      const day = daysAgo(i)
      labels.push(day.slice(5)) // MM-DD
      const dayItems = items.filter((r) => r.created_at.slice(0, 10) === day)
      const avg = dayItems.length ? Math.round(dayItems.reduce((a, b) => a + b.score, 0) / dayItems.length) : 0
      avgs.push(avg)
    }
    return { labels, avgs }
  }, [items])

  // In-demand skills: frequency from matched_skills (top 6)
  const topSkills = useMemo(() => {
    const freq: Record<string, number> = {}
    for (const it of items) {
      for (const s of it.matched_skills || []) {
        freq[s] = (freq[s] || 0) + 1
      }
    }
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
    const max = sorted.length ? sorted[0][1] : 1
    return sorted.map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }))
  }, [items])

  // Build SVG path for trend line
  const pathD = useMemo(() => {
    const w = 800
    const h = 200
    const n = trend.avgs.length || 1
    const step = w / (n - 1 || 1)
    const points = trend.avgs.map((v, i) => {
      const x = i * step
      const y = h - (v / 100) * h
      return [x, y]
    })
    if (!points.length) return ''
    let d = `M${points[0][0]} ${points[0][1]}`
    for (let i = 1; i < points.length; i++) d += ` L${points[i][0]} ${points[i][1]}`
    return d
  }, [trend])

  return (
    <div className="min-h-screen">
      {/* Main */}
      <main className="min-h-screen">
        <PageToolbar placeholder="Search analytics...">
          <button onClick={() => exportCSV(items)} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium flex items-center gap-2 active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
        </PageToolbar>
        <div className="max-w-[1600px] mx-auto p-container-padding">

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-gutter">
            <div className="bg-white border border-outline-variant rounded-lg p-card-padding dark:bg-neutral-900 dark:border-neutral-800">
              <div className="text-[12px] uppercase text-on-surface-variant">Total Analyses</div>
              <div className="text-display-lg font-mono text-primary dark:text-neutral-100">{loading ? '—' : total}</div>
            </div>
            <div className="bg-white border border-outline-variant rounded-lg p-card-padding dark:bg-neutral-900 dark:border-neutral-800">
              <div className="text-[12px] uppercase text-on-surface-variant">Avg. Match</div>
              <div className="text-display-lg font-mono text-primary dark:text-neutral-100">{loading ? '—' : `${avgScore}%`}</div>
            </div>
            <div className="bg-white border border-outline-variant rounded-lg p-card-padding dark:bg-neutral-900 dark:border-neutral-800">
              <div className="text-[12px] uppercase text-on-surface-variant">Best Score</div>
              <div className="text-display-lg font-mono text-primary dark:text-neutral-100">{loading ? '—' : `${bestScore}%`}</div>
            </div>
            <div className="bg-white border border-outline-variant rounded-lg p-card-padding dark:bg-neutral-900 dark:border-neutral-800">
              <div className="text-[12px] uppercase text-on-surface-variant">Analyses Last 7d</div>
              <div className="text-display-lg font-mono text-primary dark:text-neutral-100">{loading ? '—' : last7Count}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-12 gap-gutter mb-gutter">
            {/* Match Trends */}
            <div className="col-span-12 lg:col-span-8 bg-white border border-outline-variant rounded-lg p-card-padding min-h-[280px] flex flex-col dark:bg-neutral-900 dark:border-neutral-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-title-sm font-semibold dark:text-neutral-100">Match Confidence Trends (7d)</h3>
              </div>
              <div className="flex-1 w-full relative">
                <svg className="w-full h-48" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <line x1="0" y1="0" x2="800" y2="0" stroke="#f0edee" strokeWidth="1" />
                  <line x1="0" y1="50" x2="800" y2="50" stroke="#f0edee" strokeWidth="1" />
                  <line x1="0" y1="100" x2="800" y2="100" stroke="#f0edee" strokeWidth="1" />
                  <line x1="0" y1="150" x2="800" y2="150" stroke="#f0edee" strokeWidth="1" />
                  <path d={pathD} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary dark:text-neutral-100" />
                </svg>
                <div className="flex justify-between mt-2 text-[10px] text-on-surface-variant">
                  {trend.labels.map((l, i) => (
                    <span key={i}>{l}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* In-Demand Skills */}
            <div className="col-span-12 lg:col-span-4 bg-white border border-outline-variant rounded-lg p-card-padding min-h-[280px] dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="text-title-sm font-semibold mb-4 dark:text-neutral-100">In-Demand Skills</h3>
              <div className="space-y-4">
                {topSkills.length === 0 && <p className="text-sm text-on-surface-variant">No data yet. Save some analyses.</p>}
                {topSkills.map((s) => (
                  <div key={s.name} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium dark:text-neutral-100">{s.name}</span>
                      <span className="text-on-surface-variant font-mono dark:text-neutral-400">{s.pct}%</span>
                    </div>
                    <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden dark:bg-neutral-800">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent table */}
          <div className="bg-white border border-outline-variant rounded-lg overflow-hidden dark:bg-neutral-900 dark:border-neutral-800">
            <div className="p-card-padding border-b border-outline-variant flex justify-between items-center bg-surface-bright dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="text-title-sm font-semibold dark:text-neutral-100">Recent Match Analyses</h3>
            </div>
            <div className="divide-y divide-outline-variant dark:divide-neutral-800">
              {items.map((r) => (
                <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate dark:text-neutral-100">{r.job_title ? `${r.job_title} – ${r.job_company ?? ''}` : `Analysis #${r.id}`}</p>
                    <p className="text-[12px] text-on-surface-variant dark:text-neutral-400">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1 bg-surface-container rounded-full overflow-hidden dark:bg-neutral-800">
                      <div className="h-full bg-primary" style={{ width: `${r.score}%` }} />
                    </div>
                    <span className="text-sm font-mono text-primary dark:text-neutral-100">{r.score}%</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && !loading && <div className="px-6 py-8 text-sm text-on-surface-variant">No data yet. Run an analysis.</div>}
              {loading && <div className="px-6 py-8 text-sm text-on-surface-variant">Loading…</div>}
              {error && <div className="px-6 py-8 text-sm text-error">{error}</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function exportCSV(items: RecentItem[]) {
  const headers = ["id","created_at","score","job_title","job_company","matched_skills","missing_skills"]
  const rows = items.map(r => [
    r.id,
    r.created_at,
    r.score,
    r.job_title ?? "",
    r.job_company ?? "",
    (r.matched_skills || []).join("; "),
    (r.missing_skills || []).join("; ")
  ])
  const csv = [headers, ...rows].map(cols => cols.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'analytics.csv'
  a.click()
  URL.revokeObjectURL(url)
}
