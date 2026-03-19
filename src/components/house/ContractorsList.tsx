'use client'

import { useState, useCallback } from 'react'
import type { DbHouseContractor, DbHouseProject } from '@/types/database'

interface Props {
  initialContractors: DbHouseContractor[]
  projects: Pick<DbHouseProject, 'id' | 'title' | 'room'>[]
}

const TRADES = [
  'general_contractor','plumber','electrician','painter','carpenter',
  'hvac','roofer','landscaper','tile','flooring','drywall','other',
]
const TRADE_LABELS: Record<string, string> = {
  general_contractor: 'General Contractor', plumber: 'Plumber', electrician: 'Electrician',
  painter: 'Painter', carpenter: 'Carpenter', hvac: 'HVAC', roofer: 'Roofer',
  landscaper: 'Landscaper', tile: 'Tile', flooring: 'Flooring', drywall: 'Drywall', other: 'Other',
}

type NewContractorForm = {
  name: string; company: string; trade: string; phone: string; email: string; website: string
  rating: string; source: string; notes: string
}

type NewBidForm = {
  project_id: string; contractor_id: string; bid_amount: string; scope_of_work: string; notes: string
}

function StarRating({ rating }: { rating: number | null }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`text-xs ${i <= (rating ?? 0) ? 'text-amber-400' : 'text-white/15'}`}>★</span>
      ))}
    </div>
  )
}

export default function ContractorsList({ initialContractors, projects }: Props) {
  const [contractors, setContractors] = useState<DbHouseContractor[]>(initialContractors)
  const [showAdd, setShowAdd] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showBidForm, setShowBidForm] = useState<string | null>(null)
  const [form, setForm] = useState<NewContractorForm>({
    name: '', company: '', trade: 'general_contractor', phone: '', email: '', website: '',
    rating: '0', source: '', notes: '',
  })
  const [bidForm, setBidForm] = useState<NewBidForm>({
    project_id: '', contractor_id: '', bid_amount: '', scope_of_work: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [savingBid, setSavingBid] = useState(false)

  const handleAddContractor = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/house/contractors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, company: form.company || null, trade: form.trade,
        phone: form.phone || null, email: form.email || null, website: form.website || null,
        rating: parseInt(form.rating) || null, source: form.source || null,
        notes: form.notes || null,
      }),
    })
    const data = await res.json() as DbHouseContractor
    setContractors(prev => [...prev, data])
    setForm({ name: '', company: '', trade: 'general_contractor', phone: '', email: '', website: '', rating: '0', source: '', notes: '' })
    setSaving(false)
    setShowAdd(false)
  }, [form])

  const handleAddBid = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bidForm.bid_amount || !bidForm.project_id) return
    setSavingBid(true)
    await fetch('/api/house/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractor_id: bidForm.contractor_id,
        project_id: bidForm.project_id,
        bid_amount: parseFloat(bidForm.bid_amount),
        scope_of_work: bidForm.scope_of_work || null,
        notes: bidForm.notes || null,
        status: 'received',
      }),
    })
    setSavingBid(false)
    setShowBidForm(null)
  }, [bidForm])

  const handleToggleActive = useCallback(async (c: DbHouseContractor) => {
    const next = !c.is_active
    setContractors(prev => prev.map(x => x.id === c.id ? { ...x, is_active: next } : x))
    await fetch(`/api/house/contractors/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    })
  }, [])

  const active   = contractors.filter(c => c.is_active)
  const inactive = contractors.filter(c => !c.is_active)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <div>
          <h1 className="text-lg font-bold gradient-text">👷 Contractors</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {active.length} active contractor{active.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowAdd(s => !s)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
          + Add Contractor
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Add contractor form */}
        {showAdd && (
          <form onSubmit={handleAddContractor}
            className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">New Contractor</h3>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input-sm col-span-2" />
              <input placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="input-sm" />
              <select value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
                className="input-sm">
                {TRADES.map(t => <option key={t} value={t} style={{ background: '#0a0e27' }}>{TRADE_LABELS[t]}</option>)}
              </select>
              <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="input-sm" />
              <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-sm" />
              <input placeholder="Website" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                className="input-sm" />
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">Rating</label>
                <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}
                  className="input-sm flex-1">
                  {[0,1,2,3,4,5].map(n => <option key={n} value={n} style={{ background: '#0a0e27' }}>{n > 0 ? '★'.repeat(n) : 'None'}</option>)}
                </select>
              </div>
              <input placeholder="Source (Yelp, referral, etc.)" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="input-sm" />
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} className="input-sm col-span-2 resize-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 py-2 rounded-xl text-xs border border-white/12 text-[var(--text-muted)] hover:bg-white/5 cursor-pointer">Cancel</button>
              <button type="submit" disabled={saving || !form.name.trim()}
                className="flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
                {saving ? 'Adding…' : 'Add Contractor'}
              </button>
            </div>
          </form>
        )}

        {/* Empty state */}
        {contractors.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">👷</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">No contractors yet</p>
            <p className="text-xs text-[var(--text-muted)]">Add plumbers, electricians, GCs, painters…</p>
          </div>
        )}

        {/* Active contractors */}
        {active.length > 0 && (
          <div className="space-y-3">
            {active.map(c => {
              const isExpanded = expandedId === c.id
              return (
                <div key={c.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
                  {/* Card header */}
                  <button onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 text-left cursor-pointer hover:bg-white/3 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
                        {c.company && <span className="text-xs text-[var(--text-muted)] truncate">· {c.company}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.trade && <span className="text-[10px] text-[var(--accent-cyan)]">{TRADE_LABELS[c.trade] ?? c.trade}</span>}
                        {c.rating && <StarRating rating={c.rating} />}
                        {c.source && <span className="text-[10px] text-[var(--text-muted)]">via {c.source}</span>}
                      </div>
                    </div>
                    <span className="text-[var(--text-muted)] text-sm shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/6 pt-3">
                      {/* Contact info */}
                      <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
                        {c.phone && <a href={`tel:${c.phone}`} className="hover:text-[var(--accent-cyan)] transition-colors">📞 {c.phone}</a>}
                        {c.email && <a href={`mailto:${c.email}`} className="hover:text-[var(--accent-cyan)] transition-colors">✉️ {c.email}</a>}
                        {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-cyan)] transition-colors">🌐 Website</a>}
                      </div>

                      {c.notes && <p className="text-xs text-[var(--text-muted)] leading-relaxed">{c.notes}</p>}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => { setShowBidForm(c.id); setBidForm(f => ({ ...f, contractor_id: c.id })) }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:border-cyan-500/30 cursor-pointer transition-all">
                          + Add Bid
                        </button>
                        <button onClick={() => handleToggleActive(c)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-amber-400 hover:border-amber-500/30 cursor-pointer transition-all">
                          Archive
                        </button>
                      </div>

                      {/* Bid form */}
                      {showBidForm === c.id && (
                        <form onSubmit={handleAddBid}
                          className="bg-white/3 border border-white/8 rounded-xl p-3 space-y-2 mt-2">
                          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">New Bid</p>
                          <div className="grid grid-cols-2 gap-2">
                            <select value={bidForm.project_id} onChange={e => setBidForm(f => ({ ...f, project_id: e.target.value }))}
                              className="input-sm col-span-2" required>
                              <option value="" style={{ background: '#0a0e27' }}>Select project…</option>
                              {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#0a0e27' }}>{p.title} ({p.room})</option>)}
                            </select>
                            <input type="number" required min="0" step="0.01" placeholder="Bid amount $"
                              value={bidForm.bid_amount} onChange={e => setBidForm(f => ({ ...f, bid_amount: e.target.value }))}
                              className="input-sm" />
                            <input placeholder="Notes" value={bidForm.notes} onChange={e => setBidForm(f => ({ ...f, notes: e.target.value }))}
                              className="input-sm" />
                            <textarea placeholder="Scope of work" value={bidForm.scope_of_work}
                              onChange={e => setBidForm(f => ({ ...f, scope_of_work: e.target.value }))}
                              rows={2} className="input-sm col-span-2 resize-none" />
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setShowBidForm(null)}
                              className="flex-1 py-1.5 rounded-lg text-[10px] border border-white/10 text-[var(--text-muted)] hover:bg-white/5 cursor-pointer">Cancel</button>
                            <button type="submit" disabled={savingBid || !bidForm.bid_amount || !bidForm.project_id}
                              className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer disabled:opacity-50"
                              style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
                              {savingBid ? 'Saving…' : 'Save Bid'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Archived */}
        {inactive.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2">Archived ({inactive.length})</p>
            <div className="space-y-2">
              {inactive.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 bg-white/2 border border-white/5 rounded-xl opacity-50">
                  <p className="text-sm text-[var(--text-muted)] flex-1">{c.name} {c.company ? `· ${c.company}` : ''}</p>
                  <button onClick={() => handleToggleActive(c)}
                    className="text-[10px] text-[var(--text-muted)] hover:text-emerald-400 cursor-pointer">Restore</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .input-sm {
          width: 100%;
          padding: 7px 10px;
          border-radius: 10px;
          font-size: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.15s;
        }
        .input-sm:focus { border-color: rgba(0,212,255,0.4); }
        .input-sm::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  )
}
