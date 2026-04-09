'use client'

import { useState, useMemo } from 'react'
import { useHELOCStore } from '@/stores/finance/heloc-store'
import {
  projectBalance,
  calculateConsolidationSavings,
  HELOC_LIMIT,
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
  paid_off: { bg: 'rgba(100,100,100,0.15)', text: '#6b7280', label: 'Paid Off' },
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

const SEED_ACCOUNTS: HELOCDebtAccount[] = [
  { id: '1', userId: '', accountName: 'SoFi Personal Loan', accountType: 'personal_loan', originalBalance: 56958.92, currentBalance: 56246.68, interestRate: 12.41, monthlyPayment: 1464.07, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: 'High-rate, roll to HELOC' },
  { id: '2', userId: '', accountName: 'Wells Fargo (Dad)', accountType: 'personal_loan', originalBalance: 21420, currentBalance: 21420, interestRate: 0, monthlyPayment: 1100, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: '$1,100/mo interest-free' },
  { id: '3', userId: '', accountName: 'Virginia FCU Auto (Dad)', accountType: 'auto_loan', originalBalance: 18600, currentBalance: 18600, interestRate: 9.25, monthlyPayment: 350, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: null },
  { id: '4', userId: '', accountName: 'LightStream Auto Loan', accountType: 'auto_loan', originalBalance: 44018.42, currentBalance: 44018.42, interestRate: 5.87, monthlyPayment: 577.47, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: null },
  { id: '5', userId: '', accountName: 'AmEx Personal Loan', accountType: 'personal_loan', originalBalance: 3942.57, currentBalance: 3558.53, interestRate: 7.33, monthlyPayment: 407.01, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: null },
  { id: '6', userId: '', accountName: 'AmEx Gold Pay Over Time', accountType: 'credit_card', originalBalance: 1930.25, currentBalance: 1930.25, interestRate: 27.49, monthlyPayment: 40, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: null },
  { id: '7', userId: '', accountName: 'AmEx Plat Pay Over Time', accountType: 'credit_card', originalBalance: 513.11, currentBalance: 513.11, interestRate: 27.49, monthlyPayment: 15, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: null },
  { id: '8', userId: '', accountName: 'AmEx Gold Plan It', accountType: 'charge_plan', originalBalance: 1754.20, currentBalance: 1754.20, interestRate: 15.51, monthlyPayment: 182.18, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: null },
  { id: '9', userId: '', accountName: 'AmEx Plat Plan It #1', accountType: 'charge_plan', originalBalance: 2021.80, currentBalance: 2021.80, interestRate: 17.09, monthlyPayment: 230.97, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: null },
  { id: '10', userId: '', accountName: 'AmEx Plat Plan It #2', accountType: 'charge_plan', originalBalance: 2835.58, currentBalance: 2835.58, interestRate: 14.31, monthlyPayment: 270.12, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: null },
  { id: '11', userId: '', accountName: 'Nordstrom', accountType: 'credit_card', originalBalance: 653.43, currentBalance: 653.43, interestRate: 29.40, monthlyPayment: 40, status: 'rolled', rollDate: '2026-03-19', promoExpiry: null, deferredExpiry: null, notes: null },
  { id: '12', userId: '', accountName: 'Chase Freedom Unlimited (7117)', accountType: 'credit_card', originalBalance: 22531, currentBalance: 22306, interestRate: 0, monthlyPayment: 200, status: 'promo_hold', rollDate: null, promoExpiry: '2026-12-01', deferredExpiry: null, notes: '0% promo — pay from HELOC Jul–Dec 2026' },
  { id: '13', userId: '', accountName: 'Chase Freedom (4628)', accountType: 'credit_card', originalBalance: 13269, currentBalance: 13137, interestRate: 0, monthlyPayment: 150, status: 'promo_hold', rollDate: null, promoExpiry: '2026-12-01', deferredExpiry: null, notes: '0% promo — pay from HELOC Aug–Dec 2026' },
  { id: '14', userId: '', accountName: 'Chase Prime Visa (9313)', accountType: 'credit_card', originalBalance: 980.45, currentBalance: 980.45, interestRate: 0, monthlyPayment: 50, status: 'promo_hold', rollDate: null, promoExpiry: '2026-07-22', deferredExpiry: null, notes: '0% promo expires 07/22/2026' },
  { id: '15', userId: '', accountName: 'Citi Diamond (4205)', accountType: 'credit_card', originalBalance: 12475.53, currentBalance: 12242, interestRate: 0, monthlyPayment: 100, status: 'promo_hold', rollDate: null, promoExpiry: '2027-06-18', deferredExpiry: null, notes: 'Longest runway — expires Jun 18, 2027' },
  { id: '16', userId: '', accountName: 'Best Buy Promo 1', accountType: 'deferred_interest', originalBalance: 1312.44, currentBalance: 1312.44, interestRate: 29.99, monthlyPayment: 0, status: 'deferred', rollDate: null, promoExpiry: null, deferredExpiry: '2026-06-27', notes: '⚠ Pay before Jun 27 or owe deferred interest' },
  { id: '17', userId: '', accountName: 'Best Buy Promo 2', accountType: 'deferred_interest', originalBalance: 917.96, currentBalance: 917.96, interestRate: 29.99, monthlyPayment: 0, status: 'deferred', rollDate: null, promoExpiry: null, deferredExpiry: '2026-12-27', notes: '⚠ Pay before Dec 27 or owe deferred interest' },
]

export default function HELOCTracker({ initialAccounts }: { initialAccounts?: HELOCDebtAccount[] }) {
  const store = useHELOCStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  // Hydrate store on first render:
  // 1. Use server-fetched Supabase data if available (initialAccounts)
  // 2. Fall back to SEED_ACCOUNTS if Supabase returned nothing
  useMemo(() => {
    if (!store.hydrated && store.accounts.length === 0) {
      const source =
        initialAccounts && initialAccounts.length > 0 ? initialAccounts : SEED_ACCOUNTS
      store.hydrate(source)
    }
  }, [store, initialAccounts])

  // Use store accounts (always populated after hydration above)
  const accounts =
    store.accounts.length > 0
      ? store.accounts
      : (initialAccounts && initialAccounts.length > 0 ? initialAccounts : SEED_ACCOUNTS)

  const rolled = accounts.filter(a => a.status === 'rolled')
  const promoHold = accounts.filter(a => a.status === 'promo_hold')
  const deferred = accounts.filter(a => a.status === 'deferred')
  // Total draw = the HELOC line's own balance (the vehicle), NOT the sum of rolled items
  const helocLine = accounts.find(a => a.accountType === 'heloc')
  const totalDraw = helocLine ? helocLine.currentBalance : rolled.reduce((s, a) => s + a.currentBalance, 0)
  const remaining = HELOC_LIMIT - totalDraw
  const monthlyInterest = (totalDraw * 0.0685) / 12

  const savings = calculateConsolidationSavings(
    rolled.filter(a => a.interestRate > 0).map(a => ({
      balance: a.currentBalance,
      monthlyPayment: a.monthlyPayment,
      rate: a.interestRate,
    })),
    0.0685,
  )

  const projData = useMemo(() => {
    const promoDraws = promoHold.map(a => ({
      monthOffset: 4, // ~Jul 2026
      amount: a.currentBalance,
      label: a.accountName,
    }))
    return projectBalance(totalDraw, 0.0685, monthlyInterest + 500, 15, promoDraws)
  }, [totalDraw, monthlyInterest, promoHold])

  function handleBalanceSave(id: string) {
    const v = parseFloat(editVal.replace(/[^0-9.]/g, ''))
    if (!isNaN(v)) {
      store.updateAccountBalance(id, v)
    }
    setEditId(null)
  }

  return (
    <div className="flex flex-col min-h-full p-6 gap-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total HELOC Draw" value={fmt(totalDraw)} accent />
        <KpiCard label="Remaining Availability" value={fmt(remaining)} />
        <KpiCard label="Monthly Interest" value={fmt(monthlyInterest)} />
        <KpiCard label="Monthly Cash Flow Relief" value={fmt(savings.monthlyRelief)} positive />
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
        <BalanceTimeline data={projData} limit={HELOC_LIMIT} />
      )}

      {tab === 'deadlines' && (
        <DeadlineDashboard deferred={deferred} promoHold={promoHold} />
      )}

      {tab === 'savings' && (
        <SavingsAnalysisView savings={savings} helocRate={0.0685} />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function KpiCard({ label, value, accent, positive }: { label: string; value: string; accent?: boolean; positive?: boolean }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl"
      style={{ background: accent ? 'rgba(0,212,255,0.08)' : 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
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
                        {isEditing ? (
                          <input
                            type="number"
                            value={editVal}
                            onChange={e => onEditChange(e.target.value)}
                            onBlur={() => onEditSave(acct.id)}
                            onKeyDown={e => e.key === 'Enter' && onEditSave(acct.id)}
                            className="w-28 px-2 py-1 rounded text-xs font-mono"
                            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--text-primary)', outline: 'none' }}
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
                        {deadline && days !== null ? (
                          <span className="text-xs font-mono"
                            style={{ color: days < 30 ? '#ef4444' : days < 90 ? '#f59e0b' : 'var(--text-muted)' }}>
                            {days > 0 ? `${days}d` : 'Past due'}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
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

function BalanceTimeline({ data, limit }: { data: { label: string; balance: number }[]; limit: number }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
        HELOC Balance Projection (15 months)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="helocGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fill: 'rgba(240,246,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtK} tick={{ fill: 'rgba(240,246,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            formatter={(v: unknown) => [fmt(Number(v)), 'Balance']}
            contentStyle={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, fontSize: 12 }}
          />
          <ReferenceLine y={limit} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '$190K Limit', fill: '#ef4444', fontSize: 10 }} />
          <Area type="monotone" dataKey="balance" stroke="#00d4ff" fill="url(#helocGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        Promo card balances roll in ~Jul 2026. Balance rises before paydown accelerates.
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
        const borderColor = urgency === 'critical' ? '#ef4444' : urgency === 'high' ? '#f59e0b' : 'rgba(0,212,255,0.3)'
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
