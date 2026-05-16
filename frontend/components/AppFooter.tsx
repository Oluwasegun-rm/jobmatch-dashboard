"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

export default function AppFooter() {
  const [open, setOpen] = useState<null | 'privacy' | 'terms' | 'support'>(null)
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    try {
      const el = document.documentElement
      const update = () => setIsDark(el.classList.contains('dark'))
      update()
      const obs = new MutationObserver(update)
      obs.observe(el, { attributes: true, attributeFilter: ['class'] })
      return () => obs.disconnect()
    } catch {}
  }, [])

  function PolicyModal({ kind, onClose }: { kind: 'privacy' | 'terms' | 'support'; onClose: () => void }) {
    const titles = { privacy: 'Privacy Policy', terms: 'Terms of Service', support: 'Contact Support' } as const
    return (
      <div className="fixed inset-0 z-[60]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[560px] bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 shadow-xl">
          <div className="p-5 border-b border-outline-variant dark:border-neutral-800 flex items-center gap-2">
            <button aria-label="Close" className="material-symbols-outlined text-on-surface-variant hover:text-primary" onClick={onClose}>close</button>
            <h3 className="text-[18px] font-semibold text-primary dark:text-neutral-100">{titles[kind]}</h3>
          </div>
          <div className="p-5 space-y-3">
            {kind === 'privacy' && (
              <p className="text-sm text-on-surface-variant dark:text-neutral-300">We store analyses to power your history and insights. Remove sensitive info before uploading. Contact support for data questions.</p>
            )}
            {kind === 'terms' && (
              <p className="text-sm text-on-surface-variant dark:text-neutral-300">Provided as-is without warranties. Use responsibly and comply with laws. Don’t upload content you don’t have rights to share.</p>
            )}
            {kind === 'support' && (
              <p className="text-sm text-on-surface-variant dark:text-neutral-300">Email <a className="text-primary underline" href="mailto:support@jobmatch.ai">support@jobmatch.ai</a> and we’ll get back shortly.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <footer className="bg-surface-container dark:bg-neutral-950 py-12">
      <div className="max-w-[1600px] mx-auto px-gutter flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <Image src={isDark ? "/logo-v2-white.svg" : "/logo-v2.svg"} alt="JobMatch AI" width={180} height={48} className="h-10 w-auto object-contain" />
        </div>
        <div className="flex gap-8 text-on-surface-variant text-sm dark:text-neutral-100">
          <button className="hover:text-primary dark:hover:text-neutral-50" onClick={()=>setOpen('privacy')}>Privacy Policy</button>
          <button className="hover:text-primary dark:hover:text-neutral-50" onClick={()=>setOpen('terms')}>Terms of Service</button>
          <button className="hover:text-primary dark:hover:text-neutral-50" onClick={()=>setOpen('support')}>Contact Support</button>
        </div>
        <p className="text-on-surface-variant text-sm dark:text-neutral-300">© 2026 JobMatch AI. All rights reserved.</p>
      </div>
      {open && <PolicyModal kind={open} onClose={()=>setOpen(null)} />}
    </footer>
  )
}
