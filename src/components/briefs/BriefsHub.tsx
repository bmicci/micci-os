'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquarePlus, SlidersHorizontal, X } from 'lucide-react'
import {
  BRIEF_TABS, TWEAK_KINDS,
  type BriefConfig, type BriefEdition, type BriefRow, type BriefTab, type BriefTweak,
  type TodayPayload, type TweakKind,
} from '@/lib/briefs'
import { BlockBody, BlockCard, TONE_COLOR } from './blocks'
import TodayBrief from './TodayBrief'

const KIND_LABEL: Record<TweakKind, string> = {
  missing: 'Missing', noise: 'Noise', wrong: 'Wrong', idea: 'Idea',
}

function chicagoToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())
}

function fmtEdition(e: BriefEdition) {
  const d = new Date(e.brief_date + 'T12:00:00')
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return e.period_label ? `${day} · ${e.period_label}` : day
}

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/briefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Request failed')
  return res.json()
}

/** Per-section feedback: opens an inline note form that writes a brief_tweaks row. */
function TweakButton({
  tab, edition, section, onSaved,
}: {
  tab: BriefTab
  edition?: string
  section: string
  onSaved: (t: BriefTweak) => void
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<TweakKind>('noise')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title="Feedback for the next run"
              className="text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors shrink-0">
        <MessageSquarePlus size={15} />
      </button>
    )
  }

  return (
    <div className="absolute right-3 left-3 sm:left-auto sm:w-80 z-10 glass-card p-3 mt-6"
         style={{ background: 'var(--bg-elevated)' }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[12px] text-[var(--text-secondary)] truncate">Note on “{section}”</span>
        <button onClick={() => setOpen(false)} className="text-[var(--text-muted)]"><X size={14} /></button>
      </div>
      <div className="flex gap-1 mb-2">
        {TWEAK_KINDS.map(k => (
          <button key={k} onClick={() => setKind(k)}
                  className="text-[11px] px-2 py-1 rounded-md"
                  style={{
                    background: kind === k ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)',
                    color: kind === k ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  }}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} autoFocus
                placeholder="What should the next run do differently?"
                className="w-full text-[13px] rounded-md p-2 bg-black/30 text-[var(--text-primary)] outline-none"
                style={{ border: '1px solid rgba(0,212,255,0.15)' }} />
      {err && <div className="text-[12px] mt-1" style={{ color: TONE_COLOR.crit }}>{err}</div>}
      <button disabled={saving || !text.trim()}
              onClick={async () => {
                setSaving(true); setErr('')
                try {
                  const t = await post({ op: 'tweak', tab, edition, section, kind, text })
                  onSaved(t as BriefTweak)
                  setText(''); setOpen(false)
                } catch (e) { setErr((e as Error).message) } finally { setSaving(false) }
              }}
              className="mt-2 w-full text-[13px] font-medium py-1.5 rounded-md disabled:opacity-40"
              style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
        {saving ? 'Saving…' : 'Save note'}
      </button>
    </div>
  )
}

/** The tab's standing inputs (holdings, targets, check-in) the Routine reads every run. */
function InputsPanel({ tab, config, onClose }: { tab: BriefTab; config: BriefConfig | null; onClose: () => void }) {
  const [text, setText] = useState(config?.text ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | string>('idle')
  return (
    <div className="glass-card p-4 sm:p-5 mb-4">
      <div className="flex justify-between items-start mb-2 gap-3">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Inputs</h3>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Read by the Routine on every run.{config?.updated_at ? ` Last edited ${new Date(config.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.` : ''}
          </p>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)]"><X size={16} /></button>
      </div>
      <textarea value={text} onChange={e => { setText(e.target.value); setState('idle') }} rows={14}
                className="w-full text-[13px] font-mono rounded-md p-3 bg-black/30 text-[var(--text-primary)] outline-none leading-relaxed"
                style={{ border: '1px solid rgba(0,212,255,0.15)' }} />
      <div className="flex items-center gap-3 mt-2">
        <button disabled={state === 'saving'}
                onClick={async () => {
                  setState('saving')
                  try { await post({ op: 'config', tab, text }); setState('saved') }
                  catch (e) { setState((e as Error).message) }
                }}
                className="text-[13px] font-medium px-4 py-1.5 rounded-md disabled:opacity-40"
                style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
          {state === 'saving' ? 'Saving…' : 'Save inputs'}
        </button>
        {state === 'saved' && <span className="text-[12px]" style={{ color: TONE_COLOR.good }}>Saved — used from the next run</span>}
        {!['idle', 'saving', 'saved'].includes(state) && <span className="text-[12px]" style={{ color: TONE_COLOR.crit }}>{state}</span>}
      </div>
    </div>
  )
}

export default function BriefsHub({
  tab, schedule, editions, brief, config, tweaks: initialTweaks, latestByTab, connected,
}: {
  tab: BriefTab
  schedule: string
  editions: BriefEdition[]
  brief: BriefRow | null
  config: BriefConfig | null
  tweaks: BriefTweak[]
  latestByTab: Partial<Record<BriefTab, string>>
  connected: boolean
}) {
  const router = useRouter()
  const [showInputs, setShowInputs] = useState(false)
  const [tweaks, setTweaks] = useState(initialTweaks)
  const today = chicagoToday()
  const openTweaks = tweaks.filter(t => t.status === 'open')

  const feedback = (section: string) => (
    <TweakButton tab={tab} edition={brief?.doc_key} section={section}
                 onSaved={t => setTweaks(prev => [t, ...prev])} />
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab bar — links, so each tab/edition is a shareable URL and the back button works */}
      <nav className="flex overflow-x-auto px-3 sm:px-6 shrink-0"
           style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(0,212,255,0.1)', scrollbarWidth: 'none' }}>
        {BRIEF_TABS.map(t => {
          const active = t.id === tab
          const fresh = latestByTab[t.id] === today
          return (
            <Link key={t.id} href={`/briefs?tab=${t.id}`}
                  className="relative px-3 sm:px-5 py-3 text-[12px] sm:text-[13px] font-medium whitespace-nowrap border-b-[3px] shrink-0 transition-all"
                  style={{
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderBottomColor: active ? 'var(--accent-cyan)' : 'transparent',
                    background: active ? 'rgba(0,212,255,0.04)' : 'transparent',
                  }}>
              {t.label}
              {fresh && <span className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-cyan)' }} />}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Edition bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={brief?.doc_key ?? ''}
            disabled={editions.length === 0}
            onChange={e => router.push(`/briefs?tab=${tab}&d=${encodeURIComponent(e.target.value)}`)}
            className="text-[13px] rounded-md px-2.5 py-1.5 bg-black/30 text-[var(--text-primary)] outline-none max-w-full"
            style={{ border: '1px solid rgba(0,212,255,0.2)' }}
          >
            {editions.length === 0 && <option value="">No editions yet</option>}
            {editions.map(e => <option key={e.doc_key} value={e.doc_key}>{fmtEdition(e)}</option>)}
          </select>
          <span className="text-[12px] text-[var(--text-muted)]">{schedule}</span>
          <div className="ml-auto flex items-center gap-2">
            {openTweaks.length > 0 && (
              <span className="text-[12px] px-2 py-1 rounded-md" style={{ background: 'rgba(251,191,36,0.1)', color: TONE_COLOR.warn }}>
                {openTweaks.length} note{openTweaks.length > 1 ? 's' : ''} queued for next run
              </span>
            )}
            <button onClick={() => setShowInputs(v => !v)}
                    className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              <SlidersHorizontal size={13} /> Inputs
            </button>
          </div>
        </div>

        {showInputs && <InputsPanel key={tab} tab={tab} config={config} onClose={() => setShowInputs(false)} />}

        {!connected && (
          <div className="glass-card p-5 text-[13px] text-[var(--text-secondary)]">Supabase isn’t configured in this environment.</div>
        )}

        {connected && !brief && (
          <div className="glass-card p-6 text-center">
            <p className="text-[14px] text-[var(--text-primary)]">No {BRIEF_TABS.find(t => t.id === tab)!.label} brief yet.</p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              {tab === 'money' ? 'No Routine writes this tab yet.' : `It appears here after the next scheduled run (${schedule}).`}
            </p>
          </div>
        )}

        {brief && (
          <>
            <div className="mb-4">
              {brief.headline && (
                <p className="text-[17px] sm:text-[19px] font-semibold text-[var(--text-primary)] leading-snug">{brief.headline}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {(brief.chips ?? []).map((c, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--text-secondary)', border: '1px solid rgba(0,212,255,0.15)' }}>
                    {c}
                  </span>
                ))}
                {brief.generated_at && (
                  <span className="text-[11px] text-[var(--text-muted)] ml-1">
                    Generated {new Date(brief.generated_at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} CT
                  </span>
                )}
              </div>
            </div>

            {tab === 'today' ? (
              <TodayBrief payload={brief.payload as TodayPayload} feedback={feedback} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(brief.blocks ?? []).map((b, i) => {
                  const title = 'title' in b ? b.title : undefined
                  return (
                    <div key={i} className={`min-w-0 ${b.wide || b.type === 'table' ? 'lg:col-span-2' : ''}`}>
                      <BlockCard title={title} action={feedback(title ?? `Block ${i + 1}`)}>
                        <BlockBody block={b} />
                      </BlockCard>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Feedback log for this tab */}
        {tweaks.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">Feedback log</h3>
            <ul className="space-y-1.5">
              {tweaks.map(t => (
                <li key={t.id} className="flex items-start gap-2 text-[12px]">
                  <span className="shrink-0 px-1.5 py-0.5 rounded"
                        style={{
                          background: t.status === 'open' ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                          color: t.status === 'open' ? TONE_COLOR.warn : 'var(--text-muted)',
                        }}>
                    {t.status}
                  </span>
                  <span className="text-[var(--text-secondary)] min-w-0">
                    <span className="text-[var(--text-muted)]">{KIND_LABEL[t.kind]}{t.section ? ` · ${t.section}` : ''}:</span> {t.text}
                  </span>
                  {t.status === 'open' && (
                    <button title="Dismiss" className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
                            onClick={async () => {
                              try {
                                await post({ op: 'dismiss', id: t.id })
                                setTweaks(prev => prev.map(x => x.id === t.id ? { ...x, status: 'dismissed' } : x))
                              } catch { /* keep it listed */ }
                            }}>
                      <X size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
