'use client'

import type { HELOCAccount } from '@/lib/financial-data'
import { fmt } from '@/lib/financial-data'
import KPICard from './KPICard'
import HELOCBarChart from './HELOCBarChart'

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

const HELOC_RATE = 6.85
const HELOC_LIMIT = 190000
// Updated Mar 8: SoFi $56,075 + WF/Dad $21,420 + VFCU/Dad $18,600 + AmEx Plat $6,453 + AmEx Gold $6,263 + Nordstrom $653 = $109,464
const IMMEDIATE_ROLL = 109464

// Waterfall stages (updated with Mar 8 balances)
const waterfallData = [
  { label: 'HELOC Limit (Confirmed)', amount: 190000, color: '#22c55e' },
  { label: '→ Immediate Roll (high-rate debt)', amount: -109464, color: '#ef4444' },
  { label: '= Available After Roll', amount: 80536, color: '#3b82f6' },
  { label: '→ Promo payoffs (as they expire)', amount: -51129, color: '#f59e0b' },
  { label: '= Final Available Buffer', amount: 29407, color: '#22c55e' },
]

export default function HELOCPlanTab({ helocAccounts }: { helocAccounts: HELOCAccount[] }) {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard label="HELOC Limit (Confirmed)" value="$190,000" note="Texas Credit Union · 6.85% variable" accent="green" />
        <KPICard label="Immediate Roll at Close" value="$109,464" note="High-rate accounts" />
        <KPICard label="HELOC After Roll" value="$80,536" note="Available for promo payoffs" />
        <KPICard label="Monthly HELOC Interest" value="$625" note="Interest-only on $109,464 at 6.85%" accent="red" />
        <KPICard label="Monthly Payment Relief" value="$2,860" note="vs current payments on same accounts" accent="green" />
        <KPICard label="Annual Cash Flow Gain" value="$34,323" note="Critical during income gap period" accent="green" />
      </div>

      {/* Decision Matrix + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: 'start' }}>
        {/* Decision Matrix Table */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              Decision Matrix — Roll vs. Keep
            </h3>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cutoff: 6.85%</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  {['Account', 'Balance', 'Rate', 'Mo. Savings', 'Decision'].map(h => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {helocAccounts.map((a, i) => {
                  const moHeloc = a.balance * (HELOC_RATE / 100) / 12
                  const save = a.moNow - moHeloc
                  return (
                    <tr
                      key={a.name}
                      className="transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: i < helocAccounts.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                    >
                      <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                        {a.name}
                      </td>
                      <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {fmt(a.balance)}
                      </td>
                      <td className="py-2 px-3 text-[12px] font-mono">
                        {a.rate === 0
                          ? <span style={{ color: '#22c55e' }}>0%</span>
                          : <span style={{ color: 'var(--text-secondary)' }}>{a.rate}%</span>
                        }
                      </td>
                      <td className="py-2 px-3 text-[12px] font-mono" style={{
                        color: a.decision === 'promo' ? 'var(--text-muted)' : save > 0 ? '#22c55e' : save < 0 ? '#ef4444' : 'var(--text-muted)'
                      }}>
                        {a.decision === 'promo' ? '—' : (save > 0 ? '+' : '') + fmt(save)}
                      </td>
                      <td className="py-2 px-3">{decisionBadge(a.decision)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Before vs After Chart */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Monthly Payment: Before vs. After HELOC
          </h3>
          <HELOCBarChart />
        </div>
      </div>

      {/* Waterfall */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          HELOC Utilization — Waterfall Over Time
        </h3>
        <div className="space-y-0">
          {waterfallData.map((item, i) => {
            const pct = Math.abs(item.amount) / HELOC_LIMIT * 100
            return (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: i < waterfallData.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <div className="w-[220px] text-[12px] shrink-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {item.label}
                </div>
                <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded"
                    style={{ width: `${Math.min(pct, 100)}%`, background: item.color, minWidth: 4 }}
                  />
                </div>
                <div
                  className="w-[100px] text-right text-[12px] font-mono font-semibold shrink-0"
                  style={{ color: item.color }}
                >
                  {item.amount < 0 ? '−' : ''}{fmt(Math.abs(item.amount))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
