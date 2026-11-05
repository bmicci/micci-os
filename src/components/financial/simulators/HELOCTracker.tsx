'use client'

import { useState, useMemo } from 'react'
import { useHELOCStore } from '@/stores/finance/heloc-store'
import {
  projectBalance,
  calculateConsolidationSavings,
  HELOC_LIMIT,
  HELOC_RATE,
} from '@/lib/finance/heloc'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { HELOCDebtAccount } from '@/types/finance'

const STATUS_COLORS: Record<HELOCDebtAccount['status'], { bg: string; text: string; label: string }> = {
  rolled: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: 'Rolled' },
  promo_hold: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', label: '0% Promo' },
  deferred: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'Deferred ⚠' },
  keep: { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa', label: 'Keep' },
  paid_off: { bg: 'rgba(100,100,100,0.15)', text: '#9ca3af', label: 'Paid off' },
}

type Tab = 'overview' | 'timeline' | 'deadlines' | 'savings'

function fmtK(v: number) {
  return '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0))
}

function fmt(v: number) {
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
}

// ── Bug 4: Historical accounts paid off via the initial HELOC draw ──────────
// These are permanently paid-off and won't appear in the debt_accounts table,
// so we hardcode them here for display and cash-flow-relief calculations.
const HISTORICAL_PAID_OFF_VIA_HELOC: HELOCDebtAccount[] = [
  {
    id: 'hist-1', userId: '', accountName: 'SoFi Personal Loan',
    accountType: 'personal_loan', originalBalance: 57813, currentBalance: 0,
    interestRate: 12.41, monthlyPayment: 1464,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026',
  },
  {
    id: 'hist-2', userId: '', accountName: 'LightStream Auto Loan',
    accountType: 'auto_loan', originalBalance: 44463, currentBalance: 0,
    interestRate: 5.87, monthlyPayment: 577,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026',
  },
  {
    id: 'hist-3', userId: '', accountName: 'Wells Fargo (Dad)',
    accountType: 'personal_loan', originalBalance: 20000, currentBalance: 0,
    interestRate: 0, monthlyPayment: 600,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026 (interest-free family loan)',
  },
  {
    id: 'hist-4', userId: '', accountName: 'AmEx Personal Loan',
    accountType: 'personal_loan', originalBalance: 3707, currentBalance: 0,
    interestRate: 7.33, monthlyPayment: 407,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026',
  },
  {
    id: 'hist-6', userId: '', accountName: 'Nordstrom',
    accountType: 'credit_card', originalBalance: 653, currentBalance: 0,
    interestRate: 29.40, monthlyPayment: 40,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026',
  },
  {
    id: 'hist-7', userId: '', accountName: 'AmEx Gold Pay Over Time',
    accountType: 'credit_card', originalBalance: 1930, currentBalance: 0,
    interestRate: 27.49, monthlyPayment: 40,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026',
  },
  {
    id: 'hist-8', userId: '', accountName: 'AmEx Plat Pay Over Time',
    accountType: 'credit_card', originalBalance: 513, currentBalance: 0,
    interestRate: 27.49, monthlyPayment: 15,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026',
  },
  {
    id: 'hist-9', userId: '', accountName: 'AmEx Gold Plan It',
    accountType: 'charge_plan', originalBalance: 1754, currentBalance: 0,
    interestRate: 15.51, monthlyPayment: 182,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026',
  },
  {
    id: 'hist-10', userId: '', accountName: 'AmEx Plat Plan It #1',
    accountType: 'charge_plan', originalBalance: 2021, currentBalance: 0,
    interestRate: 17.09, monthlyPayment: 231,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026',
  },
  {
    id: 'hist-11', userId: '', accountName: 'AmEx Plat Plan It #2',
    accountType: 'charge_plan', originalBalance: 2835, currentBalance: 0,
    interestRate: 14.31, monthlyPayment: 270,
    status: 'paid_off', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null,
    notes: 'Paid off via HELOC draw Mar 2026',
  },
]

// Names of historical accounts — used to avoid double-counting when live Supabase
// data happens to include a zero-balance version of the same account.
const HISTORICAL_NAMES = new Set(HISTORICAL_PAID_OFF_VIA_HELOC.map(a => a.accountName))

// Bug 3: pre-computed sum of all old minimum payments for cash-flow-relief KPI.
const HISTORICAL_MONTHLY_MINIMUMS = HISTORICAL_PAID_OFF_VIA_HELOC.reduce(
  (s, a) => s + a.monthlyPayment, 0,
)

export default function HELOCTracker({ initialAccounts }: { initialAccounts?: HELOCDebtAccount[] }) {
  const store = useHELOCStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  const [extra, setExtra] = useState(0)

  // Hydrate the store from the server-fetched accounts (no sample-data fallback:
  // an empty table shows an empty state instead of made-up balances).
  useMemo(() => {
    if (!store.hydrated && store.accounts.length === 0 && initialAccounts && initialAccounts.length > 0) {
      store.hydrate(initialAccounts)
    }
  }, [store, initialAccounts])

  // When real Supabase data is available, paid-off accounts won't be in the DB.
  // We detect "live mode" so we can inject hardcoded historical accounts.
  const usingLiveData = !!(initialAccounts && initialAccounts.length > 0)

  // Use store accounts (always populated after hydration above)
  const rawAccounts = store.accounts.length > 0 ? store.accounts : (initialAccounts ?? [])

  // Bug 4: In live mode, filter out any zero-balance duplicates that might exist
  // in Supabase, then append the canonical hardcoded historical accounts.
  const accounts = usingLiveData
    ? [
        ...rawAccounts.filter(a => !HISTORICAL_NAMES.has(a.accountName)),
        ...HISTORICAL_PAID_OFF_VIA_HELOC,
      ]
    : rawAccounts

  const promoHold = accounts.filter(a => a.status === 'promo_hold')
  const deferred = accounts.filter(a => a.status === 'deferred')
  // Total draw = the HELOC line's own balance (the vehicle), NOT the sum of rolled items
  const helocLine = accounts.find(a => a.accountType === 'heloc')
  const rolledFallback = accounts.filter(a => a.status === 'rolled')
  const totalDraw = helocLine
    ? helocLine.currentBalance
    : rolledFallback.reduce((s, a) => s + a.currentBalance, 0)
  const remaining = HELOC_LIMIT - totalDraw
  // Variable rate: use the HELOC row's current rate (stored as a percent)
  const rate = helocLine && helocLine.interestRate > 0 ? helocLine.interestRate / 100 : HELOC_RATE
  const monthlyInterest = (totalDraw * rate) / 12
  const helocPayment = helocLine?.monthlyPayment && helocLine.monthlyPayment > 0 ? helocLine.monthlyPayment : monthlyInterest

  // Bug 3: Cash-flow relief = what we used to pay on all rolled-in accounts
  // minus the current HELOC monthly interest-only payment.
  // Using HISTORICAL_MONTHLY_MINIMUMS ensures the figure is always correct
  // regardless of whether those accounts are still in the DB.
  const cashFlowRelief = Math.max(0, Math.round(HISTORICAL_MONTHLY_MINIMUMS - monthlyInterest))

  const savings = calculateConsolidationSavings(
    rolledFallback.filter(a => a.interestRate > 0).map(a => ({
      balance: a.currentBalance,
      monthlyPayment: a.monthlyPayment,
      rate: a.interestRate,
    })),
    rate,
  )

  // Plan v5: promos are paid from cash (the line has little room left), so the
  // timeline is the HELOC itself paid down at the current payment + any extra.
  const projData = useMemo(
    () => projectBalance(totalDraw, rate, helocPayment + extra, 36),
    [totalDraw, rate, helocPayment, extra],
  )
  const payoffIdx = projData.findIndex((p, i) => i > 0 && p.balance <= 0)

  function handleBalanceSave(id: string) {
    const v = parseFloat(editVal.replace(/[^0-9.]/g, ''))
    if (!isNaN(v)) {
      store.updateAccountBalance(id, v)
    }
    setEditId(null)
  }

  if (accounts.length === 0) {
    return (
      <div className="p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
        No debt accounts loaded. Check the Supabase connection — this page no longer falls back to sample data.
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full p-4 md:p-6 gap-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total HELOC Draw" value={fmt(totalDraw)} accent />
        <KpiCard label="Remaining Availability" value={fmt(remaining)} />
        <KpiCard label="Monthly Interest" value={fmt(monthlyInterest)} />
        <KpiCard label="Monthly Cash Flow Relief" value={fmt(cashFlowRelief)} positive />
      </div>
      <div className="text-[11px] -mt-3" style={{ color: 'var(--text-muted)' }}>
        Rate {(rate * 100).toFixed(2)}% (variable — update the HELOC row when it changes) · payment {fmt(helocPayment)}/mo
      </div>

      {/* Tab nav */}
      <div className="flex gap-1">
        {(['overview', 'timeline', 'deadlines', 'savings'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
            style={{
              background: tab === t ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
              color: tab === t ? '#050505' : 'var(--text-secondary)',
              border: 'none',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <AccountTable
          accounts={accounts}
          editId={editId}
          editVal={editVal}
          onEditStart={(id, val) => { setEditId(id); setEditVal(String(val)) }}
          onEditChange={setEditVal}
          onEditSave={handleBalanceSave}
          onStatusChange={(id, status) => store.updateAccountStatus(id, status)}
        />
      )}

      {tab === 'timeline' && (
        <BalanceTimeline data={projData} limit={HELOC_LIMIT} payment={helocPayment} extra={extra}
          onExtra={setExtra} payoffLabel={payoffIdx > 0 ? projData[payoffIdx].label : null} />
      )}

      {tab === 'deadlines' && (
        <DeadlineDashboard deferred={deferred} promoHold={promoHold} />
      )}

      {tab === 'savings' && (
        <SavingsAnalysisView savings={savings} helocRate={rate} />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function KpiCard({ label, value, accent, positive }: { label: string; value: string; accent?: boolean; positive?: boolean }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl"
      style={{ background: accent ? 'rgba(var(--accent-rgb), 0.08)' : 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-lg font-bold font-mono" style={{ color: accent ? 'var(--accent-cyan)' : positive ? '#22c55e' : 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function AccountTable({
  accounts, editId, editVal,
  onEditStart, onEditChange, onEditSave, onStatusChange,
}: {
  accounts: HELOCDebtAccount[]
  editId: string | null
  editVal: string
  onEditStart: (id: string, val: number) => void
  onEditChange: (v: string) => void
  onEditSave: (id: string) => void
  onStatusChange: (id: string, status: HELOCDebtAccount['status']) => void
}) {
  const groups: Record<string, HELOCDebtAccount[]> = {
    deferred: accounts.filter(a => a.status === 'deferred'),
    promo_hold: accounts.filter(a => a.status === 'promo_hold'),
    rolled: accounts.filter(a => a.status === 'rolled'),
    keep: accounts.filter(a => a.status === 'keep'),
    paid_off: accounts.filter(a => a.status === 'paid_off'),
  }

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(groups).filter(([, list]) => list.length > 0).map(([key, list]) => {
        const sc = STATUS_COLORS[key as HELOCDebtAccount['status']]
        const total = list.reduce((s, a) => s + a.currentBalance, 0)
        return (
          <div key={key} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between px-4 py-2"
              style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-xs font-semibold"
                style={{ color: sc.text }}>
                {sc.label}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {fmt(total)} total
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Account', 'Balance', 'Rate', 'Min Pmt', 'Deadline', ''].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(acct => {
                  const deadline = acct.deferredExpiry ?? acct.promoExpiry
                  const days = daysUntil(deadline)
                  const isEditing = editId === acct.id
                  return (
                    <tr key={acct.id} className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-primary)' }}>
                        {acct.accountName}
                      </td>
                      <td className="px-4 py-2.5">
                        {acct.status === 'paid_off' ? (
                          // Show original rolled-in balance struck through for historical context
                          <span className="font-mono text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                            {fmt(acct.originalBalance)}
                          </span>
                        ) : isEditing ? (
                          <input
                            type="number"
                            value={editVal}
                            onChange={e => onEditChange(e.target.value)}
                            onBlur={() => onEditSave(acct.id)}
                            onKeyDown={e => e.key === 'Enter' && onEditSave(acct.id)}
                            className="w-28 px-2 py-1 rounded text-xs font-mono"
                            style={{ background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--text-primary)', outline: 'none' }}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => onEditStart(acct.id, acct.currentBalance)}
                            className="font-mono text-sm font-medium hover:underline"
                            style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {fmt(acct.currentBalance)}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: acct.interestRate > 10 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {acct.interestRate === 0 ? '0%' : acct.interestRate.toFixed(2) + '%'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {acct.monthlyPayment > 0 ? fmt(acct.monthlyPayment) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {deadline ? (() => {
                          const urgencyColor = days !== null && days < 30
                            ? '#ef4444'
                            : days !== null && days < 90
                              ? '#f59e0b'
                              : 'var(--text-muted)'
                          // Parse as local date to avoid UTC-offset display shift
                          const d = new Date(deadline + 'T00:00:00')
                          const label = d.toLocaleDateString('en-US', {
                            month: '2-digit', day: '2-digit', year: '2-digit',
                          })
                          return (
                            <span className="text-xs font-mono" style={{ color: urgencyColor }}>
                              {label}
                              {days !== null && (
                                <span className="text-[9px] ml-1 opacity-60">
                                  ({days > 0 ? `${days}d` : '!'})
                                </span>
                              )}
                            </span>
                          )
                        })() : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: sc.bg, color: sc.text }}>
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function BalanceTimeline({ data, limit, payment, extra, onExtra, payoffLabel }: {
  data: { label: string; balance: number }[]; limit: number; payment: number; extra: number
  onExtra: (v: number) => void; payoffLabel: string | null
}) {
  const end = data[data.length - 1]?.balance ?? 0
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          HELOC balance — next 3 years
        </h3>
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Extra principal / mo
          <input type="range" min={0} max={5000} step={100} value={extra} onChange={e => onExtra(Number(e.target.value))} aria-label="Extra principal per month" />
          <span className="font-mono w-14 text-right" style={{ color: 'var(--text-primary)' }}>{fmt(extra)}</span>
        </label>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="helocGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5ee6ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#5ee6ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtK} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            formatter={(v: unknown) => [fmt(Number(v)), 'Balance']}
            contentStyle={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(var(--accent-rgb), 0.3)', borderRadius: 8, fontSize: 12 }}
          />
          <ReferenceLine y={limit} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `${fmtK(limit)} limit`, fill: '#ef4444', fontSize: 10 }} />
          <Area type="monotone" dataKey="balance" stroke="#5ee6ff" fill="url(#helocGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        Paying {fmt(payment + extra)}/mo{extra > 0 ? ` (${fmt(payment)} payment + ${fmt(extra)} extra)` : ''}:{' '}
        {payoffLabel ? `paid off by ${payoffLabel}.` : `${fmt(end)} left after 3 years.`}{' '}
        Promo cards are paid from cash under plan v5, not rolled onto the line.
      </p>
    </div>
  )
}

function DeadlineDashboard({ deferred, promoHold }: { deferred: HELOCDebtAccount[]; promoHold: HELOCDebtAccount[] }) {
  const allDeadlines = [
    ...deferred.map(a => ({ name: a.accountName, date: a.deferredExpiry!, balance: a.currentBalance, type: 'deferred' as const, apr: a.interestRate })),
    ...promoHold.map(a => ({ name: a.accountName, date: a.promoExpiry!, balance: a.currentBalance, type: 'promo' as const, apr: a.interestRate })),
  ].filter(d => d.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="flex flex-col gap-3">
      {allDeadlines.map(d => {
        const days = daysUntil(d.date)
        const urgency = days !== null ? (days < 30 ? 'critical' : days < 90 ? 'high' : 'medium') : 'low'
        const borderColor = urgency === 'critical' ? '#ef4444' : urgency === 'high' ? '#f59e0b' : 'rgba(var(--accent-rgb), 0.3)'
        const isDeferred = d.type === 'deferred'
        const penalty = isDeferred ? d.balance * (d.apr / 100) * (days ?? 0) / 365 : null

        return (
          <div key={d.name} className="p-4 rounded-xl"
            style={{ background: 'var(--card-bg)', borderLeft: `4px solid ${borderColor}`, border: `1px solid ${borderColor}` }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{d.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {isDeferred ? '⚠ Deferred Interest' : '0% Promo'} · {fmt(d.balance)} balance
                </div>
                {penalty !== null && penalty > 0 && (
                  <div className="text-xs mt-1" style={{ color: '#ef4444' }}>
                    Back-interest if missed: ~{fmt(penalty)} at {d.apr}% APR
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-lg font-bold" style={{ color: borderColor }}>
                  {days !== null ? (days > 0 ? `${days}d` : 'PAST DUE') : '—'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import type { SavingsAnalysis } from '@/lib/finance/heloc'

function SavingsAnalysisView({ savings, helocRate }: { savings: SavingsAnalysis; helocRate: number }) {
  const rows = [
    { label: 'Total Rolled Balance', value: fmt(savings.totalRolledBalance), color: 'var(--text-primary)' },
    { label: 'Old Monthly Payments (pre-HELOC)', value: fmt(savings.oldMonthlyPayment), color: '#ef4444' },
    { label: `New HELOC Interest (${(helocRate * 100).toFixed(2)}% interest-only)`, value: fmt(savings.newMonthlyInterest), color: '#f59e0b' },
    { label: 'Monthly Cash Flow Relief', value: fmt(savings.monthlyRelief), color: '#22c55e' },
    { label: 'Annual Cash Flow Relief', value: fmt(savings.annualRelief), color: '#22c55e' },
    { label: 'Year 1 Interest Saved', value: fmt(savings.totalInterestSavedYear1), color: 'var(--accent-cyan)' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="p-5 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Consolidation Savings Analysis
        </h3>
        <div className="flex flex-col gap-1">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between py-2 px-3 rounded"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
              <span className="font-mono text-sm font-bold" style={{ color: r.color }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl text-sm"
        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
        <strong>Bottom line:</strong> Rolling high-rate debt into the HELOC saves ~{fmt(savings.monthlyRelief)}/month in cash flow
        and ~{fmt(savings.totalInterestSavedYear1)} in interest in year 1.
      </div>
    </div>
  )
}
