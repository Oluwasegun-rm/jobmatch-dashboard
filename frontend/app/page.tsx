"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const path = mode === 'signup' ? '/auth/signup' : '/auth/login'
      const body: any = { username, password }
      if (mode === 'signup' && displayName.trim()) body.display_name = displayName.trim()
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.detail || 'Auth failed')
      const token = data.token as string
      const dn = data.user?.display_name as string
      localStorage.setItem('jobmatch:token', token)
      localStorage.setItem('jobmatch:display_name', dn || username)
      onClose()
      window.location.reload()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[440px] bg-white rounded-xl border border-outline-variant shadow-xl">
        <div className="p-5 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-[18px] font-semibold text-primary">{mode === 'login' ? 'Sign in' : 'Create account'}</h3>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary" onClick={onClose}>close</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Username</label>
            <input value={username} onChange={(e)=>setUsername(e.target.value)} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm" placeholder="yourname" />
          </div>
          {mode==='signup' && (
            <div>
              <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Display Name</label>
              <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm" placeholder="What others see" />
            </div>
          )}
          <div>
            <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm" placeholder="••••••••" />
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="flex items-center justify-between">
            <button onClick={submit} disabled={loading || !username || !password} className="bg-primary text-on-primary px-5 py-2 rounded-lg font-bold disabled:opacity-50">{loading ? 'Please wait…' : (mode==='login' ? 'Sign in' : 'Create')}</button>
            <button onClick={()=>setMode(mode==='login'?'signup':'login')} className="text-sm text-on-surface-variant hover:underline">{mode==='login'? 'Create an account' : 'Have an account? Sign in'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false)
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <main className="max-w-[1600px] mx-auto px-gutter md:px-container-padding">
        {/* Hero */}
        <section className="py-section-gap flex flex-col md:flex-row items-center gap-12 min-h-[600px]">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full">
              <span className="uppercase text-[12px] font-bold">Enterprise Tier Available</span>
            </div>
            <h1 className="text-[48px] md:text-[64px] leading-tight text-primary font-extrabold tracking-tighter">JobMatch AI Dashboard</h1>
            <p className="text-title-sm text-on-surface-variant max-w-xl">
              Keyword-powered resume and job analysis that highlights matched and missing skills, with a clean, transparent scoring model.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/analysis" className="bg-primary text-on-primary px-8 py-3 rounded-lg font-bold hover:opacity-90 active:scale-[0.98]">Analyze Resume</Link>
              <Link href="/jobs" className="bg-surface border border-outline-variant text-primary px-8 py-3 rounded-lg font-bold hover:bg-surface-container-low">Browse Jobs</Link>
              <button onClick={()=>setAuthOpen(true)} className="px-8 py-3 border border-outline-variant rounded-lg font-bold hover:bg-surface-container-low">Sign in</button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-2xl">
            <div className="rounded-xl border border-outline-variant shadow-sm overflow-hidden aspect-video relative">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9raOvxDvXbW3rdUvpFzUy-UXTYrsdMNVkvYA8BZrp8b4ZJF6vF-JxMOK7jPv_hCSl5NLfyZZJnXVDPwjiySXF7iMG4OCqyjkYJV4B7tc1daS0w4pWntvpNm_F1VQWm84B184h1j9dlRo0cZDbpc9thp_z3jpvvBCh2MakljcDD12QC1u--wygOrNgdTMhxzehPZOKeWCtpifdHTbmixhhU6Dx3qfJVrRq1WnXbZl9q6iJA1E53RjLNRcyCn3Fz9HmuLUXjj60Wc8"
                alt="JobMatch AI Dashboard preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-section-gap">
          <div className="mb-12">
            <h2 className="text-display-lg text-primary mb-2">How it works</h2>
            <p className="text-on-surface-variant">Three steps to optimize your professional presence.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-white border border-outline-variant rounded-xl p-card-padding">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary-container flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined">troubleshoot</span>
                </div>
                <h3 className="text-headline-md text-primary">AI Match Scoring</h3>
                <p className="text-on-surface-variant max-w-lg">We compute overlap between job-required and resume-present skills and surface actionable gaps.</p>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="px-4 py-2 bg-surface-container-high rounded-lg border border-outline-variant">
                  <span className="font-mono text-primary font-bold">MATCH: 85%</span>
                </div>
                <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[85%]" />
                </div>
              </div>
            </div>
            <div className="md:col-span-4 bg-white border border-outline-variant rounded-xl p-card-padding">
              <div className="h-12 w-12 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <h3 className="mt-4 text-headline-md text-primary">Skill Gap Analysis</h3>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-error text-sm"><span className="material-symbols-outlined text-[16px]">close</span> Missing: Kubernetes</li>
                <li className="flex items-center gap-2 text-on-surface-variant text-sm"><span className="material-symbols-outlined text-[16px]">check</span> Found: Terraform</li>
              </ul>
            </div>
            {/* Real-time Resume Feedback (Stitch-style) */}
            <div className="md:col-span-8 bg-surface-bright border border-outline-variant rounded-xl p-card-padding flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-3">
                <h3 className="text-headline-md text-primary">Real-time Resume Feedback</h3>
                <p className="text-on-surface-variant">Get instant coaching as you refine your resume. We suggest stronger verbs, quantify impact, and highlight clarity issues.</p>
                <button className="text-primary font-bold border-b border-primary pb-0.5 w-max hover:opacity-70">Learn more about AI Coaching</button>
              </div>
              <div className="w-full md:w-1/3">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-outline-variant space-y-3">
                  <div className="h-2 w-3/4 bg-surface-container rounded-full"></div>
                  <div className="h-2 w-full bg-surface-container rounded-full"></div>
                  <div className="p-2 bg-primary-container/10 border-l-4 border-primary rounded">
                    <p className="text-[10px] font-mono text-primary">AI SUGGESTION: Replace "responsible for" with "Spearheaded" and add a metric (+15%).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-section-gap mb-16">
          <div className="bg-primary-container text-on-primary rounded-2xl p-12 text-center space-y-8 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-display-lg text-white mb-4">Ready to land your dream role?</h2>
              <p className="text-on-primary-container max-w-2xl mx-auto mb-8">Start with a transparent baseline today—no secrets, no black boxes.</p>
              <Link href="/analysis" className="bg-white text-primary px-10 py-4 rounded-lg font-bold hover:bg-surface-container-low active:scale-[0.98]">Get Started for Free</Link>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed-dim/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-fixed-dim/5 rounded-full blur-2xl -ml-24 -mb-24" />
          </div>
        </section>
      </main>
      <AuthModal open={authOpen} onClose={()=>setAuthOpen(false)} />

      <footer className="bg-surface-container py-12 border-t border-outline-variant">
        <div className="max-w-[1600px] mx-auto px-gutter flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">work</span>
            <span className="text-body-base font-bold text-primary">JobMatch AI</span>
          </div>
          <div className="flex gap-8 text-on-surface-variant text-sm">
            <a className="hover:text-primary" href="#">Privacy Policy</a>
            <a className="hover:text-primary" href="#">Terms of Service</a>
            <a className="hover:text-primary" href="#">Contact Support</a>
          </div>
          <p className="text-on-surface-variant text-sm">© 2026 JobMatch AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
