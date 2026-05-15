"use client"

import { ReactNode } from "react"

export default function PageToolbar({ title, placeholder = "Search...", children }: { title?: string; placeholder?: string; children?: ReactNode }) {
  return (
    <div className="bg-surface border-b border-outline-variant">
      <div className="max-w-[1600px] mx-auto h-16 flex items-center justify-between px-gutter">
        {title ? <h2 className="text-[18px] font-semibold">{title}</h2> : <div />}
        <div className="flex items-center gap-4">
          <div className="relative w-[360px] hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input className="w-full pl-10 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm" placeholder={placeholder} />
          </div>
          <div className="flex items-center gap-2">{children}</div>
        </div>
      </div>
    </div>
  )
}
