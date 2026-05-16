import '../styles/globals.css'
import { ReactNode } from 'react'
import TopNav from '../components/TopNav'
import AppFooter from '../components/AppFooter'

export const metadata = {
  title: 'JobMatch AI Dashboard',
  description: 'Compare your resume to a job description and get suggestions.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        {/* Apply saved or system theme before paint to avoid FOUC */}
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{var m=localStorage.getItem('jobmatch:theme')||'dark';var d=document.documentElement;var mm=window.matchMedia('(prefers-color-scheme: dark)');var apply=(mode)=>{if(mode==='dark'){d.classList.add('dark');d.classList.remove('light');}else if(mode==='light'){d.classList.add('light');d.classList.remove('dark');}else{var prefers=mm.matches?'dark':'light';d.classList.toggle('dark',prefers==='dark');d.classList.toggle('light',prefers==='light');}};apply(m);if(m==='system'){mm.addEventListener('change',()=>apply('system'));}window.addEventListener('jobmatch:theme-apply',e=>{var mode=(e&&e.detail&&e.detail.mode)||localStorage.getItem('jobmatch:theme')||'dark';apply(mode);});}catch(_){} })();`
          }}
        />
      </head>
      <body className="font-inter bg-background text-on-surface dark:bg-neutral-950 dark:text-neutral-100">
        <TopNav />
        <div className="pt-16 min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <AppFooter />
        </div>
      </body>
    </html>
  )
}
