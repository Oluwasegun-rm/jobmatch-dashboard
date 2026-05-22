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
      window.location.href = '/analysis'
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
  const [policyOpen, setPolicyOpen] = useState<null | 'privacy' | 'terms' | 'support'>(null)
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('signin') === '1') setAuthOpen(true)
      const openHandler = () => setAuthOpen(true)
      window.addEventListener('jobmatch:open-auth', openHandler as any)
      const el = document.documentElement
      const update = () => setIsDark(el.classList.contains('dark'))
      update()
      const obs = new MutationObserver(update)
      obs.observe(el, { attributes: true, attributeFilter: ['class'] })
      return () => { window.removeEventListener('jobmatch:open-auth', openHandler as any); obs.disconnect() }
    } catch {}
  }, [])
  
  function PolicyModal({ kind, onClose }: { kind: 'privacy' | 'terms' | 'support'; onClose: () => void }) {
    const titles: Record<typeof kind, string> = {
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      support: 'Contact Support',
    } as const
    const content: Record<typeof kind, React.ReactNode> = {
      privacy: (
        <>
          <p className="text-sm text-on-surface-variant">
            We store analyses to enable your history and insights. Data is used to improve your experience and is never sold. Remove sensitive information before uploading. For deletion requests, contact support.
          </p>
        </>
      ),
      terms: (
        <>
          <p className="text-sm text-on-surface-variant">
            This application is provided as-is without warranties. By using it, you agree to use it responsibly and comply with applicable laws. Do not upload content you do not have the right to share.
          </p>
        </>
      ),
      support: (
        <>
          <p className="text-sm text-on-surface-variant">
            Need help? Reach out and we\'ll get back to you shortly.
          </p>
          <p className="mt-3 text-sm">
            Email: <a className="text-primary underline" href="mailto:support@jobmatch.ai">support@jobmatch.ai</a>
          </p>
        </>
      ),
    } as const
    return (
      <div className="fixed inset-0 z-[60]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[560px] bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-xl">
          <div className="p-5 border-b border-outline-variant dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button aria-label="Close" className="material-symbols-outlined text-on-surface-variant hover:text-primary" onClick={onClose}>close</button>
              <h3 className="text-[18px] font-semibold text-primary">{titles[kind]}</h3>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {content[kind]}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-background text-on-surface dark:bg-neutral-950 dark:text-neutral-100">
      <main className="max-w-[1600px] mx-auto px-gutter md:px-container-padding">
        {/* Hero */}
        <section className="py-section-gap flex flex-col md:flex-row items-center gap-12 min-h-[600px]">
          <div className="flex-1 space-y-6">
            {/* Removed enterprise tier badge for cleaner hero */}
            <h1 className="text-[48px] md:text-[64px] leading-tight text-primary font-extrabold tracking-tighter dark:text-neutral-100">JobMatch AI Dashboard</h1>
            <p className="text-title-sm text-on-surface-variant max-w-xl dark:text-neutral-300">
              Keyword-powered resume and job analysis that highlights matched and missing skills, with a clean, transparent scoring model.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/analysis" className="bg-primary text-on-primary px-8 py-3 rounded-lg font-bold hover:opacity-90 active:scale-[0.98]">Analyze Resume</Link>
              <Link href="/jobs" className="bg-surface border border-outline-variant text-primary px-8 py-3 rounded-lg font-bold hover:bg-surface-container-low dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">Browse Jobs</Link>
              <button onClick={()=>setAuthOpen(true)} className="px-8 py-3 border border-outline-variant rounded-lg font-bold hover:bg-surface-container-low dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">Sign in</button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-2xl">
             <div className="rounded-xl border border-outline-variant dark:border-neutral-800 shadow-sm overflow-hidden aspect-video relative">
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
            <h2 className="text-display-lg text-primary mb-2 dark:text-neutral-100">How it works</h2>
            <p className="text-on-surface-variant dark:text-neutral-400">Three steps to optimize your professional presence.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-primary-container text-on-primary rounded-xl p-card-padding border border-transparent">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined">troubleshoot</span>
                </div>
                <h3 className="text-headline-md text-on-primary">AI Match Scoring</h3>
                <p className="text-on-primary/90 max-w-lg">We compute overlap between job-required and resume-present skills and surface actionable gaps.</p>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="px-4 py-2 rounded-lg border bg-white/10 border-white/20">
                  <span className="font-mono text-on-primary font-bold">MATCH: 85%</span>
                </div>
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[85%]" />
                </div>
              </div>
            </div>
            <div className="md:col-span-4 bg-primary-container text-on-primary rounded-xl p-card-padding border border-transparent">
              <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <h3 className="mt-4 text-headline-md text-on-primary">Skill Gap Analysis</h3>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-error text-sm"><span className="material-symbols-outlined text-[16px]">close</span> Missing: Kubernetes</li>
                <li className="flex items-center gap-2 text-on-primary/90 text-sm"><span className="material-symbols-outlined text-[16px]">check</span> Found: Terraform</li>
              </ul>
            </div>
            {/* Real-time Resume Feedback (Stitch-style) */}
            <div className="md:col-span-8 bg-primary-container text-on-primary border border-transparent rounded-xl p-card-padding flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-3">
                <h3 className="text-headline-md text-on-primary">Real-time Resume Feedback</h3>
                <p className="text-on-primary/90">Get instant coaching as you refine your resume. We suggest stronger verbs, quantify impact, and highlight clarity issues.</p>
              </div>
              <div className="w-full md:w-1/3">
                <div className="p-4 rounded-lg shadow-sm border space-y-3 bg-white/10 border-white/20">
                  <div className="h-2 w-3/4 bg-white/20 rounded-full"></div>
                  <div className="h-2 w-full bg-white/20 rounded-full"></div>
                  <div className="p-2 bg-white/10 border-l-4 border-white rounded">
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
              <Link href="/analysis" className="bg-white text-neutral-900 px-10 py-4 rounded-lg font-bold hover:bg-surface-container-low active:scale-[0.98]">Get Started for Free</Link>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed-dim/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-fixed-dim/5 rounded-full blur-2xl -ml-24 -mb-24" />
          </div>
        </section>
      </main>
      <AuthModal open={authOpen} onClose={()=>setAuthOpen(false)} />

      {/* Global footer is rendered from layout; landing footer removed to avoid duplication */}
    </div>
  )
}
