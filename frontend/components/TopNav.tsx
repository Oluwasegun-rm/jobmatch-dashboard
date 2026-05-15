"use client"

import Link from "next/link"
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
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
      <nav className="max-w-[1600px] mx-auto h-16 flex items-center justify-between px-gutter">
        <Link href="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[28px]">home</span>
          <span className="text-[18px] font-semibold tracking-tight text-primary">JobMatch AI</span>
        </Link>
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
                      ? "font-medium text-primary border-b-2 border-primary py-1"
                      : "font-medium text-on-surface-variant hover:text-primary"
                  }
                >
                  {l.label}
                </Link>
            )
          })}
        </div>
        <div className="flex items-center gap-3">
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary">notifications</button>
          {displayName ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-on-surface-variant hidden md:inline">{displayName}</span>
              <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-[13px] font-bold">{displayName.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</span>
              </div>
            </div>
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
              className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-bold hover:bg-surface-container-low"
            >Sign in</button>
          )}
        </div>
      </nav>
    </header>
  )
}
