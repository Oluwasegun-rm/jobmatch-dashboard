"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Analysis = {
  id: number
  created_at: string
  score: number
  name?: string | null
  resume_text: string
  job_text: string
  matched_skills: string[]
  missing_skills: string[]
  job_title?: string | null
  job_company?: string | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export default function ComparePage() {
  const [leftId, setLeftId] = useState<number>(0)
  const [rightId, setRightId] = useState<number>(0)
  const [left, setLeft] = useState<Analysis | null>(null)
  const [right, setRight] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      setLeftId(Number(sp.get('left')||0)||0)
      setRightId(Number(sp.get('right')||0)||0)
    } catch {}
  }, [])

  useEffect(() => {
    let abort = false
    async function load(id: number, setter: (a: Analysis)=>void) {
      const res = await fetch(`${API_BASE}/analysis/${id}`)
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.detail || 'Failed to load')
      if (!abort) setter(data.result as Analysis)
    }
    setError(null)
    Promise.allSettled([
      leftId ? load(leftId, (a)=>setLeft(a)) : Promise.resolve(),
      rightId ? load(rightId, (a)=>setRight(a)) : Promise.resolve(),
    ]).catch(()=>{})
    return () => { abort = true }
  }, [leftId, rightId])

  const allMatched = Array.from(new Set([...(left?.matched_skills||[]), ...(right?.matched_skills||[])])).sort()
  const allMissing = Array.from(new Set([...(left?.missing_skills||[]), ...(right?.missing_skills||[])])).sort()

  function title(a: Analysis | null): string {
    if (!a) return ''
    if (a.name && a.name.trim()) return a.name.trim()
    if (a.job_title) return `${a.job_title}${a.job_company ? ' – ' + a.job_company : ''}`
    return `Analysis #${a.id}`
  }

  return (
    <div className="min-h-screen">
      <main className="min-h-screen">
        <div className="max-w-[1600px] mx-auto p-container-padding">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-display-lg dark:text-neutral-100">Compare Analyses</h1>
            <Link href="/analysis" className="text-sm font-bold text-primary hover:underline">Back to Analysis</Link>
          </div>
          {(leftId===0 || rightId===0) && <p className="text-sm text-on-surface-variant">Provide two ids via left and right query params.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-title-sm font-semibold dark:text-neutral-100 truncate">{title(left)}</h2>
                {left && <span className="text-sm font-mono">{left.score}%</span>}
              </div>
              {!left && leftId>0 && <p className="text-sm text-on-surface-variant">Loading…</p>}
              {left && (
                <>
                  <p className="text-[12px] text-on-surface-variant uppercase font-bold">Matched</p>
                  <div className="mt-1 flex flex-wrap gap-2 mb-3">
                    {left.matched_skills.map(s => <span key={s} className="px-2 py-0.5 text-[11px] rounded-full bg-surface-container-low border border-outline-variant dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100">{s}</span>)}
                  </div>
                  <p className="text-[12px] text-on-surface-variant uppercase font-bold">Missing</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {left.missing_skills.map(s => <span key={s} className="px-2 py-0.5 text-[11px] rounded-full bg-error/10 border border-error/20 text-error dark:bg-neutral-900 dark:border-neutral-700">{s}</span>)}
                  </div>
                </>
              )}
            </div>
            {/* Right */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-title-sm font-semibold dark:text-neutral-100 truncate">{title(right)}</h2>
                {right && <span className="text-sm font-mono">{right.score}%</span>}
              </div>
              {!right && rightId>0 && <p className="text-sm text-on-surface-variant">Loading…</p>}
              {right && (
                <>
                  <p className="text-[12px] text-on-surface-variant uppercase font-bold">Matched</p>
                  <div className="mt-1 flex flex-wrap gap-2 mb-3">
                    {right.matched_skills.map(s => <span key={s} className="px-2 py-0.5 text-[11px] rounded-full bg-surface-container-low border border-outline-variant dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100">{s}</span>)}
                  </div>
                  <p className="text-[12px] text-on-surface-variant uppercase font-bold">Missing</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {right.missing_skills.map(s => <span key={s} className="px-2 py-0.5 text-[11px] rounded-full bg-error/10 border border-error/20 text-error dark:bg-neutral-900 dark:border-neutral-700">{s}</span>)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick diff overview */}
          {left && right && (
            <div className="mt-6 bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm p-6">
              <h3 className="text-title-sm font-semibold dark:text-neutral-100 mb-2">Highlights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-on-surface-variant uppercase font-bold">Only in Left (Matched)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allMatched.filter(s => (left.matched_skills||[]).includes(s) && !(right.matched_skills||[]).includes(s)).map(s => (
                      <span key={s} className="px-2 py-0.5 text-[11px] rounded-full bg-primary-fixed/60 border border-outline-variant dark:border-neutral-700 dark:text-neutral-900">{s}</span>
                    ))}
                    {allMatched.filter(s => (left.matched_skills||[]).includes(s) && !(right.matched_skills||[]).includes(s)).length===0 && <span className="text-sm text-on-surface-variant">None</span>}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-on-surface-variant uppercase font-bold">Only in Right (Matched)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allMatched.filter(s => (right.matched_skills||[]).includes(s) && !(left.matched_skills||[]).includes(s)).map(s => (
                      <span key={s} className="px-2 py-0.5 text-[11px] rounded-full bg-primary-fixed/60 border border-outline-variant dark:border-neutral-700 dark:text-neutral-900">{s}</span>
                    ))}
                    {allMatched.filter(s => (right.matched_skills||[]).includes(s) && !(left.matched_skills||[]).includes(s)).length===0 && <span className="text-sm text-on-surface-variant">None</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
