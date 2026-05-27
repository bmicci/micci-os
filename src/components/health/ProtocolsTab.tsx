'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { HormoneProtocol, Supplement, ProtocolCompliance } from './types'

// ── helpers ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

function getTroughWindow(days: string[]): { start: string; end: string; daysUntil: number } | null {
  if (!days || days.length === 0) return null
  const now = new Date()
  const todayIdx = now.getDay()
  let bestDate: Date | null = null
  let minDiff = 8

  for (const d of days) {
    const idx = DAY_MAP[d]
    if (idx === undefined) continue
    const diff = (todayIdx - idx + 7) % 7
    if (diff < minDiff) {
      minDiff = diff
      bestDate = new Date(now)
      bestDate.setDate(now.getDate() - diff)
    }
  }
  if (!bestDate) return null

  const troughStart = new Date(bestDate)
  troughStart.setDate(bestDate.getDate() + 6)
  const troughEnd = new Date(bestDate)
  troughEnd.setDate(bestDate.getDate() + 7)

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const daysUntil = Math.round((troughStart.getTime() - now.getTime()) / 86400000)

  return { start: fmt(troughStart), end: fmt(troughEnd), daysUntil }
}

function calcStreak(protocolIds: string[], compliance: ProtocolCompliance[]): number {
  if (protocolIds.length === 0) return 0
  const byDate: Record<string, Set<string>> = {}
  for (const c of compliance) {
    if (!byDate[c.completed_date]) byDate[c.completed_date] = new Set()
    byDate[c.completed_date].add(c.protocol_id)
  }

  let streak = 0
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - 1) // start from yesterday

  for (let i = 0; i < 90; i++) {
    const key = cursor.toISOString().split('T')[0]
    const done = byDate[key]
    if (done && protocolIds.every(id => done.has(id))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

const SUPP_COLORS: Record<string, string> = {
  vitamins: 'bg-yellow-400', minerals: 'bg-blue-400', essential: 'bg-cyan-400',
  performance: 'bg-orange-400', adaptogens: 'bg-green-400', mitochondrial: 'bg-amber-400',
  antioxidants: 'bg-rose-400', gut_health: 'bg-lime-400', metabolic: 'bg-teal-400',
  nootropics: 'bg-indigo-400', sleep: 'bg-violet-400', hormones: 'bg-pink-400',
  recovery: 'bg-emerald-400', cardiovascular: 'bg-red-400', thyroid: 'bg-sky-400',
  longevity: 'bg-purple-400', mental_health: 'bg-fuchsia-400',
}

const INJECTION_SITES = [
  'Left Delt', 'Right Delt', 'Left Glute', 'Right Glute',
  'Left Thigh', 'Right Thigh', 'Left Abdomen', 'Right Abdomen',
]

// ── component ──────────────────────────────────────────────────────────────

interface Props {
  protocols: HormoneProtocol[]
  supplements: Supplement[]
  compliance: ProtocolCompliance[]
}

export default function ProtocolsTab({ protocols, supplements, compliance: initialCompliance }: Props) {
  const supabase = createClient()
  const [compliance, setCompliance] = useState<ProtocolCompliance[]>(initialCompliance)
  const [isPending, startTransition] = useTransition()
  const [selectedSite, setSelectedSite] = useState<Record<string, string>>({})
  const [showSiteFor, setShowSiteFor] = useState<string | null>(null)

  const activeProtocols = protocols.filter(p => p.is_active)
  const todayCompliance = compliance.filter(c => c.completed_date === TODAY)
  const completedTodayIds = new Set(todayCompliance.map(c => c.protocol_id))

  const activeIds = activeProtocols.map(p => p.id)
  const streak = calcStreak(activeIds, compliance)

  // Find testosterone protocol for trough calc
  const testProtocol = activeProtocols.find(p =>
    p.substance?.toLowerCase().includes('testosterone')
  )
  const trough = testProtocol?.day_of_week ? getTroughWindow(testProtocol.day_of_week) : null

  async function toggleCompliance(protocol: HormoneProtocol) {
    const isCompleted = completedTodayIds.has(protocol.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (isCompleted) {
      // Remove
      const { error } = await supabase
        .from('protocol_compliance')
        .delete()
        .eq('protocol_id', protocol.id)
        .eq('completed_date', TODAY)
        .eq('user_id', user.id)
      if (!error) {
        setCompliance(prev => prev.filter(c =>
          !(c.protocol_id === protocol.id && c.completed_date === TODAY)
        ))
      }
    } else {
      // Add
      const site = selectedSite[protocol.id] || null
      const { data, error } = await supabase
        .from('protocol_compliance')
        .insert({ protocol_id: protocol.id, completed_date: TODAY, user_id: user.id, injection_site: site })
        .select()
        .single()
      if (!error && data) {
        setCompliance(prev => [...prev, data as ProtocolCompliance])
        setShowSiteFor(null)
      }
    }
  }

  // Group supplements
  const activeSups = supplements.filter(s => s.is_active)
  const groups: Record<string, Supplement[]> = {}
  for (const s of activeSups) {
    const key = s.category ?? 'other'
    groups[key] = [...(groups[key] ?? []), s]
  }
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length)

  const allDoneToday = activeIds.length > 0 && activeIds.every(id => completedTodayIds.has(id))

  return (
    <div className="space-y-8 max-w-[900px] mx-auto">

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Protocols', value: activeProtocols.length, unit: '' },
          { label: 'Compliance Streak', value: streak, unit: streak === 1 ? 'day' : 'days' },
          { label: 'Active Supplements', value: activeSups.length, unit: '' },
          { label: 'Done Today', value: `${completedTodayIds.size}/${activeIds.length}`, unit: '' },
        ].map(kpi => (
          <div key={kpi.label}
            className="rounded-xl p-4"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {kpi.value}
              {kpi.unit && <span className="text-sm font-normal text-[var(--text-muted)] ml-1">{kpi.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* ── Today's checklist ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Today&apos;s Protocol Checklist
          </h2>
          {allDoneToday && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)' }}>
              ✓ All Complete
            </span>
          )}
        </div>

        <div className="space-y-3">
          {activeProtocols.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No active protocols found.</p>
          ) : (
            activeProtocols.map(p => {
              const done = completedTodayIds.has(p.id)
              const isInjection = p.substance?.toLowerCase().includes('injection') ||
                p.substance?.toLowerCase().includes('cypionate') ||
                p.substance?.toLowerCase().includes('hcg')

              return (
                <div key={p.id}
                  className="rounded-xl p-4 transition-all"
                  style={{
                    background: done ? 'rgba(0,212,255,0.06)' : 'var(--card-bg)',
                    border: `1px solid ${done ? 'rgba(0,212,255,0.35)' : 'var(--card-border)'}`,
                  }}>
                  <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => startTransition(() => toggleCompliance(p))}
                      disabled={isPending}
                      className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{
                        borderColor: done ? 'var(--accent-cyan)' : 'rgba(240,246,255,0.3)',
                        background: done ? 'rgba(0,212,255,0.2)' : 'transparent',
                      }}
                    >
                      {done && <span className="text-[var(--accent-cyan)] text-sm font-bold">✓</span>}
                    </button>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-semibold ${done ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-primary)]'}`}>
                          {p.substance}
                        </span>
                        {p.dosage && (
                          <span className="text-xs px-2 py-0.5 rounded"
                            style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)' }}>
                            {p.dosage}
                          </span>
                        )}
                        {p.time_of_day && (
                          <span className="text-xs text-[var(--text-muted)] capitalize">{p.time_of_day}</span>
                        )}
                        {p.day_of_week && p.day_of_week.length > 0 && (
                          <div className="flex gap-1">
                            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => (
                              <span key={day}
                                className="text-[10px] rounded px-1.5 py-0.5 font-medium"
                                style={{
                                  background: p.day_of_week!.includes(day) ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                                  color: p.day_of_week!.includes(day) ? '#00d4ff' : 'var(--text-muted)',
                                }}>
                                {DAY_ABBR[day]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {p.notes && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">{p.notes}</p>
                      )}
                    </div>

                    {/* Injection site picker for IM/SubQ */}
                    {isInjection && !done && (
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setShowSiteFor(showSiteFor === p.id ? null : p.id)}
                          className="text-xs px-2 py-1 rounded transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                          {selectedSite[p.id] || 'Site ▾'}
                        </button>
                        {showSiteFor === p.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-xl"
                            style={{ background: '#0a0e27', border: '1px solid rgba(0,212,255,0.2)', minWidth: '160px' }}>
                            {INJECTION_SITES.map(site => (
                              <button key={site}
                                onClick={() => {
                                  setSelectedSite(prev => ({ ...prev, [p.id]: site }))
                                  setShowSiteFor(null)
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-[var(--text-secondary)]">
                                {site}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* ── Trough timing calculator ── */}
      {trough && testProtocol && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">🩸 Trough Timing Calculator</h2>
          <div className="rounded-xl p-5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Optimal Lab Draw Window</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {trough.start} – {trough.end}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  6–7 days post-injection (trough) · {testProtocol.dosage} {testProtocol.substance}
                </p>
              </div>
              <div className="text-center px-4 py-3 rounded-xl shrink-0"
                style={{
                  background: trough.daysUntil <= 0 ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${trough.daysUntil <= 0 ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                {trough.daysUntil <= 0 ? (
                  <>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)]">Now</p>
                    <p className="text-xs text-[var(--text-muted)]">In trough window</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{trough.daysUntil}d</p>
                    <p className="text-xs text-[var(--text-muted)]">Until trough</p>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-4 pt-3 border-t border-white/8">
              💡 Draw labs at trough for accurate Total T, Free T, E2, SHBG, Hematocrit, PSA readings. Schedule with Dr. Padilla.
            </p>
          </div>
        </section>
      )}

      {/* ── Supplements ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            💊 Supplements
            <span className="text-[var(--text-muted)] font-normal text-sm ml-2">
              {activeSups.length} active
            </span>
          </h2>
        </div>

        <div className="space-y-3">
          {sortedGroups.map(([cat, items]) => {
            const dot = SUPP_COLORS[cat] ?? 'bg-gray-400'
            const label = cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            return (
              <div key={cat} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <div className="px-4 py-2.5 flex items-center gap-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">{label}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-auto">{items.length}</span>
                </div>
                <div>
                  {items.map((s, i) => (
                    <div key={s.id}
                      className="px-4 py-3 flex items-start gap-3 hover:bg-white/3 transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)]">{s.name}</span>
                          {s.dosage && (
                            <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--accent-cyan)' }}>
                              {s.dosage}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-0.5">
                          {s.timing && <span className="text-xs text-[var(--text-secondary)]">🕐 {s.timing}</span>}
                          {s.frequency && s.frequency !== 'daily' && (
                            <span className="text-xs text-[var(--text-muted)] capitalize">{s.frequency}</span>
                          )}
                        </div>
                        {s.notes && <p className="text-xs text-[var(--text-muted)] mt-1">{s.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {activeSups.length === 0 && (
            <p className="text-[var(--text-muted)] text-sm">No supplements found. Add them via Supabase or the Import tab.</p>
          )}
        </div>
      </section>
    </div>
  )
}
