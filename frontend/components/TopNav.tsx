"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analysis", label: "Analysis" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings", private: true as const },
  { href: "/jobs", label: "Jobs" },
]

export default function TopNav() {
  const pathname = usePathname() || "/"
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [hasToken, setHasToken] = useState<boolean>(false)
  const [logoOk, setLogoOk] = useState<boolean>(true)
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
  useEffect(() => {
    try {
      const dn = localStorage.getItem('jobmatch:display_name')
      setDisplayName(dn)
      const t = localStorage.getItem('jobmatch:token')
      setHasToken(!!t)
    } catch {}
    const token = typeof window !== 'undefined' ? localStorage.getItem('jobmatch:token') : null
    async function loadMe() {
      try {
        if (!token) return
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (res.ok && data?.ok) {
          const dn = (data.user?.display_name as string) || (data.user?.username as string)
          setDisplayName(dn)
          localStorage.setItem('jobmatch:display_name', dn)
          setHasToken(true)
        }
      } catch {}
    }
    loadMe()
    function handleChange() {
      try {
        const dn = localStorage.getItem('jobmatch:display_name')
        setDisplayName(dn)
        const t = localStorage.getItem('jobmatch:token')
        setHasToken(!!t)
      } catch {}
    }
    window.addEventListener('storage', handleChange)
    window.addEventListener('jobmatch:user-updated', handleChange as any)
    return () => {
      window.removeEventListener('storage', handleChange)
      window.removeEventListener('jobmatch:user-updated', handleChange as any)
    }
  }, [])
  // Close mobile menu on route change or Esc
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant dark:bg-neutral-900/80 dark:border-neutral-800">
      <nav className="max-w-[1600px] mx-auto h-16 flex items-center justify-between px-gutter">
        <Link href="/" className="flex items-center gap-2" aria-label="JobMatch AI Home">
          {logoOk ? (
            <Image
              src="/logo-v2.svg"
              alt="JobMatch AI"
              width={256}
              height={64}
              className="h-14 w-auto object-contain"
              priority
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="text-[18px] font-semibold tracking-tight text-primary dark:text-neutral-100">JobMatch AI</span>
          )}
        </Link>
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          onClick={() => setMobileOpen(v => !v)}
        >
          <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
        </button>
        <div className="hidden md:flex items-center gap-8">
          {links
            .filter(l => !(l as any).private || hasToken)
            .map((l) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    active
                      ? "font-medium text-primary border-b-2 border-primary py-1 dark:text-neutral-100 dark:border-neutral-100"
                      : "font-medium text-on-surface-variant hover:text-primary dark:text-neutral-200 hover:dark:text-neutral-100"
                  }
                >
                  {l.label}
                </Link>
              )
            })}
        </div>
        <div className="flex items-center gap-3">
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary dark:text-neutral-200 hover:dark:text-neutral-100">notifications</button>
          {displayName ? (
            <Link href="/settings" aria-label="Open Settings" className="flex items-center gap-2 group">
              <span className="text-sm font-semibold text-on-surface-variant hidden md:inline group-hover:text-primary dark:text-neutral-100">{displayName}</span>
              <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant bg-primary/10 flex items-center justify-center group-hover:border-primary cursor-pointer dark:border-neutral-700">
                <span className="text-primary text-[13px] font-bold">{displayName.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</span>
              </div>
            </Link>
          ) : (
            <button
              onClick={() => {
                try {
                  if (pathname !== '/') {
                    window.location.href = '/?signin=1'
                  } else {
                    window.dispatchEvent(new CustomEvent('jobmatch:open-auth'))
                  }
                } catch {}
              }}
              className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-bold hover:bg-surface-container-low dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-100"
            >Sign in</button>
          )}
        </div>
      </nav>
      {/* Mobile slide-out menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-surface border-r border-outline-variant shadow-xl p-4 flex flex-col gap-4 dark:bg-neutral-900 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <Image src="/logo-v2.svg" alt="JobMatch AI" width={160} height={40} className="h-10 w-auto object-contain" />
              </Link>
              <button
                type="button"
                className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="h-px bg-outline-variant/60 dark:bg-neutral-800" />
            <nav className="flex flex-col">
              {links
                .filter(l => !(l as any).private || hasToken)
                .map((l) => {
                  const active = pathname === l.href
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className={
                        active
                          ? 'px-2 py-3 rounded-lg font-semibold text-primary bg-primary/10'
                          : 'px-2 py-3 rounded-lg font-medium text-on-surface-variant hover:bg-surface-container-low'
                      }
                    >
                      {l.label}
                    </Link>
                  )
                })}
            </nav>
            <div className="mt-auto pt-2 border-t border-outline-variant/60">
              {displayName ? (
                <Link href="/settings" onClick={()=>setMobileOpen(false)} aria-label="Open Settings" className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-[13px] font-bold">{displayName.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-semibold text-on-surface-variant">{displayName}</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    try {
                      setMobileOpen(false)
                      if (pathname !== '/') {
                        window.location.href = '/?signin=1'
                      } else {
                        window.dispatchEvent(new CustomEvent('jobmatch:open-auth'))
                      }
                    } catch {}
                  }}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm font-bold hover:bg-surface-container-low"
                >Sign in</button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
