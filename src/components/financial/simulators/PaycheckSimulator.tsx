'use client'

import { useState, useCallback } from 'react'
import { usePaycheckStore } from '@/stores/finance/paycheck-store'
import CurrencyInput from '@/components/financial/shared/CurrencyInput'
import PercentageSlider from '@/components/financial/shared/PercentageSlider'
import WaterfallChart from '@/components/financial/shared/WaterfallChart'
import type { WaterfallItem } from '@/components/financial/shared/WaterfallChart'
import type { PayFrequency, FilingStatus, TaxMethod } from '@/types/finance'

const STATES = [
  'TX', 'CA', 'NY', 'FL', 'WA', 'IL', 'PA', 'OH', 'GA', 'NC',
  'MI', 'NJ', 'VA', 'AZ', 'TN', 'IN', 'MO', 'MD', 'WI', 'CO',
  'MN', 'SC', 'AL', 'LA', 'KY', 'OR', 'OK', 'CT', 'IA', 'UT',
  'NV', 'AR', 'MS', 'KS', 'NM', 'NE', 'WV', 'ID', 'HI', 'NH',
  'ME', 'RI', 'MT', 'DE', 'SD', 'ND', 'AK', 'VT', 'WY', 'DC',
]

function fmtDollar(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

type ViewMode = 'stub' | 'annual'

export default function PaycheckSimulator() {
  const inputs = usePaycheckStore(s => s.inputs)
  const result = usePaycheckStore(s => s.result)
  const setInput = usePaycheckStore(s => s.setInput)
  const [view, setView] = useState<ViewMode>('stub')
  const [saving, setSaving] = useState(false)

  const persist = useCallback(async () => {
    setSaving(true)
    try {
      await fetch('/api/finance/paycheck-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salary: inputs.salary,
          bonus_percent: inputs.bonusPercent,
          pay_frequency: inputs.payFrequency,
          filing_status: inputs.filingStatus,
          state: inputs.state,
          tax_method: inputs.taxMethod,
          manual_effective_rate: inputs.manualEffectiveRate,
          contribution_401k: inputs.contribution401k,
          employer_match_pct: inputs.employerMatchPct,
          employer_match_cap: inputs.employerMatchCap,
          hsa_contribution: inputs.hsaContribution,
          health_premium: inputs.healthPremium,
          other_pre_tax: inputs.otherPreTax,
        }),
      })
    } finally {
      setSaving(false)
    }
  }, [inputs])

  const waterfallItems: WaterfallItem[] = result ? [
    { label: 'Gross', value: result.grossAnnual, type: 'income' },
    { label: 'Federal', value: -result.federalTaxAnnual, type: 'deduction' },
    { label: 'SS', value: -result.socialSecurityAnnual, type: 'deduction' },
    { label: 'Medicare', value: -(result.medicareAnnual), type: 'deduction' },
    ...(result.stateTaxAnnual > 0 ? [{ label: 'State', value: -result.stateTaxAnnual, type: 'deduction' as const }] : []),
    { label: '401(k)', value: -result.contribution401kAnnual, type: 'obligation' },
    ...(result.hsaContribution > 0 ? [{ label: 'HSA', value: -(result.hsaContribution * inputs.payFrequency), type: 'obligation' as const }] : []),
    { label: 'Net Pay', value: result.netPayAnnual, type: 'net' },
  ] : []

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 p-6">
      {/* ── Left: Inputs ── */}
      <aside
        className="lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold gradient-text">Inputs</h2>
          <button
            onClick={persist}
            disabled={saving}
            className="text-xs px-3 py-1 rounded-lg transition-all"
            style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: 'var(--accent-cyan)',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Compensation */}
        <Section title="Compensation">
          <CurrencyInput
            label="Base Salary"
            value={inputs.salary}
            onChange={v => setInput('salary', v)}
            min={0}
            max={10_000_000}
            step={5000}
          />
          <PercentageSlider
            label="Bonus %"
            value={inputs.bonusPercent}
            onChange={v => setInput('bonusPercent', v)}
            min={0}
            max={200}
          />
          <SelectField
            label="Pay Frequency"
            value={String(inputs.payFrequency)}
            onChange={v => setInput('payFrequency', Number(v) as PayFrequency)}
            options={[
              { value: '52', label: 'Weekly (52)' },
              { value: '26', label: 'Bi-weekly (26)' },
              { value: '24', label: 'Semi-monthly (24)' },
              { value: '12', label: 'Monthly (12)' },
            ]}
          />
        </Section>

        {/* Tax Settings */}
        <Section title="Tax">
          <SelectField
            label="Filing Status"
            value={inputs.filingStatus}
            onChange={v => setInput('filingStatus', v as FilingStatus)}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'mfj', label: 'Married Filing Jointly' },
              { value: 'mfs', label: 'Married Filing Separately' },
              { value: 'hoh', label: 'Head of Household' },
            ]}
          />
          <SelectField
            label="State"
            value={inputs.state}
            onChange={v => setInput('state', v)}
            options={STATES.map(s => ({ value: s, label: s }))}
          />
          <SelectField
            label="Tax Method"
            value={inputs.taxMethod}
            onChange={v => setInput('taxMethod', v as TaxMethod)}
            options={[
              { value: 'bracket_calc', label: 'Bracket Calculator' },
              { value: 'manual_rate', label: 'Manual Rate Override' },
            ]}
          />
          {inputs.taxMethod === 'manual_rate' && (
            <PercentageSlider
              label="Effective Rate Override"
              value={inputs.manualEffectiveRate}
              onChange={v => setInput('manualEffectiveRate', v)}
              min={0}
              max={60}
            />
          )}
        </Section>

        {/* Pre-tax Deductions */}
        <Section title="Pre-Tax Deductions">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              401(k) Contribution / yr
            </label>
            <CurrencyInput
              value={inputs.contribution401k}
              onChange={v => setInput('contribution401k', Math.min(v, 23_500))}
              max={23_500}
              step={500}
            />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              2026 limit: $23,500
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PercentageSlider
              label="Employer Match %"
              value={inputs.employerMatchPct}
              onChange={v => setInput('employerMatchPct', v)}
            />
            <PercentageSlider
              label="Match Cap %"
              value={inputs.employerMatchCap}
              onChange={v => setInput('employerMatchCap', v)}
            />
          </div>
          <CurrencyInput
            label="HSA / yr"
            value={inputs.hsaContribution}
            onChange={v => setInput('hsaContribution', Math.min(v, 8_550))}
            max={8_550}
          />
          <CurrencyInput
            label="Health/Dental/Vision / mo"
            value={inputs.healthPremium}
            onChange={v => setInput('healthPremium', v)}
            max={5000}
          />
          <CurrencyInput
            label="Other Pre-Tax / mo"
            value={inputs.otherPreTax}
            onChange={v => setInput('otherPreTax', v)}
            max={10_000}
          />
        </Section>
      </aside>

      {/* ── Right: Output ── */}
      <main className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {/* View toggle */}
        <div className="flex items-center gap-1 mb-5">
          {(['stub', 'annual'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: view === v ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                color: view === v ? '#050505' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              {v === 'stub' ? 'Pay Stub' : 'Annual Summary'}
            </button>
          ))}
        </div>

        {!result ? (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Calculating…</div>
        ) : view === 'stub' ? (
          <PayStubView result={result} inputs={inputs} />
        ) : (
          <AnnualSummaryView result={result} waterfallItems={waterfallItems} />
        )}
      </main>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function SelectField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(0,212,255,0.2)',
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#0a0e27' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function StubRow({ label, value, highlight, isDeduction, isBenefit }: {
  label: string; value: string; highlight?: boolean; isDeduction?: boolean; isBenefit?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg"
      style={{
        background: highlight ? 'rgba(0,212,255,0.08)' : 'transparent',
        borderBottom: highlight ? 'none' : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span
        className="font-mono text-sm font-medium"
        style={{
          color: highlight ? 'var(--accent-cyan)' : isDeduction ? '#ef4444' : isBenefit ? '#22c55e' : 'var(--text-primary)',
        }}
      >
        {isDeduction && !highlight ? '− ' : isBenefit ? '+ ' : ''}{value}
      </span>
    </div>
  )
}

import type { PaycheckResult, PaycheckInputs } from '@/types/finance'

function PayStubView({ result, inputs }: { result: PaycheckResult; inputs: PaycheckInputs }) {
  const periodLabel = inputs.payFrequency === 52 ? 'week' : inputs.payFrequency === 26 ? '2 weeks' :
    inputs.payFrequency === 24 ? 'semi-mo' : 'month'

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="p-5 rounded-t-xl text-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(0,212,255,0.2)' }}>
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
          Pay Stub — Per {periodLabel}
        </div>
        <div className="text-3xl font-extrabold font-mono" style={{ color: 'var(--accent-cyan)' }}>
          {fmtDollar(result.netPay)}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Net take-home
        </div>
        <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium"
          style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--accent-cyan)' }}>
          Effective Tax Rate: {fmtPct(result.effectiveTotalTaxRate)}
        </div>
      </div>

      {/* Line items */}
      <div className="px-0 py-2 rounded-b-xl"
        style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,212,255,0.1)', borderTop: 'none' }}>
        <StubRow label="Gross Pay" value={fmtDollar(result.grossPay)} />
        <StubRow
          label={`Federal Income Tax (${fmtPct(result.marginalBracket)} marginal)`}
          value={fmtDollar(result.federalTax)}
          isDeduction
        />
        <StubRow
          label={`Social Security (6.2%${result.ssCapPeriod ? ` — caps period ${result.ssCapPeriod}` : ''})`}
          value={fmtDollar(result.socialSecurity)}
          isDeduction
        />
        <StubRow
          label={`Medicare (1.45%${result.medicareAdditional > 0 ? ' + 0.9% add\'l' : ''})`}
          value={fmtDollar(result.medicare)}
          isDeduction
        />
        {result.stateTax > 0 && (
          <StubRow label="State Income Tax" value={fmtDollar(result.stateTax)} isDeduction />
        )}
        {result.contribution401k > 0 && (
          <StubRow label="401(k) Employee" value={fmtDollar(result.contribution401k)} isDeduction />
        )}
        {result.employerMatch > 0 && (
          <StubRow label="401(k) Employer Match" value={fmtDollar(result.employerMatch)} isBenefit />
        )}
        {result.hsaContribution > 0 && (
          <StubRow label="HSA Contribution" value={fmtDollar(result.hsaContribution)} isDeduction />
        )}
        {result.healthPremium > 0 && (
          <StubRow label="Health/Dental/Vision" value={fmtDollar(result.healthPremium)} isDeduction />
        )}
        {result.otherPreTax > 0 && (
          <StubRow label="Other Pre-Tax" value={fmtDollar(result.otherPreTax)} isDeduction />
        )}
        <StubRow label="Net Take-Home" value={fmtDollar(result.netPay)} highlight />
      </div>

      {/* Marginal bracket indicator */}
      <div className="mt-4 p-3 rounded-xl text-xs"
        style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
        You are in the <strong>{fmtPct(result.marginalBracket)}</strong> federal marginal bracket.
        {result.ssCapPeriod && (
          <> Social Security stops withholding after pay period <strong>{result.ssCapPeriod}</strong> — net pay increases by {fmtDollar(result.socialSecurity)}/period after that.</>
        )}
      </div>
    </div>
  )
}

function AnnualSummaryView({ result, waterfallItems }: { result: PaycheckResult; waterfallItems: WaterfallItem[] }) {
  const rows = [
    { label: 'Gross Income', value: result.grossAnnual, color: '#22c55e' },
    { label: 'Federal Income Tax', value: result.federalTaxAnnual, color: '#ef4444' },
    { label: 'Social Security', value: result.socialSecurityAnnual, color: '#f87171' },
    { label: 'Medicare', value: result.medicareAnnual, color: '#f87171' },
    { label: 'State Income Tax', value: result.stateTaxAnnual, color: '#f87171' },
    { label: '401(k) Contribution', value: result.contribution401kAnnual, color: '#f59e0b' },
    { label: '401(k) Employer Match', value: result.employerMatchAnnual, color: '#22c55e' },
    { label: 'Net Pay (Annual)', value: result.netPayAnnual, color: 'var(--accent-cyan)' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiBox label="Annual Net" value={fmtDollar(result.netPayAnnual)} accent />
        <KpiBox label="Monthly Net" value={fmtDollar(result.netPayAnnual / 12)} />
        <KpiBox label="Effective Tax Rate" value={fmtPct(result.effectiveTotalTaxRate)} />
        <KpiBox label="Total Comp" value={fmtDollar(result.grossAnnual + result.employerMatchAnnual)} />
      </div>

      {/* Waterfall chart */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Income Waterfall (Annual)
        </h3>
        <WaterfallChart items={waterfallItems} height={240} />
      </div>

      {/* Annual breakdown table */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Annual Breakdown
        </h3>
        <div className="flex flex-col gap-1">
          {rows.filter(r => r.value !== 0).map(r => (
            <div key={r.label} className="flex items-center justify-between py-1.5 px-2 rounded"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
              <span className="font-mono text-sm font-medium" style={{ color: r.color }}>
                {fmtDollar(r.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KpiBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl"
      style={{ background: accent ? 'rgba(0,212,255,0.08)' : 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-base font-bold font-mono" style={{ color: accent ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
