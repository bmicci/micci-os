'use client'

import type { Subscription, EssentialBill, TopAction } from '@/lib/financial-data'
import { fmt } from '@/lib/financial-data'
import KPICard from './KPICard'
import SubscriptionDonut from './SubscriptionDonut'

export default function SubscriptionsTab({
  cancelSubs,
  reviewSubs,
  essentialBills,
  topActions,
}: {
  cancelSubs: Subscription[]
  reviewSubs: Subscription[]
  essentialBills: EssentialBill[]
  topActions: TopAction[]
}) {
  const cancelTotal = cancelSubs.reduce((s, c) => s + c.mo, 0)
  const reviewTotal = reviewSubs.reduce((s, r) => s + r.mo, 0)
  const essentialTotal = essentialBills.reduce((s, b) => s + b.mo, 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Cancel Now (Monthly)" value={`$${cancelTotal.toFixed(2)}`} note={`${cancelSubs.length} services · $${(cancelTotal * 12).toFixed(0)}/yr`} accent="red" />
        <KPICard label="Under Review (Monthly)" value={`$${reviewTotal.toFixed(2)}`} note={`${reviewSubs.length} services · $${(reviewTotal * 12).toFixed(0)}/yr if all cut`} accent="amber" />
        <KPICard label="Conservative Savings" value={`$${(cancelTotal + reviewTotal * 0.5).toFixed(2)}/mo`} note="Cancels + 50% of reviews cut" accent="green" />
        <KPICard label="Keep (Justified)" value="$36.29/mo" note="3 services — clear ROI" />
        <KPICard label="Recurring Merchants Found" value="102" note="Appearing in 3+ months of 2025" />
      </div>

      {/* Cancel + Review Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cancel Now */}
        <div className="glass-card p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#ef4444' }}>
            🔴 Cancel Now — ${cancelTotal.toFixed(2)}/mo Saved Immediately
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Service</th>
                  <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Monthly</th>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Why Cancel</th>
                </tr>
              </thead>
              <tbody>
                {cancelSubs.map((s, i) => (
                  <tr key={s.name} style={{ borderBottom: i < cancelSubs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{s.name}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold" style={{ color: '#ef4444' }}>${s.mo.toFixed(2)}</td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.reason}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                  <td className="py-3 px-3 font-bold" style={{ color: '#ef4444' }}>TOTAL</td>
                  <td className="py-3 px-3 text-right font-mono font-bold" style={{ color: '#ef4444' }}>${cancelTotal.toFixed(2)}/mo</td>
                  <td className="py-3 px-3 font-bold" style={{ color: '#ef4444' }}>${(cancelTotal * 12).toFixed(2)}/yr</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Under Review */}
        <div className="glass-card p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#f59e0b' }}>
            🟡 Under Review — Up to ${reviewTotal.toFixed(2)}/mo if All Cut
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Service</th>
                  <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Monthly</th>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Decision</th>
                </tr>
              </thead>
              <tbody>
                {reviewSubs.map((s, i) => (
                  <tr key={s.name} style={{ borderBottom: i < reviewSubs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{s.name}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold" style={{ color: '#f59e0b' }}>${s.mo.toFixed(2)}</td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.reason}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                  <td className="py-3 px-3 font-bold" style={{ color: '#f59e0b' }}>TOTAL</td>
                  <td className="py-3 px-3 text-right font-mono font-bold" style={{ color: '#f59e0b' }}>${reviewTotal.toFixed(2)}/mo</td>
                  <td className="py-3 px-3 font-bold" style={{ color: '#f59e0b' }}>${(reviewTotal * 12).toFixed(0)}/yr</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Essential Bills */}
      <div className="glass-card p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          🏠 Essential Recurring Bills — ${essentialTotal.toFixed(2)}/mo (Shop Annually)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {['Bill', 'Category', 'Monthly ($)', 'Annual ($)', 'Optimization Note'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {essentialBills.map((b, i) => (
                <tr key={b.name} style={{ borderBottom: i < essentialBills.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{b.name}</td>
                  <td className="py-2 px-3" style={{ color: 'var(--text-muted)' }}>Bill</td>
                  <td className="py-2 px-3 font-mono font-semibold" style={{ color: '#60a5fa' }}>${b.mo.toFixed(2)}</td>
                  <td className="py-2 px-3 font-mono" style={{ color: '#60a5fa' }}>${b.yr.toFixed(0)}</td>
                  <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>{b.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Donut + Action Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Subscription Spend Breakdown
          </h3>
          <SubscriptionDonut cancelTotal={cancelTotal} reviewTotal={reviewTotal} keepTotal={36.29} />
        </div>

        <div className="glass-card p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            ⚡ Top 5 Fastest Actions This Week
          </h3>
          <div className="space-y-0">
            {topActions.map((a, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 py-2.5"
                style={{ borderBottom: i < topActions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-[15px]">{a.icon}</span> {a.text}
                </div>
                <span className="text-[12px] font-bold shrink-0" style={{ color: '#22c55e' }}>
                  {a.save}
                </span>
              </div>
            ))}
          </div>
          <div
            className="mt-4 p-3 rounded-lg text-[11px]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            📄 Full audit + action checklist:{' '}
            <strong style={{ color: '#60a5fa' }}>Module_2_Subscription_Audit.xlsx</strong> → 💡 Action Plan sheet
          </div>
        </div>
      </div>
    </div>
  )
}
