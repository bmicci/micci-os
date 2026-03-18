import CashFlowModel from '@/components/financial/simulators/CashFlowModel'

export const metadata = { title: 'Cash Flow Model — Micci OS' }

export default function CashFlowPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <h1 className="text-lg font-bold gradient-text">📊 Monthly Cash Flow Model</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Live income from Paycheck · HELOC obligations from HELOC tracker · 12-month projection
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <CashFlowModel />
      </div>
    </div>
  )
}
