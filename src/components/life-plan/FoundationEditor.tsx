'use client'

import { useState } from 'react'

// Generic editor for Foundation-tab cards. Three field kinds:
//  text  — one textarea (purpose, vision)
//  lines — one item per line (role models, affirmations, gratitude, …)
//  pairs — "Name | description" per line (core values)

export type FieldSpec =
  | { key: string; kind: 'text'; label: string; value: string }
  | { key: string; kind: 'lines'; label: string; value: string[] }
  | { key: string; kind: 'pairs'; label: string; value: { name: string; desc: string }[] }

export type FieldValues = Record<string, string | string[] | { name: string; desc: string }[]>

function toDraft(f: FieldSpec): string {
  if (f.kind === 'text') return f.value
  if (f.kind === 'lines') return f.value.join('\n')
  return f.value.map(v => `${v.name} | ${v.desc}`).join('\n')
}

function fromDraft(f: FieldSpec, draft: string): FieldValues[string] {
  if (f.kind === 'text') return draft.trim()
  const lines = draft.split('\n').map(l => l.trim()).filter(Boolean)
  if (f.kind === 'lines') return lines
  return lines.map(l => {
    const idx = l.indexOf('|')
    return idx === -1
      ? { name: l.trim(), desc: '' }
      : { name: l.slice(0, idx).trim(), desc: l.slice(idx + 1).trim() }
  })
}

export default function FoundationEditModal({ title, fields, onSave, onClose }: {
  title: string
  fields: FieldSpec[]
  onSave: (values: FieldValues) => Promise<void>
  onClose: () => void
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, toDraft(f)])),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const values: FieldValues = {}
      for (const f of fields) values[f.key] = fromDraft(f, drafts[f.key] ?? '')
      await onSave(values)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(201,168,76,0.35)' }}
        onClick={e => e.stopPropagation()}>
        <h3 className="text-[15px] font-bold mb-1" style={{ color: '#e8c97a' }}>Edit — {title}</h3>
        <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {fields.some(f => f.kind !== 'text')
            ? 'List fields: one item per line. Core values: "Name | description" per line.'
            : 'Edits save to your database — the page updates instantly.'}
        </p>

        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: 'rgba(201,168,76,0.8)' }}>
                {f.label}
              </label>
              <textarea
                value={drafts[f.key] ?? ''}
                onChange={e => setDrafts(d => ({ ...d, [f.key]: e.target.value }))}
                rows={f.kind === 'text' ? 5 : Math.min(Math.max((drafts[f.key] ?? '').split('\n').length + 1, 4), 14)}
                className="w-full rounded-lg p-3 text-[13px] leading-relaxed"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                }}
              />
            </div>
          ))}
        </div>

        {error && <div className="text-[12px] mt-3" style={{ color: '#ef4444' }}>{error}</div>}

        <div className="flex gap-2 mt-5">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
