'use client'

import { useState } from 'react'
import type { FinancialModule } from '@/lib/financial-data'
import { getModuleCounts } from '@/lib/financial-data'
import KPICard from './KPICard'

const statusStyle: Record<string, { bg: string; color: string }> = {
  done: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  progress: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
  pending: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' },
  urgent: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
}

export default function ModulePlaybookTab({ modules }: { modules: FinancialModule[] }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const counts = getModuleCounts(modules)
  const totalDocs = modules.reduce((s, m) => s + m.docsHave.length, 0)
  const totalDocsNeeded = modules.reduce((s, m) => s + m.docsHave.length + m.docsMissing.length, 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Complete" value={String(counts.complete)} note="Modules fully done" accent="green" />
        <KPICard label="In Progress" value={String(counts.inProgress)} note="Active work" />
        <KPICard label="Pending" value={String(counts.pending)} note="Not yet started" accent="amber" />
        <KPICard label="Docs Collected" value={`${totalDocs}`} note={`of ~${totalDocsNeeded} total needed`} />
      </div>

      {/* Accordion Modules */}
      <div className="space-y-3">
        {modules.map((m) => {
          const isOpen = openId === m.id
          const s = statusStyle[m.status]

          return (
            <div key={m.id} className="glass-card overflow-hidden">
              {/* Header (clickable) */}
              <button
                onClick={() => setOpenId(isOpen ? null : m.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-extrabold shrink-0"
                  style={{ background: s.bg, color: s.color }}
                >
                  M{m.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
                    {m.name}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {m.desc}
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: s.bg, color: s.color }}
                >
                  {m.pct}%
                </span>
                <span
                  className="text-[14px] transition-transform shrink-0"
                  style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▾
                </span>
              </button>

              {/* Expandable body */}
              {isOpen && (
                <div className="px-5 pb-5 pt-0" style={{ marginLeft: 44 }}>
                  {/* Progress bar */}
                  <div className="h-[5px] rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: s.color }} />
                  </div>

                  {/* Documents Have */}
                  {m.docsHave.length > 0 && (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        📄 Documents Collected
                      </div>
                      <ul className="space-y-1 mb-4">
                        {m.docsHave.map((doc, i) => (
                          <li key={i} className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                            <span style={{ color: '#22c55e' }}>✓</span> {doc}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Documents Missing */}
                  {m.docsMissing.length > 0 && (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        📋 Documents Needed
                      </div>
                      <ul className="space-y-1 mb-4">
                        {m.docsMissing.map((doc, i) => (
                          <li key={i} className="flex items-center gap-2 text-[12px]" style={{ color: '#f59e0b' }}>
                            <span>○</span> {doc}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Action Items */}
                  {m.actions.length > 0 && (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        ⚡ Action Items
                      </div>
                      <ul className="space-y-1">
                        {m.actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                            <span className="mt-0.5 shrink-0">{action.startsWith('✅') ? '' : '→'}</span> {action}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
