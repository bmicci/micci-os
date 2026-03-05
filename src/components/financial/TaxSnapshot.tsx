// TaxSnapshot — 2025 tax summary with two scenarios
// Pure server component — all data is hardcoded

const TAX = {
  w2Income: 160_667.19,
  federalWithheld: 23_126.93,
  estimatedTaxOwed: 27_290.55,          // no SALT
  estimatedTaxOwedWithSALT: 24_890.55,  // with $10K SALT
  estimatedRefund: -4_163.62,           // negative = owe
  estimatedRefundWithSALT: -1_764.00,
  mortgageInterest: 17_152.41,
  propertyTaxes: 14_595.02,
  filingStatus: 'Single',
  state: 'Texas (no state income tax)',
}

function fmtUSD(n: number): string {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ScenarioCard({
  title,
  subtitle,
  taxOwed,
  refund,
  isBetter,
}: {
  title: string
  subtitle: string
  taxOwed: number
  refund: number
  isBetter?: boolean
}) {
  const owes = refund < 0

  return (
    <div
      className={`glass-card p-5 flex flex-col gap-3 ${
        isBetter ? 'border-[var(--accent-cyan)]/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">{title}</p>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5 leading-snug">{subtitle}</p>
        </div>
        {isBetter && (
          <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-medium shrink-0">
            Better ✓
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Est. Tax Owed</span>
          <span className="font-mono text-[var(--text-primary)]">{fmtUSD(taxOwed)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Federal Withheld</span>
          <span className="font-mono text-[var(--text-primary)]">{fmtUSD(TAX.federalWithheld)}</span>
        </div>
        <div className="border-t border-white/10 pt-2 flex justify-between font-semibold text-base">
          <span className={owes ? 'text-red-400' : 'text-green-400'}>
            {owes ? '⚠️ Amount Owed' : '✅ Refund'}
          </span>
          <span className={`font-mono ${owes ? 'text-red-400' : 'text-green-400'}`}>
            {fmtUSD(refund)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function TaxSnapshot() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
        🧾 2025 Tax Snapshot
      </h2>

      {/* Income & deduction summary */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
              W-2 Income
            </p>
            <p className="text-xl font-bold gradient-text">
              {fmtUSD(TAX.w2Income)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {TAX.filingStatus} · {TAX.state}
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
              Federal Withheld
            </p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {fmtUSD(TAX.federalWithheld)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">W-2 Box 2</p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
              Mortgage Interest
            </p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {fmtUSD(TAX.mortgageInterest)}
            </p>
            <p className="text-xs text-green-400/80 mt-0.5">fully deductible</p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
              Property Taxes
            </p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {fmtUSD(TAX.propertyTaxes)}
            </p>
            <p className="text-xs text-yellow-400/80 mt-0.5">SALT cap: $10K max</p>
          </div>
        </div>
      </div>

      {/* Two scenarios side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScenarioCard
          title="Scenario A"
          subtitle="Itemized — mortgage interest only (property taxes not deductible via escrow)"
          taxOwed={TAX.estimatedTaxOwed}
          refund={TAX.estimatedRefund}
        />
        <ScenarioCard
          title="Scenario B"
          subtitle="Itemized — mortgage interest + $10K SALT (property taxes paid directly)"
          taxOwed={TAX.estimatedTaxOwedWithSALT}
          refund={TAX.estimatedRefundWithSALT}
          isBetter
        />
      </div>

      {/* HAF note */}
      <div className="rounded-xl p-4 bg-yellow-500/10 border border-yellow-500/20 text-sm">
        <p className="text-yellow-200/80 leading-relaxed">
          <strong className="text-yellow-300">⚠️ Note:</strong> Confirm with accountant whether the HAF
          program affects property tax deductibility. Scenario B requires property taxes paid directly
          (not escrowed) to qualify for the $10K SALT deduction.
        </p>
      </div>

      {/* Upload CTA */}
      <div>
        <button
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #00D4FF, #1E90FF)' }}
        >
          📎 Upload Tax Documents
        </button>
      </div>
    </section>
  )
}
