import HELOCTracker from '@/components/financial/simulators/HELOCTracker'

export const metadata = { title: 'HELOC Tracker — Micci OS' }

export default function HELOCPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <h1 className="text-lg font-bold gradient-text">🏦 HELOC Consolidation Tracker</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          $190K limit @ 6.85% · First draw: ~$153K · Balance timeline + deadline countdowns
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <HELOCTracker />
      </div>
    </div>
  )
}
