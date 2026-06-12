'use client'

import { useMemo } from 'react'
import type { HELOCAccount, HelocKPIs, WaterfallItem, PromoDeadline, DebtAccount } from '@/lib/financial-data'
import { fmt, HELOC_LIMIT, HELOC_RATE, HELOC_DRAWN } from '@/lib/financial-data'
import { buildHelocPlan } from '@/lib/finance/helocPlan'
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
  return Math.abs(n) >= 1000 ? '$' + (n / 1000).toFixed(1) + 'K' : '$' + n.toFixed(0)
}

// ── Props ───────────────────────────────────────────
interface HELOCPlanTabProps {
  helocAccounts: HELOCAccount[]
  helocKPIs: HelocKPIs
  waterfallData: WaterfallItem[]
  promos: PromoDeadline[]
  debts: DebtAccount[]
}

export default function HELOCPlanTab({ helocAccounts, helocKPIs, waterfallData, promos, debts }: HELOCPlanTabProps) {
  const kpi = helocKPIs
  const plan = useMemo(() => buildHelocPlan(promos, debts), [promos, debts])

  const headroom = HELOC_LIMIT - HELOC_DRAWN
  const utilizationPct = Math.round((HELOC_DRAWN / HELOC_LIMIT) * 100)
  const excludedTotal = plan.excluded.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-5">
      {/* ── Strategy banner — the decided plan ── */}
      <div
        className="p-4 rounded-xl"
        style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}
      >
        <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--accent-cyan)' }}>
          📋 Drawdown Strategy — decided Jun 2026
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <div>1. Roll AmEx Gold + Platinum now — 27.49% is the expensive leak</div>
          <div>2. Pay each 2026 promo bucket from the line in its expiry month</div>
          <div>3. Virginia FCU stays with Dad ($350/mo) — preserves headroom</div>
          <div>4. Citi Diamond ($11,999, Jun 2027) deferred — re-BT or new-job income</div>
          <div>5. 🔥 Best Buy deferred promos NEVER slip — interest is retroactive</div>
          <div>6. Relief valve if cash runs out: let Dec Chase buckets go to ~29% APR (not retroactive, recoverable)</div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          label="Drawn Today"
          value={fmtRound(HELOC_DRAWN)}
          note={`${utilizationPct}% of ${fmtK(HELOC_LIMIT)} limit · ${HELOC_RATE}%`}
          accent="amber"
        />
        <KPICard
          label="Headroom"
          value={fmtRound(headroom)}
          note="Available to draw right now"
        />
        <KPICard
          label="Planned Draws"
          value={fmtRound(plan.totalPlannedDraws)}
          note="AmEx roll + 2026 promo payoffs"
          accent="red"
        />
        <KPICard
          label="Line After Plan"
          value={fmtRound(plan.lineAfterPlan)}
          note={plan.fits ? 'Plan fits — zero slack' : 'Plan exceeds the line'}
          accent={plan.lineAfterPlan >= 0 ? 'green' : 'red'}
        />
        <KPICard
          label="Peak Interest / Mo"
          value={fmtRound(plan.peakInterestMo)}
          note={`vs ${fmtRound(kpi.monthlyHelocInterest)} today — burn rises as you draw`}
          accent="amber"
        />
        <KPICard
          label="Kept Off the Line"
          value={fmtRound(excludedTotal)}
          note="VFCU (Dad) + Citi Diamond deferred"
        />
      </div>

      {/* ── Drawdown Schedule — the plan, month by month ── */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
            🗓️ Drawdown Schedule — month by month
          </h3>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Interest-only at {HELOC_RATE}% on the running balance
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {['Month', 'Draws', 'Draw Total', 'Balance', 'Interest / Mo', 'Line Left'].map(h => (
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
              {plan.months.map((m, i) => {
                const hasDraws = m.draws.length > 0
                const overLimit = m.remainingLine < 0
                return (
                  <tr
                    key={m.key}
                    className="transition-colors hover:bg-white/[0.03]"
                    style={{
                      borderBottom: i < plan.months.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      background: overLimit ? 'rgba(239,68,68,0.05)' : undefined,
                      opacity: hasDraws ? 1 : 0.55,
                    }}
                  >
                    <td className="py-2 px-3 text-[12px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                      {m.label}
                    </td>
                    <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      {hasDraws ? (
                        <div className="space-y-0.5">
                          {m.draws.map((d, j) => (
                            <div key={j}>
                              {d.deferredRisk ? '🔥 ' : ''}{d.label}
                              <span className="font-mono ml-1.5" style={{ color: 'var(--text-muted)' }}>
                                {fmt(d.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono font-semibold" style={{ color: hasDraws ? '#f59e0b' : 'var(--text-muted)' }}>
                      {hasDraws ? fmtRound(m.drawTotal) : '—'}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {fmtRound(m.endBalance)}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: '#ef4444' }}>
                      {fmtRound(m.interestMo)}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono font-semibold" style={{ color: overLimit ? '#ef4444' : m.remainingLine < 10000 ? '#f59e0b' : '#22c55e' }}>
                      {fmtRound(m.remainingLine)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Fit indicator */}
        <div
          className="mt-4 p-3 rounded-lg text-[12px] font-semibold text-center"
          style={{
            background: plan.fits ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.1)',
            color: plan.fits ? '#f59e0b' : '#ef4444',
            border: `1px solid ${plan.fits ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          {plan.fits
            ? `⚠️ Plan fits with only ${fmtRound(plan.lineAfterPlan)} of slack — every living-expense draw competes with a Dec promo bucket`
            : `🔴 Plan exceeds the line by ${fmtRound(Math.abs(plan.lineAfterPlan))} — a Dec Chase bucket must slip or cash must cover the gap`
          }
        </div>
      </div>

      {/* ── Kept off the line ── */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          🚫 Deliberately Kept Off the Line — {fmtRound(excludedTotal)}
        </h3>
        <div className="space-y-2">
          {plan.excluded.map((e, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-4 py-2"
              style={{ borderBottom: i < plan.excluded.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
            >
              <div>
                <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{e.label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{e.reason}</div>
              </div>
              <span className="text-[12px] font-mono font-semibold shrink-0" style={{ color: 'var(--text-secondary)' }}>
                {fmt(e.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Drawdown timeline chart ── */}
      <HELOCDrawdownTimeline months={plan.months} />

      {/* ── Decision Matrix + Before/After Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: 'start' }}>
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
            </table>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Monthly Payment: Before vs. After HELOC
          </h3>
          <HELOCBarChart helocAccounts={helocAccounts} />
        </div>
      </div>

      {/* ── Waterfall (all-in view, incl. deferred items) ── */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
            HELOC Utilization — if everything were paid from the line
          </h3>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Includes deferred items — shows why Diamond + VFCU are excluded
          </span>
        </div>
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

        <div
          className="mt-4 p-3 rounded-lg text-[12px] font-semibold text-center"
          style={{
            background: kpi.finalBuffer > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: kpi.finalBuffer > 0 ? '#22c55e' : '#ef4444',
            border: `1px solid ${kpi.finalBuffer > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          {kpi.finalBuffer > 0
            ? `✅ ${fmtRound(kpi.finalBuffer)} buffer if everything were paid from the line`
            : `⚠️ ${fmtRound(Math.abs(kpi.finalBuffer))} oversubscribed if everything were paid from the line — hence the deferred list above`
          }
        </div>
      </div>
    </div>
  )
}
