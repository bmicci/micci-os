import ScenarioEngine from '@/components/financial/simulators/ScenarioEngine'

export const metadata = { title: 'Scenario Engine — Micci OS' }

export default function ScenariosPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <h1 className="text-lg font-bold gradient-text">⚖️ Scenario Comparison Engine</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Save job offer snapshots · Compare up to 3 side-by-side · Delta highlighting
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <ScenarioEngine />
      </div>
    </div>
  )
}
