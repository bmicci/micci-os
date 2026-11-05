'use client'

import { useState, useMemo } from 'react'
import { estimateReturn, TAX_PLAN_2026_FALLBACK, type TaxPlan2026 } from '@/lib/tax/estimate'
import { SS_WAGE_BASE_2026, STANDARD_DEDUCTION_2026 } from '@/lib/tax'
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

const PROPERTY_TAX_2025: PropertyAuthority[] = [
  { auth: 'Dallas ISD',      amount: 6_211.47, pct: 42.6, color: '#5ee6ff' },
  { auth: 'City of Dallas',  amount: 4_751.84, pct: 32.6, color: '#1E90FF' },
  { auth: 'Dallas County',   amount: 1_465.40, pct: 10.0, color: '#7C3AED' },
  { auth: 'Parkland Hospital', amount: 1_441.60, pct: 9.9, color: '#DB2777' },
  { auth: 'Dallas College',  amount: 724.71,  pct: 5.0,  color: '#F59E0B' },
]

const KEY_ITEMS_2026 = [
  { icon: '🏠', text: 'Pay the 2026 property tax (~$15,000) by Dec 31: the 2026 SALT cap is $40,400, so both 2026 payments deduct — about $3,300 more refund than waiting until January' },
  { icon: '📋', text: 'No estimated payments needed for 2026: every income source had withholding, and withholding already exceeds the projected tax' },
  { icon: '🧾', text: '2026 documents to collect: JPMorgan W-2, Schwab W-2, TWC 1099-G, mortgage 1098, the Dallas County property tax receipt' },
  { icon: '🔁', text: 'Roth conversion in 2026: likely skip — there is no spare cash for the tax. Confirm with your CPA' },
  { icon: '📈', text: '2027 401(k): set the rate after the IRS announces the limit; ~10.6% of base reaches $25,500. Pre-tax saves 24% at your 2027 bracket' },
  { icon: '✍️', text: 'W-4: Schwab withholding assumes the standard deduction; you itemize, so Step 4(b) (confirm with CPA) would raise 2027 paychecks ~$300/mo and shrink the refund' },
  { icon: '🔎', text: 'Ask your CPA: the 2025 return used a $10K SALT cap, but the 2025 cap was raised to $40,000 — an amended 2025 return may recover tax' },
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
  return                             { label: 'PROJECTED', bg: 'rgba(var(--accent-rgb), 0.12)',  border: 'var(--glass-line)', color: '#5ee6ff' }
}

// ─── Sub-components ────────────────────────────────────────────────────────

function KPI({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-xl font-extrabold" style={{ color: accent ? '#5ee6ff' : 'var(--text-primary)' }}>{value}</div>
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

export default function TaxCenterTab({ plan2026 }: { plan2026?: TaxPlan2026 | null }) {
  const plan = plan2026 ?? TAX_PLAN_2026_FALLBACK
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [payDec31, setPayDec31] = useState(plan.payPropertyTaxBy === 'dec31')
  const est = useMemo(() => estimateReturn(plan, payDec31), [plan, payDec31])
  const estJan = useMemo(() => estimateReturn(plan, false), [plan])
  const estDec = useMemo(() => estimateReturn(plan, true), [plan])

  const projected2026: TaxYear = useMemo(() => ({
    year: 2026,
    grossIncome: est.agi,
    federalWithheld: est.withheld,
    taxOwed: est.tax,
    refundOrOwed: est.refund,
    effectiveRate: est.effectiveRate,
    filingStatus: 'Single',
    status: 'projected',
    deductionType: est.usesItemized ? 'itemized' : 'standard',
    deductionAmount: est.deduction,
    notes: `Projected from ${plan.source} (as of ${plan.asOf}). Property tax ${payDec31 ? 'paid by Dec 31, 2026' : 'paid in Jan 2027'}. Update when the W-2s and 1099-G arrive.`,
  }), [est, plan, payDec31])

  const allYears = useMemo(() => [...TAX_HISTORY, projected2026], [projected2026])
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
                background: active ? 'rgba(var(--accent-rgb), 0.18)' : 'var(--card-bg)',
                border: `1px solid ${active ? 'rgba(var(--accent-rgb), 0.5)' : 'var(--card-border)'}`,
                color: active ? '#5ee6ff' : 'var(--text-secondary)',
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
            style={{ background: 'rgba(var(--accent-rgb), 0.06)', border: '1px solid var(--glass-line)', color: 'var(--text-secondary)' }}>
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
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-line)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="income"   name="Gross Income"     radius={[3,3,0,0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.status === 'projected' ? 'rgba(var(--accent-rgb), 0.3)' : d.status === 'estimated' ? 'rgba(245,158,11,0.4)' : 'rgba(var(--accent-rgb), 0.7)'} />
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
              <tr style={{ background: 'rgba(var(--accent-rgb), 0.05)', borderBottom: '1px solid var(--glass-line)' }}>
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
                      background: isSelected ? 'rgba(var(--accent-rgb), 0.07)' : i % 2 === 0 ? 'var(--card-bg)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <td className="px-4 py-3 font-bold" style={{ color: '#5ee6ff' }}>{y.year}</td>
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

      {/* ── 2026 Return Estimate ─────────────────────────────────────────── */}
      <div>
        <SectionTitle>2026 Return Estimate</SectionTitle>
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>2026 property tax (~{fmt(plan.propertyTaxBill2026)}) paid:</span>
            {([[true, `By Dec 31 (${Math.max(0, daysUntil('2026-12-31'))}d left)`], [false, 'In January 2027']] as const).map(([v, label]) => (
              <button key={String(v)} onClick={() => setPayDec31(v)} aria-pressed={payDec31 === v}
                className="text-xs font-semibold px-3 py-2 rounded-lg"
                style={{ background: payDec31 === v ? 'rgba(var(--accent-rgb), 0.15)' : 'rgba(255,255,255,0.06)', color: payDec31 === v ? 'var(--accent-cyan)' : 'var(--text-secondary)', border: '1px solid var(--glass-line)' }}>
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label="Total income (AGI)" value={fmt(est.agi)} />
            <KPI label="Federal tax" value={fmt(est.tax)} sub={`${Math.round(est.marginal * 100)}% bracket`} />
            <KPI label="Already withheld" value={fmt(est.withheld)} />
            <KPI label={est.refund >= 0 ? 'Estimated refund' : 'Estimated owed'} value={fmt(Math.abs(est.refund))} accent sub={`vs ${fmt(payDec31 ? estJan.refund : estDec.refund)} if paid ${payDec31 ? 'in January' : 'by Dec 31'}`} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left py-2 pr-3 font-semibold">Income source</th>
                  <th className="text-right py-2 px-3 font-semibold">Taxable</th>
                  <th className="text-right py-2 pl-3 font-semibold">Withheld</th>
                </tr>
              </thead>
              <tbody>
                {plan.income.map(i => (
                  <tr key={i.label} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td className="py-2 pr-3">
                      <div style={{ color: 'var(--text-primary)' }}>{i.label}</div>
                      {i.note && <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{i.note}</div>}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{fmt(i.taxable)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{fmt(i.withheld)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}>
                  <td className="py-2 pr-3 font-semibold">Total</td>
                  <td className="py-2 px-3 text-right tabular-nums font-semibold">{fmt(est.agi)}</td>
                  <td className="py-2 pl-3 text-right tabular-nums font-semibold">{fmt(est.withheld)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Itemized: {fmt(est.itemized)}</strong> — mortgage interest {fmt(plan.mortgageInterest)} + property tax {fmt(est.salt)} (SALT cap {fmt(plan.saltCap)})</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Standard deduction: {fmt(STANDARD_DEDUCTION_2026.single)}</strong> — itemizing wins by {fmt(Math.max(0, est.itemized - STANDARD_DEDUCTION_2026.single))}</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Taxable income: {fmt(est.taxable)}</strong> — the Dec 31 payment is worth about {fmt(estDec.refund - estJan.refund)} of refund</div>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Estimates only (2026 brackets, single filer, Texas). Source: {plan.source}. Not tax advice; confirm with your CPA.
          </p>
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
                Withheld vs 2026 Tax
              </p>
              <p className="text-2xl font-extrabold" style={{ color: '#5ee6ff' }}>{fmt(est.withheld)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                vs {fmt(est.tax)} projected tax — {est.withheld >= est.tax * 0.9 ? 'covered; no underpayment penalty risk' : 'below 90% of the tax — check withholding'}
              </p>
            </div>

            {/* Monthly needed */}
            <div>
              <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                Schwab Federal Withholding
              </p>
              <p className="text-2xl font-extrabold" style={{ color: '#f59e0b' }}>{fmt((plan.income.find(i => /schwab/i.test(i.label))?.withheld ?? 0) / 3)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                per semi-monthly check (est.) — withholding assumes the standard deduction, which is why the refund is large
              </p>
            </div>

            {/* SS cap */}
            <div>
              <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                SS Cap Relief (Biweekly)
              </p>
              <p className="text-2xl font-extrabold" style={{ color: '#22c55e' }}>{fmt(SS_WAGE_BASE_2026)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                2026 Social Security wage base — not reached at Schwab in 2026; in 2027 it hits around check 20 (October), then net pay rises ~$595/check
              </p>
            </div>
          </div>

          {/* W-4 tip */}
          <div className="mt-4 pt-4 text-xs leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>💡 W-4 Tip:</strong> You are over-withheld because the W-4 assumes the standard deduction while you itemize (~{fmt(est.itemized)}). For 2027, entering the extra deductions in Step 4(b) would raise each paycheck (about $300/mo) and shrink the spring refund. Confirm the amount with your CPA.
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
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-line)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Total: <strong style={{ color: '#5ee6ff' }}>{fmt(totalPropertyTax, 2)}</strong>
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
                <strong style={{ color: '#fcd34d' }}>⚠️ SALT Note:</strong> This $14,595 bill was paid Jan 30, 2026, so it deducts on the 2026 return. The SALT cap is $40,400 for 2026 (it was raised to $40,000 for 2025), so paying the 2026 bill by Dec 31 lets both deduct in 2026. Your 2025 return used a $10K cap — ask your CPA whether an amended 2025 return is worth it.
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
