'use client'

import { useState } from 'react'
import { useScenarioStore } from '@/stores/finance/scenario-store'
import { usePaycheckStore } from '@/stores/finance/paycheck-store'
import { useHELOCStore } from '@/stores/finance/heloc-store'
import { useCashFlowStore } from '@/stores/finance/cashflow-store'
import { compareScenarios, calculateScenarioMetrics } from '@/lib/finance/scenarios'
import ComparisonBadge from '@/components/financial/shared/ComparisonBadge'
import type { Scenario } from '@/types/finance'

function fmt(v: number) {
  return '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtMetric(key: string, value: number): string {
  if (key === 'effectiveTaxRate') return (value * 100).toFixed(1) + '%'
  return fmt(value)
}

type Tab = 'list' | 'compare'

export default function ScenarioEngine() {
  const store = useScenarioStore()
  const paycheckInputs = usePaycheckStore(s => s.inputs)
  const helocState = useHELOCStore()
  const cashflowState = useCashFlowStore()
  const [tab, setTab] = useState<Tab>('list')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  async function saveScenario() {
    if (!newName.trim()) return
    const now = new Date().toISOString()
    const scenario: Scenario = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      createdAt: now,
      updatedAt: now,
      isBaseline: store.scenarios.length === 0,
      paycheckInputs,
      helocInputs: {
        helocRate: helocState.helocRate,
        helocLimit: helocState.helocLimit,
        totalDrawn: helocState.totalDrawn,
        monthlyInterest: helocState.monthlyInterest,
      },
      cashflowInputs: {
        helocMonthlyInterest: cashflowState.helocMonthlyInterest,
        promoMinimums: cashflowState.promoMinimums,
        deferredPayments: cashflowState.deferredPayments,
        totalLivingExpenses: cashflowState.result?.totalLivingExpenses ?? 0,
      },
      notes: '',
    }

    const added = store.addScenario(scenario)
    if (!added) { alert('Maximum 5 scenarios reached.'); return }
    setNewName('')

    // Persist to Supabase
    setSaving(true)
    try {
      await fetch('/api/finance/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scenario.name,
          is_baseline: scenario.isBaseline,
          paycheck_inputs: scenario.paycheckInputs,
          heloc_inputs: scenario.helocInputs,
          cashflow_inputs: scenario.cashflowInputs,
          notes: scenario.notes,
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 3 ? [...prev, id] : prev,
    )
  }

  const comparisonScenarios = selectedIds.length > 0
    ? store.scenarios.filter(s => selectedIds.includes(s.id))
    : store.scenarios.slice(0, Math.min(3, store.scenarios.length))

  const metrics = compareScenarios(comparisonScenarios)
  const baseline = comparisonScenarios.find(s => s.isBaseline) ?? comparisonScenarios[0]

  return (
    <div className="flex flex-col p-6 gap-6">
      {/* Tab nav */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['list', 'compare'] as Tab[]).map(t => (
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
              {t === 'list' ? 'Scenarios' : 'Compare'}
            </button>
          ))}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {store.scenarios.length} / 5 scenarios
        </span>
      </div>

      {tab === 'list' ? (
        <ScenarioList
          scenarios={store.scenarios}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSetBaseline={id => store.setBaseline(id)}
          onDuplicate={(id, name) => store.duplicateScenario(id, name)}
          onDelete={id => store.removeScenario(id)}
        />
      ) : (
        <ComparisonView scenarios={comparisonScenarios} metrics={metrics} baseline={baseline} />
      )}

      {/* Save current state as scenario */}
      {store.scenarios.length < 5 && (
        <div className="flex gap-2 items-center p-4 rounded-xl"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <input
            type="text"
            placeholder="Scenario name (e.g., McKesson $250K)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveScenario()}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <button
            onClick={saveScenario}
            disabled={saving || !newName.trim()}
            className="px-4 py-2 rounded-lg text-xs font-medium"
            style={{
              background: 'var(--accent-gradient)',
              color: '#050505',
              border: 'none',
              opacity: saving || !newName.trim() ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Current'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function ScenarioList({
  scenarios, selectedIds, onToggleSelect, onSetBaseline, onDuplicate, onDelete,
}: {
  scenarios: Scenario[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onSetBaseline: (id: string) => void
  onDuplicate: (id: string, name: string) => boolean
  onDelete: (id: string) => void
}) {
  if (scenarios.length === 0) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
        No scenarios saved yet. Set your paycheck inputs and click "Save Current" to create your first scenario.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {scenarios.map(s => {
        const m = calculateScenarioMetrics(s)
        const isSelected = selectedIds.includes(s.id)
        return (
          <div
            key={s.id}
            className="p-4 rounded-xl transition-all"
            style={{
              background: isSelected ? 'rgba(0,212,255,0.06)' : 'var(--card-bg)',
              border: `1px solid ${isSelected ? 'rgba(0,212,255,0.4)' : 'var(--card-border)'}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(s.id)}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {s.name}
                    </span>
                    {s.isBaseline && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}>
                        Baseline
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Quick metrics */}
              <div className="flex items-center gap-6">
                <MetricMini label="Net/mo" value={fmt(m.monthlyNetPay)} />
                <MetricMini label="Free Cash/mo" value={fmt(m.monthlyFreeCash)} accent />
                <MetricMini label="Tax Rate" value={(m.effectiveTaxRate * 100).toFixed(1) + '%'} />
              </div>

              {/* Actions */}
              <div className="flex gap-2 items-center shrink-0">
                {!s.isBaseline && (
                  <button
                    onClick={() => onSetBaseline(s.id)}
                    className="text-[10px] px-2 py-1 rounded"
                    style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.2)' }}
                  >
                    Set Baseline
                  </button>
                )}
                <button
                  onClick={() => {
                    const name = prompt('New scenario name:', s.name + ' (copy)')
                    if (name) onDuplicate(s.id, name)
                  }}
                  className="text-[10px] px-2 py-1 rounded"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Copy
                </button>
                <button
                  onClick={() => { if (confirm('Delete this scenario?')) onDelete(s.id) }}
                  className="text-[10px] px-2 py-1 rounded"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  Del
                </button>
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Select up to 3 scenarios and switch to Compare tab for side-by-side analysis.
      </p>
    </div>
  )
}

function MetricMini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-sm font-mono font-bold" style={{ color: accent ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

import type { ComparisonMetric } from '@/types/finance'

function ComparisonView({
  scenarios, metrics, baseline,
}: {
  scenarios: Scenario[]
  metrics: ComparisonMetric[]
  baseline: Scenario | undefined
}) {
  if (scenarios.length < 2) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
        Select 2–3 scenarios from the list to compare side-by-side.
      </div>
    )
  }

  const lowerIsBetter = new Set(['monthlyDebtService', 'effectiveTaxRate'])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider"
              style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>
              Metric
            </th>
            {scenarios.map(s => (
              <th key={s.id} className="px-4 py-3 text-right text-xs"
                style={{ color: s.isBaseline ? 'var(--accent-cyan)' : 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)' }}>
                {s.name}
                {s.isBaseline && <span className="ml-1 text-[9px]">(baseline)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, i) => (
            <tr key={metric.key}
              style={{
                borderTop: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
              }}>
              <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>
                {metric.label}
              </td>
              {scenarios.map(s => {
                const valueObj = metric.values.find(v => v.scenarioId === s.id)
                const deltaObj = metric.deltaFromBaseline.find(d => d.scenarioId === s.id)
                const value = valueObj?.value ?? 0
                const isBase = s.id === baseline?.id

                return (
                  <td key={s.id} className="px-4 py-3 text-right">
                    <div className="font-mono font-bold" style={{ color: isBase ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {fmtMetric(metric.key, value)}
                    </div>
                    {!isBase && deltaObj && deltaObj.delta !== 0 && (
                      <div className="mt-0.5 flex justify-end">
                        <ComparisonBadge
                          delta={deltaObj.delta}
                          pctChange={deltaObj.pctChange}
                          lowerIsBetter={lowerIsBetter.has(metric.key)}
                          format={metric.key === 'effectiveTaxRate' ? 'percent' : 'currency'}
                        />
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
