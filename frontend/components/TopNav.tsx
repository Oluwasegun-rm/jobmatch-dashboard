"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analysis", label: "Analysis" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
  { href: "/jobs", label: "Jobs" },
]

export default function TopNav() {
  const pathname = usePathname() || "/"
  const [displayName, setDisplayName] = useState<string | null>(null)
  useEffect(() => {
    try {
      const dn = localStorage.getItem('jobmatch:display_name')
      setDisplayName(dn)
    } catch {}
  }, [])
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
      <nav className="max-w-[1600px] mx-auto h-16 flex items-center justify-between px-gutter">
        <Link href="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[28px]">home</span>
          <span className="text-[18px] font-semibold tracking-tight text-primary">JobMatch AI</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => {
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
            <Link href="/" className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-bold hover:bg-surface-container-low">Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  )
}
