import TaxCenterTab from '@/components/financial/TaxCenterTab'

export const metadata = { title: 'Tax Center — Micci OS' }

export default function TaxPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold gradient-text">🧾 Tax Center</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Year-over-year filing history · 2026 estimated payments · withholding check
            </p>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#22c55e',
            }}
          >
            ✓ 2025 FILED
          </span>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <TaxCenterTab />
      </div>
    </div>
  )
}
