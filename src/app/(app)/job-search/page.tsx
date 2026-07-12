import { getJobSearchData } from '@/lib/job-search-data-service'
import { getFinancialData } from '@/lib/financial-data-service'
import JobSearchApp from '@/components/job-search/JobSearchApp'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Job Search — Micci OS' }

// De-sprinted (rule: time never freezes). The header derives from live
// pipeline state + the real cash runway — the number this search is racing.

export default async function JobSearchPage() {
  const [data, fin] = await Promise.all([getJobSearchData(), getFinancialData()])

  const active = data.pipeline.filter(p =>
    ['active', 'waiting', 'offer'].includes(String(p.status).toLowerCase()),
  ).length
  const closed = data.pipeline.length - active

  const liquid = fin.assets.cash + fin.assets.savings
  const burn = fin.burnAnalysis.hasData ? fin.burnAnalysis.monthlyNetBurn : 0
  const runwayMonths = burn > 0 ? liquid / burn : Infinity

  const pipelineEmpty = active === 0

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="shrink-0 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
        }}
      >
        <div>
          <div
            className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1.5"
            style={{
              background: pipelineEmpty ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,255,0.15)',
              color: pipelineEmpty ? '#ef4444' : 'var(--accent-cyan)',
            }}
          >
            {pipelineEmpty ? 'PIPELINE EMPTY — REBUILD MODE' : `${active} ACTIVE CONVERSATIONS`}
          </div>
          <h1 className="text-lg font-bold gradient-text">
            Job Search Command Center
          </h1>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {closed > 0 ? `${closed} closed in history · ` : ''}Every week here is a week of runway
          </p>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-extrabold"
            style={{ color: runwayMonths < 4 ? '#ef4444' : '#f59e0b' }}
          >
            {runwayMonths === Infinity ? '∞' : `${runwayMonths.toFixed(1)} mo`}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            cash runway — the clock that matters
          </div>
        </div>
      </header>

      <JobSearchApp initialData={data} />
    </div>
  )
}
