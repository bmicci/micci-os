'use client'

import { useState, useMemo } from 'react'
import type { DebtAccount } from '@/lib/financial-data'
import { getDebtTotals, fmtK, fmt } from '@/lib/financial-data'
import KPICard from './KPICard'
import DebtCategoryDonut from './DebtCategoryDonut'
import RateDistributionChart from './RateDistributionChart'

type SortKey = 'name' | 'balance' | 'rate' | 'min'

const decisionBadge = (d: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    roll: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: '✅ ROLL' },
    keep: { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', label: '🚫 KEEP' },
    promo: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '⏳ 0% PROMO' },
  }
  const s = map[d] || map.keep
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

export default function DebtTrackerTab({ debts }: { debts: DebtAccount[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('balance')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)

  const totals = getDebtTotals(debts)
  const nonMortgage = debts.filter(d => d.category !== 'Mortgage')

  const sorted = useMemo(() => {
    return [...nonMortgage].sort((a, b) => {
      const av = a[sortKey] ?? -1
      const bv = b[sortKey] ?? -1
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sortDir
      return ((av as number) - (bv as number)) * sortDir
    })
  }, [nonMortgage, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 1 ? -1 : 1) as 1 | -1)
    else { setSortKey(key); setSortDir(-1) }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === -1 ? ' \u25be' : ' \u25b4') : ''

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Debt (excl. mortgage)" value={fmtK(totals.total)} note="All accounts combined" accent="red" />
        <KPICard label="High-Rate (>6.85%)" value={fmtK(totals.highRate)} note="Roll to HELOC at close" />
        <KPICard label="0% Promo Balances" value={fmtK(totals.promo)} note="Keep — pay from HELOC before expiry" accent="amber" />
        <KPICard label="Below HELOC Rate" value={fmtK(totals.keep)} note="Keep as-is" accent="green" />
      </div>

      {/* Table + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: 'start' }}>
        {/* Sortable Debt Table */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            All Accounts — Sortable
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  {[
                    { key: 'name' as SortKey, label: 'Account' },
                    { key: 'balance' as SortKey, label: 'Balance' },
                    { key: 'rate' as SortKey, label: 'Rate' },
                    { key: 'min' as SortKey, label: 'Min/Mo' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {col.label}{sortIndicator(col.key)}
                    </th>
                  ))}
                  <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Decision
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d, i) => (
                  <tr
                    key={d.name}
                    className="transition-colors hover:bg-white/[0.03]"
                    style={{ borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                  >
                    <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                      {d.name}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {fmt(d.balance)}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono">
                      {d.rate === 0
                        ? <span style={{ color: '#22c55e' }}>0% promo</span>
                        : <span style={{ color: 'var(--text-secondary)' }}>{d.rate}%</span>
                      }
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {d.min ? fmt(d.min) : '—'}
                    </td>
                    <td className="py-2 px-3">
                      {decisionBadge(d.decision)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Debt by Category
            </h3>
            <DebtCategoryDonut debts={debts} />
          </div>
          <div className="glass-card p-5">
            <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Rate Distribution
            </h3>
            <RateDistributionChart debts={debts} />
          </div>
        </div>
      </div>
    </div>
  )
}
