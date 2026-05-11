import '../styles/globals.css'
import { ReactNode } from 'react'
import TopNav from '../components/TopNav'

export const metadata = {
  title: 'JobMatch AI Dashboard',
  description: 'Compare your resume to a job description and get suggestions.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="font-inter bg-background text-on-surface">
        <TopNav />
        <div className="pt-16">{children}</div>
      </body>
    </html>
  )
}
