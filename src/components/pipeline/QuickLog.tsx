'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PipelineCompany, PipelineContact } from '@/lib/pipeline-data'

// One screen, no navigation, keyboard-first (spec §3): if logging a touch
// takes more than ten seconds it gets abandoned.
export default function QuickLog({ companies, contacts }: {
  companies: PipelineCompany[]
  contacts: PipelineContact[]
}) {
  const router = useRouter()
  const [prong, setProng] = useState<'referral' | 'submission' | 'outreach'>('outreach')
  const [companyId, setCompanyId] = useState('')
  const [contactId, setContactId] = useState('')
  const [channel, setChannel] = useState('linkedin')
  const [gotReply, setGotReply] = useState(false)
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const scoped = companyId ? contacts.filter(c => c.company_id === companyId) : contacts

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/pipeline/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prong, company_id: companyId, contact_id: contactId,
          channel, got_reply: gotReply, summary,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setMsg('✅ Logged')
      setSummary(''); setGotReply(false); setContactId('')
      router.refresh()
    } catch (err) {
      setMsg(`⚠️ ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10,
    padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  } as const

  const label = (t: string) => (
    <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{t}</div>
  )

  return (
    <div className="glass-card p-6 max-w-2xl"
      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save() }}>
      {/* Prong — the one choice that matters, so it's big buttons not a select */}
      {label('Prong')}
      <div className="flex gap-2 mb-4">
        {(['referral', 'submission', 'outreach'] as const).map(p => (
          <button key={p} onClick={() => setProng(p)}
            className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold capitalize transition-all"
            style={{
              background: prong === p ? 'linear-gradient(135deg,#00d4ff,#1e90ff)' : 'rgba(255,255,255,0.04)',
              color: prong === p ? '#050505' : 'var(--text-secondary)',
              border: prong === p ? 'none' : '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
            }}>
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          {label('Company')}
          <select value={companyId} onChange={e => { setCompanyId(e.target.value); setContactId('') }} style={inputStyle}>
            <option value="">— none —</option>
            <optgroup label="In motion">
              {companies.filter(c => c.source === 'active_pipeline').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="Targets">
              {companies.filter(c => c.source === 'target_list').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          {label('Contact')}
          <select value={contactId} onChange={e => setContactId(e.target.value)} style={inputStyle}>
            <option value="">— none —</option>
            {scoped.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` · ${c.company_name}` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          {label('Channel')}
          <select value={channel} onChange={e => setChannel(e.target.value)} style={inputStyle}>
            {['linkedin', 'email', 'call', 'text', 'in_person', 'other'].map(c => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => setGotReply(v => !v)}
            className="w-full py-2.5 rounded-lg text-[12.5px] font-semibold"
            style={{
              background: gotReply ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
              color: gotReply ? '#22c55e' : 'var(--text-muted)',
              border: `1px solid ${gotReply ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer',
            }}>
            {gotReply ? '✓ Got a reply' : 'No reply yet'}
          </button>
        </div>
      </div>

      {label('What happened')}
      <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3}
        placeholder="One line is plenty — e.g. 'Sent value-first delivery plan to Shiv'"
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />

      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-lg text-[13px] font-bold"
          style={{
            background: 'linear-gradient(135deg,#00d4ff,#1e90ff)', color: '#050505',
            border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>
          {saving ? 'Saving…' : 'Log it'}
        </button>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>⌘↵ to save</span>
        {msg && <span className="text-[12px] font-semibold" style={{ color: msg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{msg}</span>}
      </div>
    </div>
  )
}
