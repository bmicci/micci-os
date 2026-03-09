'use client'

import { useState, useTransition } from 'react'
import type { FinancialModule } from '@/lib/financial-data'
import { getModuleCounts } from '@/lib/financial-data'
import { updateModuleProgress } from '@/app/actions/financial'
import KPICard from './KPICard'
import DocumentUpload from '@/components/DocumentUpload'

const statusStyle: Record<string, { bg: string; color: string }> = {
  done:     { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
  progress: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
  pending:  { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' },
  urgent:   { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
}

const STATUS_OPTIONS: { value: FinancialModule['status']; label: string }[] = [
  { value: 'done',     label: '✅ Done' },
  { value: 'progress', label: '🔄 In Progress' },
  { value: 'urgent',   label: '🚨 Urgent' },
  { value: 'pending',  label: '⏳ Pending' },
]

function EditRow({
  module,
  onClose,
}: {
  module: FinancialModule
  onClose: () => void
}) {
  const [status, setStatus] = useState(module.status)
  const [pct, setPct] = useState(module.pct)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function save() {
    if (!module.supabaseId) {
      setError('No Supabase ID — edit the source data directly.')
      return
    }
    startTransition(async () => {
      const result = await updateModuleProgress(module.supabaseId!, status, pct)
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-5 py-3"
      style={{ background: 'rgba(0,212,255,0.04)', borderTop: '1px solid rgba(0,212,255,0.1)' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Status picker */}
      <select
        value={status}
        onChange={e => setStatus(e.target.value as FinancialModule['status'])}
        className="text-[12px] rounded-lg px-2 py-1.5 outline-none"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(0,212,255,0.2)',
          color: 'var(--text-primary)',
        }}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#0a0e27' }}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Progress */}
      <div className="flex items-center gap-1.5">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={pct}
          onChange={e => setPct(Number(e.target.value))}
          className="w-24 accent-cyan-400"
        />
        <span className="text-[12px] w-8 text-right" style={{ color: 'var(--text-secondary)' }}>
          {pct}%
        </span>
      </div>

      {/* Actions */}
      <button
        onClick={save}
        disabled={isPending}
        className="text-[11px] font-bold px-3 py-1 rounded-lg transition-opacity"
        style={{ background: 'var(--accent-gradient)', color: '#fff', opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
      <button
        onClick={onClose}
        className="text-[11px] px-2 py-1 rounded-lg"
        style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}
      >
        Cancel
      </button>
      {error && (
        <span className="text-[11px]" style={{ color: '#ef4444' }}>{error}</span>
      )}
    </div>
  )
}

export default function ModulePlaybookTab({ modules }: { modules: FinancialModule[] }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const counts = getModuleCounts(modules)
  const totalDocs = modules.reduce((s, m) => s + m.docsHave.length, 0)
  const totalDocsNeeded = modules.reduce((s, m) => s + m.docsHave.length + m.docsMissing.length, 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Complete"    value={String(counts.complete)}  note="Modules fully done"  accent="green" />
        <KPICard label="In Progress" value={String(counts.inProgress)} note="Active work" />
        <KPICard label="Pending"     value={String(counts.pending)}   note="Not yet started"    accent="amber" />
        <KPICard label="Docs Collected" value={`${totalDocs}`} note={`of ~${totalDocsNeeded} total needed`} />
      </div>

      {/* Accordion Modules */}
      <div className="space-y-3">
        {modules.map((m) => {
          const isOpen = openId === m.id
          const isEditing = editId === m.id
          const s = statusStyle[m.status]

          return (
            <div key={m.id} className="glass-card overflow-hidden">
              {/* Header (clickable) */}
              <button
                onClick={() => {
                  if (!isEditing) setOpenId(isOpen ? null : m.id)
                }}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-extrabold shrink-0"
                  style={{ background: s.bg, color: s.color }}
                >
                  M{m.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
                    {m.name}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {m.desc}
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: s.bg, color: s.color }}
                >
                  {m.pct}%
                </span>
                {/* Edit button */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setEditId(isEditing ? null : m.id)
                    if (!isEditing) setOpenId(m.id)
                  }}
                  className="text-[12px] px-2 py-0.5 rounded-lg shrink-0 transition-colors hover:bg-white/10"
                  style={{ color: isEditing ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                  title="Edit status & progress"
                >
                  ✏️
                </button>
                <span
                  className="text-[14px] transition-transform shrink-0"
                  style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▾
                </span>
              </button>

              {/* Inline edit row */}
              {isEditing && (
                <EditRow module={m} onClose={() => setEditId(null)} />
              )}

              {/* Expandable body */}
              {isOpen && (
                <div className="px-5 pb-5 pt-0" style={{ marginLeft: 44 }}>
                  {/* Progress bar */}
                  <div className="h-[5px] rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: s.color }} />
                  </div>

                  {/* Documents Have */}
                  {m.docsHave.length > 0 && (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        📄 Documents Collected
                      </div>
                      <ul className="space-y-1 mb-4">
                        {m.docsHave.map((doc, i) => (
                          <li key={i} className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                            <span style={{ color: '#22c55e' }}>✓</span> {doc}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Documents Missing */}
                  {m.docsMissing.length > 0 && (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        📋 Documents Needed
                      </div>
                      <ul className="space-y-1 mb-4">
                        {m.docsMissing.map((doc, i) => (
                          <li key={i} className="flex items-center gap-2 text-[12px]" style={{ color: '#f59e0b' }}>
                            <span>○</span> {doc}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Action Items */}
                  {m.actions.length > 0 && (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        ⚡ Action Items
                      </div>
                      <ul className="space-y-1">
                        {m.actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                            <span className="mt-0.5 shrink-0">{action.startsWith('✅') ? '' : '→'}</span> {action}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Document Upload */}
      <div className="glass-card p-5">
        <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          📎 Upload Financial Documents
        </div>
        <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>
          Upload tax forms, statements, and receipts. Files are embedded for AI search via the chat panel.
        </p>
        <DocumentUpload section="financial" />
      </div>
    </div>
  )
}
