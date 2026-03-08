'use client'

import type { TaxSnapshot } from '@/lib/financial-data'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function TaxSnapshotCard({ taxSnapshot: t }: { taxSnapshot: TaxSnapshot }) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        2025 Tax Snapshot
      </div>

      {/* W-2 summary row */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[160px] rounded-xl px-4 py-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>W-2 Income</div>
          <div className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{fmt(t.w2Income)}</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Box 1 · JPMC 2025</div>
        </div>
        <div className="flex-1 min-w-[160px] rounded-xl px-4 py-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Federal Withheld</div>
          <div className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{fmt(t.federalWithheld)}</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Box 2 · YTD</div>
        </div>
        <div className="flex-1 min-w-[160px] rounded-xl px-4 py-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Filing Deadline</div>
          <div className="text-lg font-extrabold" style={{ color: '#f59e0b' }}>{t.filingDeadline}</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Federal return due</div>
        </div>
      </div>

      {/* Scenario cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Scenario A */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div className="text-[11px] font-bold mb-1" style={{ color: '#ef4444' }}>
            Scenario A — {t.scenarioA.label}
          </div>
          <div className="text-2xl font-extrabold mb-1" style={{ color: '#ef4444' }}>
            {fmt(t.scenarioA.owed)} owed
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.scenarioA.note}</div>
        </div>

        {/* Scenario B */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <div className="text-[11px] font-bold mb-1" style={{ color: '#22c55e' }}>
            Scenario B — {t.scenarioB.label}
          </div>
          <div className="text-2xl font-extrabold mb-1" style={{ color: '#22c55e' }}>
            {fmt(t.scenarioB.owed)} owed
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.scenarioB.note}</div>
        </div>
      </div>

      {/* Key items checklist */}
      <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Key Items</div>
        <ul className="space-y-1.5">
          {t.keyItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="mt-0.5 shrink-0" style={{ color: '#00d4ff' }}>›</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Caveat */}
      <div className="rounded-xl px-4 py-3 text-[11px]" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
        ⚠ {t.caveat}
      </div>
    </div>
  )
}
