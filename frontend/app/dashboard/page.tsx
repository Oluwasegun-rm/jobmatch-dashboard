"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageToolbar from '../../components/PageToolbar'

type RecentItem = { id: number; created_at: string; score: number; job_title?: string | null; job_company?: string | null }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export default function DashboardPage() {
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [avg, setAvg] = useState<number>(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/recent`)
        const data = await res.json()
        if (data?.ok) {
          setRecent(data.results)
          const scores = (data.results as RecentItem[]).map(r => r.score)
          const mean = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0
          setAvg(mean)
        }
      } catch {}
    }
    load()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Main */}
      <main className="min-h-screen flex flex-col">
        <PageToolbar placeholder="Search analyses..." />
        <div className="p-container-padding max-w-[1600px] mx-auto w-full space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            <div className="bg-white dark:bg-neutral-900 border border-outline-variant dark:border-neutral-800 rounded-lg p-card-padding">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[12px] uppercase text-on-surface-variant dark:text-neutral-400">Avg. Match Score</span>
                <span className="material-symbols-outlined text-primary">insights</span>
              </div>
              <div className="text-display-lg font-mono text-primary dark:text-neutral-100">{avg}%</div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-outline-variant dark:border-neutral-800 rounded-lg p-card-padding">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[12px] uppercase text-on-surface-variant dark:text-neutral-400">Analyses</span>
                <span className="material-symbols-outlined text-on-surface-variant">format_list_bulleted</span>
              </div>
              <div className="text-display-lg font-mono text-primary dark:text-neutral-100">{recent.length}</div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-outline-variant dark:border-neutral-800 rounded-lg p-card-padding">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[12px] uppercase text-on-surface-variant dark:text-neutral-400">Saved Today</span>
                <span className="material-symbols-outlined text-green-600">today</span>
              </div>
              <div className="text-display-lg font-mono text-green-700 dark:text-neutral-100">{recent.filter(r=> new Date(r.created_at).toDateString()===new Date().toDateString()).length}</div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-outline-variant dark:border-neutral-800 rounded-lg p-card-padding">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[12px] uppercase text-on-surface-variant dark:text-neutral-400">Best Score</span>
                <span className="material-symbols-outlined text-amber-600">grade</span>
              </div>
              <div className="text-display-lg font-mono text-amber-700 dark:text-neutral-100">{recent.reduce((m,r)=>r.score>m?r.score:m,0)}%</div>
            </div>
          </div>

          {/* Recent Table */}
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant dark:border-neutral-800 rounded-lg overflow-hidden">
            <div className="p-card-padding border-b border-outline-variant dark:border-neutral-800 flex justify-between items-center bg-surface-bright dark:bg-neutral-900">
              <h3 className="text-title-sm font-semibold dark:text-neutral-100">Recent Analyses</h3>
              <Link href="/analysis" className="text-sm font-bold text-primary hover:underline dark:text-neutral-100">New Analysis</Link>
            </div>
            <div className="divide-y divide-outline-variant dark:divide-neutral-800">
              {recent.map((r) => (
                <Link key={r.id} href={`/analysis?id=${r.id}`} className="px-6 py-4 flex items-center justify-between hover:bg-surface-container-low dark:hover:bg-neutral-800">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate dark:text-neutral-100">{r.job_title ? `${r.job_title} – ${r.job_company ?? ''}` : `Analysis #${r.id}`}</p>
                    <p className="text-[12px] text-on-surface-variant dark:text-neutral-400">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-sm font-mono text-primary dark:text-neutral-100">{r.score}%</div>
                </Link>
              ))}
              {recent.length === 0 && <div className="px-6 py-8 text-sm text-on-surface-variant">No data yet. Run an analysis.</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
