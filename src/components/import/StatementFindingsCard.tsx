'use client'

// Statement findings — review what Claude read off card statements before
// anything touches promo_deadlines. Statements arrive from the daily Plaid
// sync (Plaid Statements) or by dropping a PDF here.

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Upload, Check, X, ExternalLink, RotateCw, ChevronDown, ChevronRight } from 'lucide-react'

interface Proposal {
  name?: string
  account_name?: string
  balance?: number
  expires?: string
  deferred_interest?: number | null
  apr?: number | null
  status?: 'paid'
}
interface Finding {
  id: string
  statement_id: string
  kind: 'update_promo' | 'new_promo' | 'promo_paid' | 'info'
  account_name: string | null
  title: string
  current: { name?: string; balance?: number; expires?: string; deferred_interest?: number | null } | null
  proposed: Proposal | null
  status: 'pending' | 'applied'
  resolved_at: string | null
}
interface Segment { type: string; description: string; balance: number; apr: number | null; promo_end_date: string | null }
interface Statement {
  id: string
  source: 'plaid' | 'upload'
  institution: string | null
  account_name: string | null
  account_mask: string | null
  period_year: number | null
  period_month: number | null
  status: 'downloaded' | 'parsing' | 'parsed' | 'error'
  parse_error: string | null
  summary: { closing_date: string | null; new_balance: number | null; minimum_payment: number | null; payment_due_date: string | null; segments: Segment[] } | null
}

const KIND_LABEL: Record<Finding['kind'], { label: string; color: string }> = {
  update_promo: { label: 'Update', color: '#00d4ff' },
  new_promo: { label: 'New promo', color: '#a78bfa' },
  promo_paid: { label: 'Mark paid', color: '#10b981' },
  info: { label: 'FYI', color: '#f59e0b' },
}
const money = (n?: number | null) => (n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const period = (s: Statement) => (s.period_year ? `${s.period_year}-${String(s.period_month).padStart(2, '0')}` : 'unknown period')

const inputStyle = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.25)',
  color: 'var(--text-primary)', borderRadius: 6, padding: '3px 6px', fontSize: 11.5, width: '100%',
} as const

function FindingRow({ f, busy, onApply, onDismiss }: {
  f: Finding
  busy: boolean
  onApply: (edits: Proposal) => void
  onDismiss: () => void
}) {
  const [balance, setBalance] = useState(f.proposed?.balance?.toString() ?? '')
  const [expires, setExpires] = useState(f.proposed?.expires ?? '')
  const editable = f.kind === 'update_promo' || f.kind === 'new_promo'
  const k = KIND_LABEL[f.kind]

  function confirm() {
    const edits: Proposal = {}
    if (editable && balance !== '' && Number.isFinite(Number(balance))) edits.balance = Number(balance)
    if (editable && /^\d{4}-\d{2}-\d{2}$/.test(expires)) edits.expires = expires
    onApply(edits)
  }

  return (
    <div className="rounded-lg p-3 mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mr-2"
            style={{ background: `${k.color}22`, color: k.color }}>{k.label}</span>
          <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>{f.title}</span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={confirm} disabled={busy} aria-label="Confirm"
            className="text-[10.5px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)', cursor: busy ? 'wait' : 'pointer' }}>
            <Check size={11} /> {f.kind === 'info' ? 'Got it' : 'Confirm'}
          </button>
          {f.kind !== 'info' && (
            <button onClick={onDismiss} disabled={busy} aria-label="Dismiss"
              className="text-[10.5px] px-2 py-1 rounded-lg"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)', cursor: busy ? 'wait' : 'pointer' }}>
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {editable && (
        <div className="grid grid-cols-3 gap-2 mt-2.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
          <div />
          <div>Now</div>
          <div>From statement (editable)</div>
          <div>Balance</div>
          <div style={{ color: 'var(--text-secondary)' }}>{f.current ? money(f.current.balance) : '—'}</div>
          <input aria-label="Balance" style={inputStyle} inputMode="decimal" value={balance} onChange={e => setBalance(e.target.value)} />
          <div>Promo ends</div>
          <div style={{ color: 'var(--text-secondary)' }}>{f.current?.expires ?? '—'}</div>
          <input aria-label="Promo end date" style={inputStyle} type="date" value={expires} onChange={e => setExpires(e.target.value)} />
          {(f.proposed?.deferred_interest != null || f.current?.deferred_interest != null) && (
            <>
              <div>Deferred interest</div>
              <div style={{ color: 'var(--text-secondary)' }}>{money(f.current?.deferred_interest)}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{money(f.proposed?.deferred_interest)}</div>
            </>
          )}
          {f.proposed?.apr != null && (
            <>
              <div>APR on statement</div>
              <div />
              <div style={{ color: f.proposed.apr > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{f.proposed.apr}%</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function StatementFindingsCard() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [statements, setStatements] = useState<Statement[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showStatements, setShowStatements] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/statements')
      if (!res.ok) return
      const data = await res.json()
      setFindings(data.findings)
      setStatements(data.statements)
    } catch { /* keep state */ }
  }, [])

  useEffect(() => {
    refresh()
    const onUpdate = () => { refresh() }
    window.addEventListener('statements:updated', onUpdate)
    return () => window.removeEventListener('statements:updated', onUpdate)
  }, [refresh])

  async function post(body: Record<string, unknown>, key: string) {
    setBusy(key)
    try {
      const res = await fetch('/api/statements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      return data
    } catch (err) {
      setNotice(`⚠️ ${(err as Error).message}`)
      return null
    } finally {
      setBusy(null)
      await refresh()
    }
  }

  async function upload(file: File) {
    setBusy('upload')
    setNotice(`Reading ${file.name} — this takes about a minute…`)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/statements', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      setNotice(`✅ Statement read — ${data.findings} finding(s) to review`)
    } catch (err) {
      setNotice(`⚠️ ${(err as Error).message}`)
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
      await refresh()
    }
  }

  async function reparse(id: string) {
    setNotice('Re-reading statement…')
    const data = await post({ op: 'parse', statement_id: id }, id)
    if (data) setNotice(`✅ Statement read — ${data.findings} finding(s) to review`)
  }

  const pending = findings.filter(f => f.status === 'pending')
  const applied = findings.filter(f => f.status === 'applied').length

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <FileText size={15} strokeWidth={2} className="text-[var(--accent-cyan)]" />
          Statement Findings
          {pending.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}>
              {pending.length} to review
            </span>
          )}
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)', cursor: busy ? 'wait' : 'pointer' }}
        >
          <Upload size={12} className={busy === 'upload' ? 'animate-pulse' : ''} /> Upload PDF
        </button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: 'var(--text-muted)' }}>
        Card statements are read for each balance transfer&apos;s remaining balance, APR and promo end date, then
        compared with your promo deadlines. Nothing changes until you confirm. Plaid-connected banks
        deliver statements automatically; for anything else, upload the PDF.
      </p>

      {pending.length === 0 ? (
        <div className="text-[11.5px] px-3 py-2.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
          {statements.length === 0
            ? 'No statements yet. Click "Add details" on a bank above to grant Statements, or upload a PDF.'
            : `Promo deadlines match the latest statements.${applied ? ` ${applied} change(s) confirmed recently.` : ''}`}
        </div>
      ) : (
        pending.map(f => (
          <FindingRow key={f.id} f={f} busy={busy !== null}
            onApply={edits => post({ op: 'apply', id: f.id, proposed: edits }, f.id)}
            onDismiss={() => post({ op: 'dismiss', id: f.id }, f.id)} />
        ))
      )}

      {statements.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowStatements(v => !v)}
            className="text-[11px] flex items-center gap-1"
            style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            {showStatements ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Statements on file ({statements.length})
          </button>
          {showStatements && (
            <div className="mt-2 flex flex-col gap-1.5">
              {statements.map(s => (
                <div key={s.id} className="px-3 py-2 rounded-lg text-[11px]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
                      {s.account_name ?? s.institution ?? 'Statement'}{s.account_mask ? ` ···${s.account_mask}` : ''}
                      <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                        {period(s)} · {s.source === 'plaid' ? 'Plaid' : 'uploaded'} · {s.status}
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {s.status !== 'parsed' && s.status !== 'parsing' && (
                        <button onClick={() => reparse(s.id)} disabled={busy !== null} aria-label="Read statement"
                          title={s.status === 'error' ? 'Retry' : 'Read this statement'}
                          style={{ color: 'var(--accent-cyan)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                          <RotateCw size={12} className={busy === s.id ? 'animate-spin' : ''} />
                        </button>
                      )}
                      <button aria-label="Open PDF"
                        onClick={async () => {
                          const res = await fetch(`/api/statements?file=${s.id}`)
                          const data = await res.json()
                          if (data.url) window.open(data.url, '_blank', 'noopener')
                        }}
                        style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                  {s.parse_error && <div className="mt-1" style={{ color: '#ef4444' }}>{s.parse_error.slice(0, 160)}</div>}
                  {s.summary && (
                    <div className="mt-1" style={{ color: 'var(--text-muted)' }}>
                      Balance {money(s.summary.new_balance)} · min {money(s.summary.minimum_payment)} due {s.summary.payment_due_date ?? '—'}
                      {s.summary.segments.filter(g => g.balance > 0).map((g, i) => (
                        <div key={i} className="ml-2">
                          {g.description}: {money(g.balance)} @ {g.apr ?? '?'}%{g.promo_end_date ? ` until ${g.promo_end_date}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {notice && (
        <div className="mt-3 text-[11.5px] px-3 py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
          {notice}
        </div>
      )}
    </div>
  )
}
