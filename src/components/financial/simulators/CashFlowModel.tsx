'use client'

import { useState, useMemo } from 'react'
import { useCashFlowStore } from '@/stores/finance/cashflow-store'
import { usePaycheckStore } from '@/stores/finance/paycheck-store'
import { useHELOCStore } from '@/stores/finance/heloc-store'
import { project12Months } from '@/lib/finance/cashflow'
import CurrencyInput from '@/components/financial/shared/CurrencyInput'
import WaterfallChart from '@/components/financial/shared/WaterfallChart'
import type { WaterfallItem } from '@/components/financial/shared/WaterfallChart'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { ExpenseLineItem, AllocationBucket } from '@/types/finance'

function fmt(v: number) {
  return '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

type Tab = 'waterfall' | 'allocation' | 'projection'

export default function CashFlowModel() {
  const store = useCashFlowStore()
  const paycheckResult = usePaycheckStore(s => s.result)
  const paycheckInputs = usePaycheckStore(s => s.inputs)
  const helocStore = useHELOCStore()
  const result = store.result
  const [tab, setTab] = useState<Tab>('waterfall')
  const [newExpenseLabel, setNewExpenseLabel] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState(0)

  const waterfallItems: WaterfallItem[] = result ? [
    { label: 'Net Income', value: result.totalIncome, type: 'income' },
    { label: 'HELOC Interest', value: -store.helocMonthlyInterest, type: 'obligation' },
    ...(store.promoMinimums > 0 ? [{ label: 'Promo Mins', value: -store.promoMinimums, type: 'obligation' as const }] : []),
    ...(store.deferredPayments > 0 ? [{ label: 'Deferred Pmts', value: -store.deferredPayments, type: 'obligation' as const }] : []),
    ...store.expenses.filter(e => e.amount > 0).map(e => ({
      label: e.category,
      value: -e.amount,
      type: 'expense' as const,
    })),
    { label: 'Free Cash', value: result.freeCash, type: 'net' },
  ] : []

  const projection12 = useMemo(() => {
    if (!paycheckResult || !result) return []
    const scheduledEvents = [
      { monthOffset: 4, label: 'Chase promos roll to HELOC', amountDelta: 500 },
      { monthOffset: 3, label: 'Best Buy promo deadline', amountDelta: 200 },
    ]
    return project12Months({
      baseCashFlow: {
        netPayPerPeriod: store.netPayPerPeriod,
        payFrequency: store.payFrequency,
        helocMonthlyInterest: store.helocMonthlyInterest,
        promoMinimums: store.promoMinimums,
        deferredPayments: store.deferredPayments,
        expenses: store.expenses,
        allocations: store.allocations,
      },
      ssCapPeriod: paycheckResult.ssCapPeriod,
      payFrequency: paycheckInputs.payFrequency,
      grossPayPerPeriod: paycheckResult.grossPay,
      ssPerPeriodSavings: paycheckResult.socialSecurity,
      scheduledEvents,
    })
  }, [paycheckResult, result, store, paycheckInputs.payFrequency])

  function addCustomExpense() {
    if (!newExpenseLabel.trim() || newExpenseAmount <= 0) return
    const id = `custom-${Date.now()}`
    store.addExpense({ id, category: 'Custom', label: newExpenseLabel, amount: newExpenseAmount, isCustom: true })
    setNewExpenseLabel('')
    setNewExpenseAmount(0)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* ── Left: Expenses ── */}
      <aside className="lg:w-72 shrink-0 flex flex-col gap-4">
        <h2 className="text-sm font-semibold gradient-text">Monthly Expenses</h2>

        {/* Cross-module inputs (read-only) */}
        <div className="p-4 rounded-xl" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}>
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-cyan)' }}>
            From Other Simulators
          </div>
          <div className="flex flex-col gap-2">
            <CrossRow label="Net Income / mo" value={result?.totalIncome ?? 0} />
            <CrossRow label="HELOC Interest" value={store.helocMonthlyInterest} negative />
            {store.promoMinimums > 0 && <CrossRow label="Promo Minimums" value={store.promoMinimums} negative />}
            {store.deferredPayments > 0 && <CrossRow label="Deferred Payments" value={store.deferredPayments} negative />}
          </div>
        </div>

        {/* Editable expenses */}
        <div className="flex flex-col gap-2">
          {store.expenses.map(exp => (
            <ExpenseRow
              key={exp.id}
              expense={exp}
              onChange={v => store.updateExpense(exp.id, v)}
              onRemove={exp.isCustom ? () => store.removeExpense(exp.id) : undefined}
            />
          ))}
        </div>

        {/* Add custom */}
        <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Add Custom Expense</div>
          <input
            type="text"
            placeholder="Label"
            value={newExpenseLabel}
            onChange={e => setNewExpenseLabel(e.target.value)}
            className="px-3 py-1.5 rounded text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <CurrencyInput value={newExpenseAmount} onChange={setNewExpenseAmount} />
          <button
            onClick={addCustomExpense}
            className="text-xs py-1.5 rounded-lg"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--accent-cyan)' }}
          >
            + Add
          </button>
        </div>
      </aside>

      {/* ── Right: Output ── */}
      <main className="flex-1 min-w-0">
        {/* KPI Strip */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <KpiBox label="Monthly Income" value={fmt(result.totalIncome)} />
            <KpiBox label="Total Obligations" value={fmt(result.totalObligations)} negative />
            <KpiBox label="Living Expenses" value={fmt(result.totalLivingExpenses)} negative />
            <KpiBox label="Free Cash" value={fmt(result.freeCash)} accent positive={result.freeCash >= 0} />
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 mb-5">
          {(['waterfall', 'allocation', 'projection'] as Tab[]).map(t => (
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
              {t === 'waterfall' ? 'Flow Waterfall' : t === 'allocation' ? 'Allocation' : '12-Month Projection'}
            </button>
          ))}
        </div>

        {tab === 'waterfall' && (
          <div className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <WaterfallChart items={waterfallItems} height={280} />
          </div>
        )}

        {tab === 'allocation' && result && (
          <AllocationView result={result} allocations={store.allocations} onUpdateAllocation={store.updateAllocation} />
        )}

        {tab === 'projection' && (
          <ProjectionView data={projection12} />
        )}
      </main>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function CrossRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-mono font-medium"
        style={{ color: negative ? '#ef4444' : '#22c55e' }}>
        {negative ? '−' : '+'}{fmt(value)}
      </span>
    </div>
  )
}

function ExpenseRow({ expense, onChange, onRemove }: {
  expense: ExpenseLineItem
  onChange: (v: number) => void
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <CurrencyInput
          label={expense.label}
          value={expense.amount}
          onChange={onChange}
          max={50_000}
        />
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-xs px-2 py-1 rounded self-end mb-0.5"
          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          ×
        </button>
      )}
    </div>
  )
}

function KpiBox({ label, value, accent, positive, negative }: {
  label: string; value: string; accent?: boolean; positive?: boolean; negative?: boolean;
}) {
  const color = accent ? (positive ? 'var(--accent-cyan)' : '#ef4444') : negative ? '#ef4444' : 'var(--text-primary)'
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl"
      style={{ background: accent ? 'rgba(0,212,255,0.06)' : 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-base font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  )
}

function AllocationView({ result, allocations, onUpdateAllocation }: {
  result: { freeCash: number }
  allocations: AllocationBucket[]
  onUpdateAllocation: (id: string, percent: number) => void
}) {
  const totalPct = allocations.reduce((s: number, a: AllocationBucket) => s + a.percent, 0)
  const ALLOC_COLORS = ['#00d4ff', '#22c55e', '#f59e0b', '#a78bfa']

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {[...allocations].sort((a: AllocationBucket, b: AllocationBucket) => a.sortOrder - b.sortOrder).map((bucket: AllocationBucket, i: number) => {
          const amount = result.freeCash * (bucket.percent / 100)
          return (
            <div key={bucket.id} className="p-4 rounded-xl"
              style={{ background: 'var(--card-bg)', border: `1px solid ${ALLOC_COLORS[i % ALLOC_COLORS.length]}33` }}>
              <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{bucket.label}</div>
              <div className="text-xl font-bold font-mono" style={{ color: ALLOC_COLORS[i % ALLOC_COLORS.length] }}>
                {fmt(amount)}
              </div>
              <div className="mt-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={bucket.percent}
                  onChange={e => onUpdateAllocation(bucket.id, Number(e.target.value))}
                  className="w-full h-1.5 appearance-none rounded-full"
                  style={{ background: `linear-gradient(to right, ${ALLOC_COLORS[i % ALLOC_COLORS.length]} ${bucket.percent}%, rgba(255,255,255,0.1) ${bucket.percent}%)` }}
                />
                <div className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{bucket.percent}%</div>
              </div>
            </div>
          )
        })}
      </div>
      {totalPct !== 100 && (
        <div className="text-xs p-2 rounded text-center"
          style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
          Allocations total {totalPct}% — adjust to equal 100%
        </div>
      )}
    </div>
  )
}

function ProjectionView({ data }: { data: ReturnType<typeof project12Months> }) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>
        Set paycheck inputs first to see your 12-month projection.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Line chart */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Free Cash + Cumulative Savings (12 months)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(240,246,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} tick={{ fill: 'rgba(240,246,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              formatter={(v: unknown) => [fmt(Number(v))]}
              contentStyle={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            <Line type="monotone" dataKey="freeCash" stroke="#00d4ff" name="Free Cash" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cumulativeSavings" stroke="#22c55e" name="Cumulative" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              {['Month', 'Income', 'Obligations', 'Living Exp', 'Free Cash', 'Cumulative', 'Events'].map(h => (
                <th key={h} className="px-3 py-2 text-left uppercase tracking-wider"
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                className="hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2 font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{row.month}</td>
                <td className="px-3 py-2 font-mono" style={{ color: '#22c55e' }}>{fmt(row.income)}</td>
                <td className="px-3 py-2 font-mono" style={{ color: '#f59e0b' }}>{fmt(row.obligations)}</td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(row.livingExpenses)}</td>
                <td className="px-3 py-2 font-mono font-bold"
                  style={{ color: row.freeCash >= 0 ? 'var(--accent-cyan)' : '#ef4444' }}>
                  {fmt(row.freeCash)}
                </td>
                <td className="px-3 py-2 font-mono" style={{ color: '#22c55e' }}>{fmt(row.cumulativeSavings)}</td>
                <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                  {row.events.map((e, j) => (
                    <span key={j} className="inline-block text-[10px] px-1.5 py-0.5 rounded mr-1"
                      style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                      {e}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
