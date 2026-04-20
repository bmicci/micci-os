'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts'

// ─── Types ─────────────────────────────────────────────────────────────────

interface TaxYear {
  year: number
  grossIncome: number
  federalWithheld: number
  taxOwed: number         // final liability
  refundOrOwed: number    // positive = refund, negative = owe
  effectiveRate: number   // as decimal e.g. 0.142
  filingStatus: string
  status: 'filed' | 'estimated' | 'projected'
  deductionType: 'standard' | 'itemized'
  deductionAmount: number
  notes?: string
}

interface QuarterlyPayment {
  quarter: string
  label: string
  deadline: string          // ISO date string
  amount: number | null     // null = not yet set
  paid: boolean
  paidDate?: string
}

interface PropertyAuthority {
  auth: string
  amount: number
  pct: number
  color: string
}

// ─── Static Data ───────────────────────────────────────────────────────────

const TAX_HISTORY: TaxYear[] = [
  {
    year: 2021,
    grossIncome: 138_000,
    federalWithheld: 20_100,
    taxOwed: 22_400,
    refundOrOwed: -2_300,
    effectiveRate: 0.162,
    filingStatus: 'Single',
    status: 'estimated',
    deductionType: 'standard',
    deductionAmount: 12_550,
    notes: 'Estimated — update with actuals',
  },
  {
    year: 2022,
    grossIncome: 148_000,
    federalWithheld: 21_200,
    taxOwed: 24_100,
    refundOrOwed: -2_900,
    effectiveRate: 0.163,
    filingStatus: 'Single',
    status: 'estimated',
    deductionType: 'standard',
    deductionAmount: 12_950,
    notes: 'Estimated — update with actuals',
  },
  {
    year: 2023,
    grossIncome: 153_000,
    federalWithheld: 22_000,
    taxOwed: 24_900,
    refundOrOwed: -2_900,
    effectiveRate: 0.163,
    filingStatus: 'Single',
    status: 'estimated',
    deductionType: 'standard',
    deductionAmount: 13_850,
    notes: 'Estimated — update with actuals',
  },
  {
    year: 2024,
    grossIncome: 158_000,
    federalWithheld: 22_800,
    taxOwed: 25_600,
    refundOrOwed: -2_800,
    effectiveRate: 0.162,
    filingStatus: 'Single',
    status: 'estimated',
    deductionType: 'itemized',
    deductionAmount: 26_500,
    notes: 'Estimated — update with actuals from TurboTax / return',
  },
  {
    year: 2025,
    grossIncome: 160_667,
    federalWithheld: 23_127,
    taxOwed: 24_891,
    refundOrOwed: -1_764,
    effectiveRate: 0.155,
    filingStatus: 'Single',
    status: 'filed',
    deductionType: 'itemized',
    deductionAmount: 27_152,   // mortgage int $17,152 + SALT $10k
    notes: 'Filed Apr 2026. Itemized: mortgage interest $17,152 + SALT $10K. Property taxes $14,595 (confirm HAF impact).',
  },
]

// 2026 projection — W-2 + consulting, ~$180K blended
const PROJECTED_2026: TaxYear = {
  year: 2026,
  grossIncome: 180_000,
  federalWithheld: 25_000,    // estimated based on new job W-4
  taxOwed: 28_500,
  refundOrOwed: -3_500,
  effectiveRate: 0.158,
  filingStatus: 'Single',
  status: 'projected',
  deductionType: 'itemized',
  deductionAmount: 27_200,
  notes: 'Projected — update when final W-2 available. Assumes $180K gross, itemized deductions.',
}

// Q estimates for 2026 — Brandon is W-2 only so quarterly payments
// are only needed if consulting / other non-W2 income is significant.
// These are shown as tracker for awareness even if W-4 covers most liability.
const QUARTERLY_PAYMENTS_2026: QuarterlyPayment[] = [
  {
    quarter: 'Q1',
    label: 'Q1 2026 — Jan 1 – Mar 31',
    deadline: '2026-04-15',
    amount: null,
    paid: false,
    notes: 'Covers Jan–Mar income. If W-2 only, W-4 withholding counts.',
  } as QuarterlyPayment & { notes: string },
  {
    quarter: 'Q2',
    label: 'Q2 2026 — Apr 1 – May 31',
    deadline: '2026-06-16',
    amount: null,
    paid: false,
    notes: 'IRS Q2 covers only Apr–May (2-month window).',
  } as QuarterlyPayment & { notes: string },
  {
    quarter: 'Q3',
    label: 'Q3 2026 — Jun 1 – Aug 31',
    deadline: '2026-09-15',
    amount: null,
    paid: false,
  },
  {
    quarter: 'Q4',
    label: 'Q4 2026 — Sep 1 – Dec 31',
    deadline: '2027-01-15',
    amount: null,
    paid: false,
  },
]

const PROPERTY_TAX_2025: PropertyAuthority[] = [
  { auth: 'Dallas ISD',      amount: 6_211.47, pct: 42.6, color: '#00D4FF' },
  { auth: 'City of Dallas',  amount: 4_751.84, pct: 32.6, color: '#1E90FF' },
  { auth: 'Dallas County',   amount: 1_465.40, pct: 10.0, color: '#7C3AED' },
  { auth: 'Parkland Hospital', amount: 1_441.60, pct: 9.9, color: '#DB2777' },
  { auth: 'Dallas College',  amount: 724.71,  pct: 5.0,  color: '#F59E0B' },
]

const KEY_ITEMS_2026 = [
  { icon: '📋', text: 'File or update W-4 at new employer — ensure withholding covers 2026 liability' },
  { icon: '💡', text: '2026 is potentially a lower-income year — ideal window for Roth IRA conversion' },
  { icon: '📈', text: 'IRA contributions for 2026: limit $7,000 (traditional or Roth) — deadline Apr 15, 2027' },
  { icon: '🏠', text: 'Property taxes ~$14-15K due Nov 2026 — $10K deductible under SALT cap' },
  { icon: '🤝', text: 'SS wage base $176,100 — stop withholding after ~pay period 27 (biweekly)' },
  { icon: '⚠️', text: 'Confirm 2025 HAF program impact with CPA — may affect prior year property tax deductibility' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtPct(n: number) {
  return (n * 100).toFixed(1) + '%'
}

function daysUntil(isoDate: string): number {
  const now = new Date()
  const target = new Date(isoDate)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function statusBadge(status: TaxYear['status']) {
  if (status === 'filed')     return { label: 'FILED', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.3)',   color: '#22c55e' }
  if (status === 'estimated') return { label: 'ESTIMATED', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b' }
  return                             { label: 'PROJECTED', bg: 'rgba(0,212,255,0.12)',  border: 'rgba(0,212,255,0.25)', color: '#00D4FF' }
}

// ─── Sub-components ────────────────────────────────────────────────────────

function KPI({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-xl font-extrabold" style={{ color: accent ? '#00D4FF' : 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
      {children}
    </h2>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function TaxCenterTab() {
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({})

  const allYears = useMemo(() => [...TAX_HISTORY, PROJECTED_2026], [])
  const selected = useMemo(() => allYears.find(y => y.year === selectedYear) ?? TAX_HISTORY[TAX_HISTORY.length - 1], [allYears, selectedYear])

  const chartData = useMemo(() => allYears.map(y => ({
    year: String(y.year),
    income: Math.round(y.grossIncome / 1000),
    withheld: Math.round(y.federalWithheld / 1000),
    taxOwed: Math.round(y.taxOwed / 1000),
    status: y.status,
  })), [allYears])

  const totalPropertyTax = PROPERTY_TAX_2025.reduce((s, a) => s + a.amount, 0)

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Year Selector ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {allYears.map(y => {
          const b = statusBadge(y.status)
          const active = y.year === selectedYear
          return (
            <button
              key={y.year}
              onClick={() => setSelectedYear(y.year)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: active ? 'rgba(0,212,255,0.18)' : 'var(--card-bg)',
                border: `1px solid ${active ? 'rgba(0,212,255,0.5)' : 'var(--card-border)'}`,
                color: active ? '#00D4FF' : 'var(--text-secondary)',
              }}
            >
              {y.year}
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}` }}
              >
                {b.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Selected Year KPIs ────────────────────────────────────────────── */}
      <div>
        <SectionTitle>{selected.year} Summary</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KPI label="Gross Income"      value={fmt(selected.grossIncome)}     sub={selected.filingStatus + ' · Texas'} accent />
          <KPI label="Federal Withheld"  value={fmt(selected.federalWithheld)} sub="W-2 Box 2 / W-4" />
          <KPI label="Tax Liability"     value={fmt(selected.taxOwed)}         sub={fmtPct(selected.effectiveRate) + ' effective rate'} />
          <KPI
            label={selected.refundOrOwed >= 0 ? 'Refund' : 'Owed to IRS'}
            value={fmt(Math.abs(selected.refundOrOwed))}
            sub={selected.status === 'filed' ? 'Final' : 'Estimate'}
          />
          <KPI label="Deductions"        value={fmt(selected.deductionAmount)} sub={selected.deductionType === 'itemized' ? 'Itemized' : 'Standard'} />
        </div>

        {selected.notes && (
          <div className="mt-3 rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', color: 'var(--text-secondary)' }}>
            📝 {selected.notes}
          </div>
        )}
      </div>

      {/* ── YoY Chart ─────────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Year-Over-Year Overview</SectionTitle>
        <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={2} barCategoryGap="28%">
              <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}K`} width={48} />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [`$${Number(value)}K`, String(name)]}
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="income"   name="Gross Income"     radius={[3,3,0,0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.status === 'projected' ? 'rgba(0,212,255,0.3)' : d.status === 'estimated' ? 'rgba(245,158,11,0.4)' : 'rgba(0,212,255,0.7)'} />
                ))}
              </Bar>
              <Bar dataKey="withheld" name="Withheld"         fill="rgba(30,144,255,0.6)" radius={[3,3,0,0]} />
              <Bar dataKey="taxOwed"  name="Tax Liability"    fill="rgba(239,68,68,0.5)"  radius={[3,3,0,0]} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 8 }} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            🟡 Yellow = estimated · 🔵 Solid blue = filed · Transparent = projected 2026
          </p>
        </div>
      </div>

      {/* ── YoY History Table ─────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Filing History</SectionTitle>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(0,212,255,0.05)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
                {['Year', 'Gross', 'Withheld', 'Tax Owed', 'Balance', 'Eff. Rate', 'Deductions', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allYears.map((y, i) => {
                const b = statusBadge(y.status)
                const owes = y.refundOrOwed < 0
                const isSelected = y.year === selectedYear
                return (
                  <tr
                    key={y.year}
                    onClick={() => setSelectedYear(y.year)}
                    className="cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? 'rgba(0,212,255,0.07)' : i % 2 === 0 ? 'var(--card-bg)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <td className="px-4 py-3 font-bold" style={{ color: '#00D4FF' }}>{y.year}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(y.grossIncome)}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(y.federalWithheld)}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(y.taxOwed)}</td>
                    <td className="px-4 py-3 font-mono font-semibold" style={{ color: owes ? '#f87171' : '#4ade80' }}>
                      {owes ? '−' : '+'}{fmt(Math.abs(y.refundOrOwed))}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{fmtPct(y.effectiveRate)}</td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                      {y.deductionType} · {fmt(y.deductionAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded"
                        style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}` }}>
                        {b.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          * 2021–2024 rows are estimates. Click any row to see the detail summary above. Update with actuals from your returns.
        </p>
      </div>

      {/* ── 2026 Quarterly Payments ───────────────────────────────────────── */}
      <div>
        <SectionTitle>2026 Estimated Tax Payments</SectionTitle>
        <div className="rounded-xl px-4 py-3 mb-4 text-xs leading-relaxed"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
          <strong>W-2 Safe Harbor:</strong> If your new employer withholds enough via W-4 to cover 100% of your 2025 tax liability ($24,891) or 90% of your 2026 liability, quarterly payments are not required. These are useful if you have freelance / consulting income outside of W-2 withholding.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUARTERLY_PAYMENTS_2026.map(q => {
            const days = daysUntil(q.deadline)
            const isPast = days < 0
            const isUrgent = days >= 0 && days <= 14
            const isPaid = paidStatus[q.quarter] ?? q.paid
            const deadlineDate = new Date(q.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

            return (
              <div
                key={q.quarter}
                className="rounded-2xl p-4"
                style={{
                  background: isPaid ? 'rgba(34,197,94,0.08)' : isPast ? 'rgba(239,68,68,0.06)' : 'var(--card-bg)',
                  border: `1px solid ${isPaid ? 'rgba(34,197,94,0.3)' : isPast ? 'rgba(239,68,68,0.2)' : isUrgent ? 'rgba(245,158,11,0.4)' : 'var(--card-border)'}`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-base font-extrabold" style={{ color: '#00D4FF' }}>{q.quarter}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Due {deadlineDate}
                    </div>
                  </div>
                  <button
                    onClick={() => setPaidStatus(p => ({ ...p, [q.quarter]: !p[q.quarter] }))}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      background: isPaid ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isPaid ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: isPaid ? '#22c55e' : 'var(--text-muted)',
                    }}
                  >
                    {isPaid ? '✓ Paid' : 'Mark Paid'}
                  </button>
                </div>

                <div className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {q.amount != null ? fmt(q.amount) : '—'}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {q.amount == null ? 'Amount TBD' : 'estimated due'}
                </div>

                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {isPast ? (
                    <span className="text-[11px] font-semibold text-red-400">Deadline passed</span>
                  ) : (
                    <span className="text-[11px] font-semibold"
                      style={{ color: isUrgent ? '#fbbf24' : 'var(--text-secondary)' }}>
                      {days === 0 ? '⚠️ Due today!' : `${days}d remaining`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Withholding Adequacy Check ────────────────────────────────────── */}
      <div>
        <SectionTitle>2026 Withholding Adequacy</SectionTitle>
        <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            {/* Safe harbor target */}
            <div>
              <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                Safe Harbor Target
              </p>
              <p className="text-2xl font-extrabold" style={{ color: '#00D4FF' }}>{fmt(24_891)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                100% of 2025 liability — no underpayment penalty if you hit this via withholding
              </p>
            </div>

            {/* Monthly needed */}
            <div>
              <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                Monthly Withholding Needed
              </p>
              <p className="text-2xl font-extrabold" style={{ color: '#f59e0b' }}>{fmt(24_891 / 12)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                ~$2,074/mo · biweekly ≈ $958/check
              </p>
            </div>

            {/* SS cap */}
            <div>
              <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                SS Cap Relief (Biweekly)
              </p>
              <p className="text-2xl font-extrabold" style={{ color: '#22c55e' }}>{fmt(176_100)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                2026 SS wage base — net pay increases ~$500/check after cap (~pay period 23 at $180K salary)
              </p>
            </div>
          </div>

          {/* W-4 tip */}
          <div className="mt-4 pt-4 text-xs leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>💡 W-4 Tip:</strong> If you're unsure your withholding covers the target, use Step 4(c) on your W-4 to add a flat additional amount per paycheck (e.g., +$100–200/period). For biweekly pay at $180K, baseline federal withholding should be ~$900–1,100/check — add $100–200 as buffer if no other changes.
          </div>
        </div>
      </div>

      {/* ── Property Tax Breakdown 2025 ───────────────────────────────────── */}
      <div>
        <SectionTitle>Property Tax 2025 — Dallas, TX</SectionTitle>
        <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Donut */}
            <div className="shrink-0">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={PROPERTY_TAX_2025} dataKey="amount" nameKey="auth" cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {PROPERTY_TAX_2025.map((a, i) => <Cell key={i} fill={a.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) => [fmt(Number(value)), '']}
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Total: <strong style={{ color: '#00D4FF' }}>{fmt(totalPropertyTax, 2)}</strong>
              </p>
            </div>

            {/* Table */}
            <div className="flex-1 space-y-2">
              {PROPERTY_TAX_2025.map(a => (
                <div key={a.auth} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.auth}</span>
                      <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{fmt(a.amount, 2)}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.color }} />
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.pct}% of total</div>
                  </div>
                </div>
              ))}

              <div className="pt-2 mt-3 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
                <strong style={{ color: '#fcd34d' }}>⚠️ SALT Note:</strong> Only $10,000 of the $14,595 is deductible under the federal SALT cap (Schedule A). Confirm with CPA whether HAF funds received affected 2025 deductibility.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2026 Key Items ─────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>2026 Tax Planning Checklist</SectionTitle>
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {KEY_ITEMS_2026.map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="text-base shrink-0">{item.icon}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
