"use client"

import Link from 'next/link'
import PageToolbar from '../../components/PageToolbar'

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      {/* Main */}
      <main className="min-h-screen">
        <PageToolbar title="Settings" placeholder="Search settings..." />
        <div className="max-w-[1600px] mx-auto p-container-padding">
          <div className="mb-section-gap">
            <h1 className="text-display-lg text-primary mb-1">Account Settings</h1>
            <p className="text-on-surface-variant">Manage your profile, preferences, and integrations.</p>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Profile Card */}
            <section className="col-span-12 lg:col-span-4 bg-white rounded-lg border border-outline-variant p-card-padding">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full bg-surface-container" />
                  <button className="absolute bottom-0 right-0 bg-primary text-on-primary p-1.5 rounded-full border-2 border-white">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>
                <h2 className="text-headline-md">Your Name</h2>
                <p className="text-on-surface-variant text-sm mb-4">you@example.com</p>
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[12px] font-bold">STANDARD</span>
              </div>
            </section>

            {/* Right Column Sections */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
              <section className="bg-white rounded-lg border border-outline-variant overflow-hidden">
                <div className="p-card-padding border-b border-outline-variant">
                  <h3 className="text-title-sm font-semibold">General Preferences</h3>
                </div>
                <div className="p-card-padding space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-Refresh Analytics</p>
                      <p className="text-sm text-on-surface-variant">Refresh every 5 minutes.</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                      <span className="inline-block h-4 w-4 rounded-full bg-white translate-x-6" />
                    </button>
                  </div>
                  <hr className="border-outline-variant" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-on-surface-variant">Weekly summary</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface-container-highest">
                      <span className="inline-block h-4 w-4 rounded-full bg-white translate-x-1" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="bg-error/5 border border-error-container rounded-lg p-card-padding">
                <h3 className="text-title-sm text-error mb-1">Danger Zone</h3>
                <p className="text-sm text-on-surface-variant mb-6">Irreversible actions.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="px-4 py-2 border border-error text-error rounded-lg text-sm font-bold hover:bg-error/5">Clear Cache</button>
                  <button className="px-4 py-2 bg-error text-on-error rounded-lg text-sm font-bold hover:opacity-90">Delete Account</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
