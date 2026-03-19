'use client'

import { useState, useMemo } from 'react'
import type { DbHouseMaterial } from '@/types/database'

type MaterialWithProject = DbHouseMaterial & {
  house_projects: { title: string; room: string } | null
}

interface Props {
  initialMaterials: MaterialWithProject[]
  projects: { id: string; title: string; room: string }[]
}

const ORDER_STATUS_OPTIONS = ['need_to_buy','ordered','shipped','delivered','installed','returned'] as const
const ORDER_STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  need_to_buy: { label: 'Need to Buy', color: '#6b7280', icon: '🛒' },
  ordered:     { label: 'Ordered',     color: '#60a5fa', icon: '📦' },
  shipped:     { label: 'Shipped',     color: '#f59e0b', icon: '🚚' },
  delivered:   { label: 'Delivered',   color: '#a78bfa', icon: '✅' },
  installed:   { label: 'Installed',   color: '#10b981', icon: '🔧' },
  returned:    { label: 'Returned',    color: '#ef4444', icon: '↩️' },
}

function fmt(n: number) {
  return n > 0 ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—'
}

export default function MaterialsTracker({ initialMaterials, projects }: Props) {
  const [materials, setMaterials] = useState<MaterialWithProject[]>(initialMaterials)
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [groupByStore, setGroupByStore] = useState(false)
  const [showShoppingList, setShowShoppingList] = useState(false)

  const filtered = useMemo(() => materials.filter(m => {
    if (filterProject && m.project_id !== filterProject) return false
    if (filterStatus  && m.order_status !== filterStatus)  return false
    return true
  }), [materials, filterProject, filterStatus])

  const total        = filtered.reduce((s, m) => s + m.total_cost, 0)
  const needToBuyAmt = filtered.filter(m => m.order_status === 'need_to_buy').reduce((s, m) => s + m.total_cost, 0)

  // Group by vendor for shopping list
  const byVendor = useMemo(() => {
    const needToBuy = materials.filter(m => m.order_status === 'need_to_buy')
    const map = new Map<string, MaterialWithProject[]>()
    for (const m of needToBuy) {
      const v = m.vendor || 'Other'
      if (!map.has(v)) map.set(v, [])
      map.get(v)!.push(m)
    }
    return map
  }, [materials])

  async function cycleStatus(m: MaterialWithProject) {
    const idx = ORDER_STATUS_OPTIONS.indexOf(m.order_status as typeof ORDER_STATUS_OPTIONS[number])
    const next = ORDER_STATUS_OPTIONS[(idx + 1) % ORDER_STATUS_OPTIONS.length]
    setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, order_status: next } : x))
    await fetch(`/api/house/materials/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_status: next }),
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <div>
          <h1 className="text-lg font-bold gradient-text">🛒 Materials Tracker</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {materials.length} items across all projects
          </p>
        </div>
        <button onClick={() => setShowShoppingList(s => !s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
            showShoppingList
              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
              : 'border-white/12 text-[var(--text-muted)] hover:border-cyan-500/20 hover:text-[var(--accent-cyan)]'
          }`}>
          🛍 Shopping List
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Shopping List view */}
        {showShoppingList && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Shopping List — Need to Buy
              </h2>
              <span className="text-sm font-semibold text-amber-400">{fmt(needToBuyAmt)} total</span>
            </div>
            {byVendor.size === 0 ? (
              <p className="text-center py-8 text-[var(--text-muted)] text-sm">No items to buy</p>
            ) : (
              [...byVendor.entries()].map(([vendor, items]) => {
                const subtotal = items.reduce((s, m) => s + m.total_cost, 0)
                return (
                  <div key={vendor} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between">
                      <p className="text-sm font-bold text-[var(--text-primary)]">🏪 {vendor}</p>
                      <p className="text-sm font-semibold text-cyan-300">{fmt(subtotal)}</p>
                    </div>
                    <div className="divide-y divide-white/4">
                      {items.map(m => (
                        <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="w-4 h-4 rounded border border-white/20 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[var(--text-primary)]">{m.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              {m.quantity} {m.unit}
                              {m.house_projects && ` · ${m.house_projects.title}`}
                            </p>
                          </div>
                          {m.total_cost > 0 && <span className="text-xs text-[var(--text-muted)] shrink-0">{fmt(m.total_cost)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Filters */}
        {!showShoppingList && (
          <>
            <div className="flex gap-3 flex-wrap">
              <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-[var(--text-secondary)] focus:outline-none">
                <option value="" style={{ background: '#0a0e27' }}>All projects</option>
                {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#0a0e27' }}>{p.title}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-[var(--text-secondary)] focus:outline-none">
                <option value="" style={{ background: '#0a0e27' }}>All statuses</option>
                {ORDER_STATUS_OPTIONS.map(s => (
                  <option key={s} value={s} style={{ background: '#0a0e27' }}>
                    {ORDER_STATUS_CFG[s].label}
                  </option>
                ))}
              </select>
              {(filterProject || filterStatus) && (
                <button onClick={() => { setFilterProject(''); setFilterStatus('') }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">Clear</button>
              )}
              <div className="ml-auto flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>{filtered.length} items</span>
                <span className="font-semibold text-[var(--text-primary)]">{fmt(total)}</span>
              </div>
            </div>

            {/* Status summary pills */}
            <div className="flex gap-2 flex-wrap">
              {ORDER_STATUS_OPTIONS.map(s => {
                const count = materials.filter(m => m.order_status === s).length
                if (count === 0) return null
                const cfg = ORDER_STATUS_CFG[s]
                return (
                  <button key={s} onClick={() => setFilterStatus(f => f === s ? '' : s)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer transition-all border ${
                      filterStatus === s ? 'bg-white/10' : ''
                    }`}
                    style={{ borderColor: `${cfg.color}40`, color: cfg.color }}>
                    {cfg.icon} {cfg.label} <span className="font-bold">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Materials table */}
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)] text-sm">No materials found</div>
            ) : (
              <div className="space-y-2">
                {filtered.map(m => {
                  const sc = ORDER_STATUS_CFG[m.order_status]
                  return (
                    <div key={m.id} className="flex items-center gap-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.name}</p>
                          {m.house_projects && (
                            <span className="text-[10px] text-[var(--text-muted)] shrink-0">{m.house_projects.room}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[var(--text-muted)]">{m.quantity} {m.unit}</span>
                          {m.vendor && <span className="text-[10px] text-[var(--text-muted)]">@ {m.vendor}</span>}
                          {m.house_projects && (
                            <span className="text-[10px] text-[var(--text-muted)] truncate">· {m.house_projects.title}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {m.total_cost > 0 && (
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{fmt(m.total_cost)}</span>
                        )}
                        <button onClick={() => cycleStatus(m)}
                          className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-all hover:opacity-80"
                          style={{ background: `${sc.color}20`, color: sc.color }}>
                          {sc.icon} {sc.label}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
