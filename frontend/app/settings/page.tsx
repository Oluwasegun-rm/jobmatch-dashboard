"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageToolbar from '../../components/PageToolbar'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export default function SettingsPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ id: number; username: string; display_name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Forms
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  // Theme
  const [theme, setTheme] = useState<'light'|'dark'|'system'>('system')

  useEffect(() => {
    async function loadMe() {
      setLoading(true)
      setError(null)
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('jobmatch:token') : null
        if (!token) {
          // No access for unauthenticated users — open auth modal on landing
          router.replace('/?signin=1')
          return
        }
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (!res.ok || !data?.ok) {
          // Clear any stale creds and redirect to sign in
          try { localStorage.removeItem('jobmatch:token'); localStorage.removeItem('jobmatch:display_name'); } catch {}
          router.replace('/?signin=1')
          return
        }
        const u = data.user as { id: number; username: string; display_name?: string }
        setMe(u)
        setNewDisplayName(u.display_name || u.username)
        setNewUsername(u.username)
      } catch (e: any) {
        setError(e?.message || 'Failed to load account')
      } finally {
        setLoading(false)
      }
    }
    loadMe()
    // Load theme preference
    try {
      const t = (localStorage.getItem('jobmatch:theme') as 'light'|'dark'|'system'|null) || 'system'
      setTheme(t)
    } catch {}
  }, [])

  function applyTheme(next: 'light'|'dark'|'system') {
    setTheme(next)
    try {
      localStorage.setItem('jobmatch:theme', next)
      window.dispatchEvent(new CustomEvent('jobmatch:theme-apply', { detail: { mode: next } }))
    } catch {}
  }

  async function saveDisplayName() {
    if (!newDisplayName.trim()) return
    setSaving(true)
    try {
      const token = localStorage.getItem('jobmatch:token')
      const res = await fetch(`${API_BASE}/auth/display-name`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: newDisplayName.trim() })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.detail || 'Failed')
      localStorage.setItem('jobmatch:display_name', newDisplayName.trim())
      window.dispatchEvent(new CustomEvent('jobmatch:user-updated'))
      setMe(me ? { ...me, display_name: newDisplayName.trim() } : me)
      alert('Display name updated')
    } catch (e: any) {
      alert(e?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function saveUsername() {
    if (!newUsername.trim() || newUsername.trim().length < 3) { alert('Username too short'); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('jobmatch:token')
      const res = await fetch(`${API_BASE}/auth/change-username`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername.trim() })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.detail || 'Failed')
      localStorage.setItem('jobmatch:token', data.token)
      localStorage.setItem('jobmatch:display_name', data.user?.display_name || newUsername.trim())
      window.dispatchEvent(new CustomEvent('jobmatch:user-updated'))
      setMe(me ? { ...me, username: newUsername.trim(), display_name: data.user?.display_name || newUsername.trim() } : me)
      alert('Username updated')
    } catch (e: any) {
      alert(e?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || newPassword.length < 6) { alert('Invalid password'); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('jobmatch:token')
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.detail || 'Failed')
      setCurrentPassword(''); setNewPassword('')
      alert('Password updated')
    } catch (e: any) {
      alert(e?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  function signOut() {
    try {
      localStorage.removeItem('jobmatch:token')
      localStorage.removeItem('jobmatch:display_name')
      window.dispatchEvent(new CustomEvent('jobmatch:user-updated'))
    } catch {}
    router.replace('/')
  }

  return (
    <div className="min-h-screen">
      <main className="min-h-screen">
        <PageToolbar placeholder="Search settings..." />
        <div className="max-w-[1200px] mx-auto p-container-padding">
          <div className="mb-6">
            <h1 className="text-display-lg text-primary mb-1 dark:text-neutral-100">Account Settings</h1>
            <p className="text-on-surface-variant dark:text-neutral-300">Update your username, display name, and password.</p>
          </div>

          {loading ? (
            <div className="text-sm text-on-surface-variant">Loading…</div>
          ) : error ? (
            <div className="text-error text-sm">{error}</div>
          ) : me ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile */}
              <section className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 p-card-padding flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-outline-variant flex items-center justify-center mb-3 dark:border-neutral-700">
                  <span className="text-primary text-[18px] font-bold dark:text-neutral-100">{(me.display_name || me.username).split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</span>
                </div>
                <h2 className="text-headline-sm">{me.display_name || me.username}</h2>
                <p className="text-on-surface-variant text-sm">Username: <span className="font-mono">{me.username}</span></p>
                <button onClick={signOut} className="mt-4 px-4 py-2 border border-outline-variant rounded-lg text-sm font-bold hover:bg-surface-container-low dark:border-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-100">Sign out</button>
              </section>

              {/* Update Display Name */}
              <section className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 p-card-padding lg:col-span-2">
                <h3 className="text-title-sm font-semibold mb-3 dark:text-neutral-100">Display Name</h3>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input value={newDisplayName} onChange={(e)=>setNewDisplayName(e.target.value)} className="flex-1 p-2 border border-outline-variant rounded-lg text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 placeholder:dark:text-neutral-400" />
                  <button onClick={saveDisplayName} disabled={saving} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold disabled:opacity-50">Save</button>
                </div>
              </section>

              {/* Update Username */}
              <section className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 p-card-padding lg:col-span-2">
                <h3 className="text-title-sm font-semibold mb-3 dark:text-neutral-100">Change Username</h3>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input value={newUsername} onChange={(e)=>setNewUsername(e.target.value)} className="flex-1 p-2 border border-outline-variant rounded-lg text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 placeholder:dark:text-neutral-400" />
                  <button onClick={saveUsername} disabled={saving} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold disabled:opacity-50">Update</button>
                </div>
              </section>

              {/* Change Password */}
              <section className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 p-card-padding lg:col-span-2">
                <h3 className="text-title-sm font-semibold mb-3 dark:text-neutral-100">Change Password</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-on-surface-variant uppercase font-semibold">Current Password</label>
                    <input type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 placeholder:dark:text-neutral-400" />
                  </div>
                  <div>
                    <label className="text-[12px] text-on-surface-variant uppercase font-semibold">New Password</label>
                    <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="mt-1 w-full p-2 border border-outline-variant rounded-lg text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 placeholder:dark:text-neutral-400" />
                  </div>
                </div>
                <div className="mt-3">
                  <button onClick={changePassword} disabled={saving} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold disabled:opacity-50">Change Password</button>
                </div>
              </section>

              {/* Theme Selection */}
              <section className="bg-white dark:bg-neutral-900 rounded-xl border border-outline-variant dark:border-neutral-800 p-card-padding lg:col-span-3">
                <h3 className="text-title-sm font-semibold mb-3 dark:text-neutral-100">Appearance</h3>
                {/* Segmented Control */}
                <div role="group" aria-label="Theme selection" className="inline-flex rounded-lg border border-outline-variant overflow-hidden dark:border-neutral-700">
                  {([['light','Light'],['dark','Dark'],['system','System']] as const).map(([val, label], idx) => {
                    const active = theme === val
                    return (
                      <button
                        key={val}
                        type="button"
                        aria-pressed={active}
                        onClick={()=>applyTheme(val as 'light'|'dark'|'system')}
                        className={`px-4 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? 'bg-primary text-on-primary dark:bg-neutral-100 dark:text-neutral-900'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        } ${idx>0 ? 'border-l border-outline-variant dark:border-neutral-700' : ''}`}
                      >{label}</button>
                    )
                  })}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
