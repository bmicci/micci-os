'use client'

// Upload → Claude reads it → review → save. Lab reports (Quest/Labcorp PDFs)
// write lab_markers; InBody sheets (PDF or photo) write body_metrics. Nothing
// is saved until you confirm.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, ExternalLink, RotateCw, FileText } from 'lucide-react'

type Kind = 'lab' | 'inbody'
interface Marker {
  panel: string | null; name_on_report: string; canonical_name: string; value: number | null; value_text: string | null
  unit: string | null; reference_low: number | null; reference_high: number | null; reference_text: string | null; flag: string | null
  include?: boolean
}
interface InBody {
  device: string | null; test_date: string | null; weight_lbs: number | null; skeletal_muscle_lbs: number | null
  body_fat_mass_lbs: number | null; body_fat_pct: number | null; total_body_water_lbs: number | null
  visceral_fat_level: number | null; bmr_kcal: number | null; inbody_score: number | null
}
interface Doc {
  id: string; kind: Kind; file_name: string | null; status: string; parse_error: string | null
  extracted: (Partial<InBody> & { markers?: Marker[]; collected_on?: string | null; lab_provider?: string | null }) | null
  collected_on: string | null; provider: string | null; created_at: string
}

const COPY: Record<Kind, { title: string; hint: string; accept: string }> = {
  lab: { title: 'Upload lab results', hint: 'Quest or Labcorp PDF (from MyQuest → Results → Download). Claude reads every marker; you review before saving.', accept: 'application/pdf,.pdf,image/jpeg,image/png' },
  inbody: { title: 'Upload InBody scan', hint: 'The InBody result sheet as a PDF or a clear photo. Claude reads weight, skeletal muscle, body fat and more; you review before saving.', accept: 'application/pdf,.pdf,image/*' },
}
const INBODY_FIELDS: { key: keyof InBody; label: string; unit: string }[] = [
  { key: 'weight_lbs', label: 'Weight', unit: 'lb' },
  { key: 'skeletal_muscle_lbs', label: 'Skeletal muscle', unit: 'lb' },
  { key: 'body_fat_mass_lbs', label: 'Body fat mass', unit: 'lb' },
  { key: 'body_fat_pct', label: 'Body fat', unit: '%' },
  { key: 'total_body_water_lbs', label: 'Body water', unit: 'lb' },
  { key: 'visceral_fat_level', label: 'Visceral fat level', unit: '' },
  { key: 'bmr_kcal', label: 'BMR', unit: 'kcal' },
  { key: 'inbody_score', label: 'InBody score', unit: '' },
]
const MAX_BYTES = 4 * 1024 * 1024

const cell = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-line)', color: 'var(--text-primary)', borderRadius: 6, padding: '3px 6px', fontSize: 12, width: '100%' } as const
const toNum = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s))

/** Phone photos are often > 4 MB: downscale to a JPEG Claude can still read. */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= MAX_BYTES * 0.9) return file
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.85))
  return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
}

function LabReview({ doc, busy, onSave, onDismiss }: { doc: Doc; busy: boolean; onSave: (b: Record<string, unknown>) => void; onDismiss: () => void }) {
  const [date, setDate] = useState(doc.collected_on ?? doc.extracted?.collected_on ?? '')
  const [rows, setRows] = useState<Marker[]>(() => (doc.extracted?.markers ?? []).map(m => ({ ...m, include: m.value != null })))
  const upd = (i: number, patch: Partial<Marker>) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const count = rows.filter(r => r.include && r.value != null).length
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3 mb-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        <span>{doc.provider ?? 'Lab'} · {rows.length} markers read</span>
        <label className="flex items-center gap-2">Collected
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...cell, width: 150 }} />
        </label>
      </div>
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-[12px]">
          <thead className="sticky top-0" style={{ background: 'var(--bg-elevated)' }}>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="p-2 text-left font-normal">Save</th>
              <th className="p-2 text-left font-normal">Marker</th>
              <th className="p-2 text-left font-normal">Value</th>
              <th className="p-2 text-left font-normal">Unit</th>
              <th className="p-2 text-left font-normal">Range</th>
              <th className="p-2 text-left font-normal">Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', opacity: m.include ? 1 : 0.5 }}>
                <td className="p-2"><input type="checkbox" aria-label={`Save ${m.canonical_name}`} checked={!!m.include} onChange={e => upd(i, { include: e.target.checked })} /></td>
                <td className="p-2 min-w-[160px]">
                  <input value={m.canonical_name} onChange={e => upd(i, { canonical_name: e.target.value })} style={cell} aria-label="Marker name" />
                  {m.name_on_report !== m.canonical_name && <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.name_on_report}</div>}
                </td>
                <td className="p-2 min-w-[80px]">
                  <input inputMode="decimal" value={m.value ?? ''} onChange={e => upd(i, { value: toNum(e.target.value) })} style={cell} aria-label="Value" />
                  {m.value_text && <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.value_text}</div>}
                </td>
                <td className="p-2" style={{ color: 'var(--text-secondary)' }}>{m.unit ?? ''}</td>
                <td className="p-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{m.reference_text ?? [m.reference_low, m.reference_high].filter(x => x != null).join('–')}</td>
                <td className="p-2" style={{ color: m.flag ? '#f59e0b' : 'var(--text-muted)' }}>{m.flag ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-3">
        <button disabled={busy || !date || count === 0} onClick={() => onSave({ collected_on: date, markers: rows })}
          className="text-[12px] font-semibold px-4 py-2 rounded-lg"
          style={{ background: 'var(--accent-gradient)', color: '#050505', border: 'none', opacity: busy || !date || count === 0 ? 0.5 : 1 }}>
          Save {count} marker{count === 1 ? '' : 's'}
        </button>
        <button disabled={busy} onClick={onDismiss} className="text-[12px] px-3 py-2 rounded-lg"
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>Discard</button>
      </div>
    </div>
  )
}

function InBodyReview({ doc, busy, onSave, onDismiss }: { doc: Doc; busy: boolean; onSave: (b: Record<string, unknown>) => void; onDismiss: () => void }) {
  const x = doc.extracted ?? {}
  const [date, setDate] = useState(doc.collected_on ?? x.test_date ?? '')
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(INBODY_FIELDS.map(f => [f.key, x[f.key] != null ? String(x[f.key]) : ''])))
  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Test date
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...cell, marginTop: 4 }} />
        </label>
        {INBODY_FIELDS.map(f => (
          <label key={f.key} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{f.label}{f.unit ? ` (${f.unit})` : ''}
            <input inputMode="decimal" value={vals[f.key]} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))} style={{ ...cell, marginTop: 4 }} />
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button disabled={busy || !date} onClick={() => onSave({ inbody: { test_date: date, ...Object.fromEntries(INBODY_FIELDS.map(f => [f.key, toNum(vals[f.key])])) } })}
          className="text-[12px] font-semibold px-4 py-2 rounded-lg"
          style={{ background: 'var(--accent-gradient)', color: '#050505', border: 'none', opacity: busy || !date ? 0.5 : 1 }}>
          Save scan
        </button>
        <button disabled={busy} onClick={onDismiss} className="text-[12px] px-3 py-2 rounded-lg"
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>Discard</button>
      </div>
    </div>
  )
}

export default function HealthDocumentsCard({ kind, onSaved }: { kind: Kind; onSaved?: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/health/documents')
    if (res.ok) setDocs(((await res.json()).documents as Doc[]).filter(d => d.kind === kind))
  }, [kind])
  useEffect(() => { refresh() }, [refresh])

  async function upload(f: File) {
    setBusy(true)
    setNotice(`Reading ${f.name} — about a minute…`)
    try {
      const file = await shrinkImage(f)
      if (file.size > MAX_BYTES) throw new Error('File is over 4 MB. Try a smaller PDF or photo.')
      const form = new FormData()
      form.append('kind', kind)
      form.append('file', file)
      const res = await fetch('/api/health/documents', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      setNotice('✅ Read — review below, then save.')
    } catch (err) {
      setNotice(`⚠️ ${(err as Error).message}`)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
      await refresh()
    }
  }

  async function post(body: Record<string, unknown>, done: (d: { written?: number; skipped?: number }) => string) {
    setBusy(true)
    try {
      const res = await fetch('/api/health/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      setNotice(done(data))
      if (body.op === 'apply') onSaved?.()
    } catch (err) {
      setNotice(`⚠️ ${(err as Error).message}`)
    } finally {
      setBusy(false)
      await refresh()
    }
  }

  const pending = docs.filter(d => d.status === 'parsed')
  const failed = docs.filter(d => d.status === 'error')
  const history = docs.filter(d => d.status === 'applied').slice(0, 6)

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <FileText size={15} className="text-[var(--accent-cyan)]" /> {COPY[kind].title}
        </h3>
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(var(--accent-rgb), 0.3)', cursor: busy ? 'wait' : 'pointer' }}>
          <Upload size={12} className={busy ? 'animate-pulse' : ''} /> Upload
        </button>
        <input ref={fileRef} type="file" accept={COPY[kind].accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
      </div>
      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{COPY[kind].hint}</p>

      {pending.map(d => (
        <div key={d.id} className="mt-4 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-line)' }}>
          <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Review: {d.file_name ?? 'document'}</div>
          {kind === 'lab'
            ? <LabReview doc={d} busy={busy} onSave={b => post({ op: 'apply', id: d.id, ...b }, r => `✅ Saved ${r.written} marker(s)${r.skipped ? ` · ${r.skipped} already recorded for that date` : ''}`)} onDismiss={() => post({ op: 'dismiss', id: d.id }, () => 'Discarded')} />
            : <InBodyReview doc={d} busy={busy} onSave={b => post({ op: 'apply', id: d.id, ...b }, () => '✅ Scan saved')} onDismiss={() => post({ op: 'dismiss', id: d.id }, () => 'Discarded')} />}
        </div>
      ))}

      {failed.map(d => (
        <div key={d.id} className="mt-3 text-[11.5px] flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444' }}>
          <span>{d.file_name}: {d.parse_error?.slice(0, 140)}</span>
          <button onClick={() => post({ op: 'parse', id: d.id }, () => 'Re-read — review below')} disabled={busy} aria-label="Retry" style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}>
            <RotateCw size={12} />
          </button>
        </div>
      ))}

      {history.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {history.map(d => (
            <div key={d.id} className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span>{d.collected_on ?? '—'} · {d.provider ?? d.file_name}</span>
              <button aria-label="Open original" onClick={async () => {
                const r = await fetch(`/api/health/documents?file=${d.id}`)
                const j = await r.json()
                if (j.url) window.open(j.url, '_blank', 'noopener')
              }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><ExternalLink size={11} /></button>
            </div>
          ))}
        </div>
      )}

      {notice && (
        <div className="mt-3 text-[11.5px] px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>{notice}</div>
      )}
    </div>
  )
}
