import PaycheckSimulator from '@/components/financial/simulators/PaycheckSimulator'

export const metadata = { title: 'Paycheck Simulator — Micci OS' }

export default function PaycheckPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <h1 className="text-lg font-bold gradient-text">💵 Paycheck Simulator</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Real-time tax calculation · 2026 brackets · SS cap tracker
        </p>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">
        <PaycheckSimulator />
      </div>
    </div>
  )
}
