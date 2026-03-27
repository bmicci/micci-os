'use client'

import type { HELOCAccount, HelocKPIs, WaterfallItem } from '@/lib/financial-data'
import { fmt, HELOC_LIMIT, HELOC_RATE } from '@/lib/financial-data'
import KPICard from './KPICard'
import HELOCBarChart from './HELOCBarChart'
import HELOCDrawdownTimeline from './HELOCDrawdownTimeline'

// ── Decision badge ──────────────────────────────────
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

// ── Format helpers ──────────────────────────────────
function fmtRound(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function fmtK(n: number): string {
  return n >= 1000 ? '$' + (n / 1000).toFixed(0) + 'K' : '$' + n.toFixed(0)
}

// ── Props ───────────────────────────────────────────
interface HELOCPlanTabProps {
  helocAccounts: HELOCAccount[]
  helocKPIs: HelocKPIs
  waterfallData: WaterfallItem[]
}

export default function HELOCPlanTab({ helocAccounts, helocKPIs, waterfallData }: HELOCPlanTabProps) {
  const kpi = helocKPIs

  return (
    <div className="space-y-5">
      {/* Dynamic KPIs — all derived from live debts */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          label="HELOC Limit (Confirmed)"
          value={fmtRound(kpi.limit)}
          note={`Texas Credit Union · ${kpi.rate}% variable`}
          accent="green"
        />
        <KPICard
          label="Immediate Roll at Close"
          value={fmtRound(kpi.immediateRoll)}
          note={`${helocAccounts.filter(a => a.decision === 'roll').length} high-rate accounts`}
        />
        <KPICard
          label="HELOC After Roll"
          value={fmtRound(kpi.helocAfterRoll)}
          note="Available for promo payoffs"
        />
        <KPICard
          label="Monthly HELOC Interest"
          value={fmtRound(kpi.monthlyHelocInterest)}
          note={`Interest-only on ${fmtK(kpi.immediateRoll)} at ${kpi.rate}%`}
          accent="red"
        />
        <KPICard
          label="Monthly Payment Relief"
          value={fmtRound(kpi.monthlyRelief)}
          note={`vs ${fmtRound(kpi.currentPaymentsOnRolled)}/mo current`}
          accent="green"
        />
        <KPICard
          label="Annual Cash Flow Gain"
          value={fmtRound(kpi.annualGain)}
          note="Critical during income gap period"
          accent="green"
        />
      </div>

      {/* Decision Matrix + Before/After Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: 'start' }}>
        {/* Decision Matrix Table — fully derived from debts */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              Decision Matrix — Roll vs. Keep
            </h3>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cutoff: {HELOC_RATE}%</span>
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
              {/* Totals row */}
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(0,212,255,0.2)' }}>
                  <td className="py-2.5 px-3 text-[12px] font-bold" style={{ color: 'var(--accent-cyan)' }}>
                    TOTALS
                  </td>
                  <td className="py-2.5 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>
                    {fmtRound(helocAccounts.reduce((s, a) => s + a.balance, 0))}
                  </td>
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3 text-[12px] font-mono font-bold" style={{ color: '#22c55e' }}>
                    +{fmtRound(kpi.monthlyRelief)}/mo
                  </td>
                  <td className="py-2.5 px-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Before vs After Chart — dynamic data */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Monthly Payment: Before vs. After HELOC
          </h3>
          <HELOCBarChart helocAccounts={helocAccounts} />
        </div>
      </div>

      {/* Waterfall — fully computed from debts */}
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
                  {item.amount < 0 ? '−' : ''}{fmtRound(Math.abs(item.amount))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Buffer health indicator */}
        <div
          className="mt-4 p-3 rounded-lg text-[12px] font-semibold text-center"
          style={{
            background: kpi.finalBuffer > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: kpi.finalBuffer > 0 ? '#22c55e' : '#ef4444',
            border: `1px solid ${kpi.finalBuffer > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          {kpi.finalBuffer > 0
            ? `✅ ${fmtRound(kpi.finalBuffer)} buffer remaining after all promos are paid`
            : `⚠️ ${fmtRound(Math.abs(kpi.finalBuffer))} shortfall — need additional funds for promo payoffs`
          }
        </div>
      </div>

      {/* HELOC Drawdown Timeline */}
      <HELOCDrawdownTimeline helocKPIs={helocKPIs} />
    </div>
  )
}
