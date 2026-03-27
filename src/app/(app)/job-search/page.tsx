import { getJobSearchData } from '@/lib/job-search-data-service'
import JobSearchApp from '@/components/job-search/JobSearchApp'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Job Search — Micci OS' }

const SPRINT_END = new Date('2026-04-30')

function getSprintDaysRemaining() {
  const now = new Date()
  const diff = Math.ceil((SPRINT_END.getTime() - now.getTime()) / 86400000)
  return Math.max(0, diff)
}

export default async function JobSearchPage() {
  const data = await getJobSearchData()
  const daysRemaining = getSprintDaysRemaining()

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
            style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}
          >
            APRIL SPRINT · POST-JPMC
          </div>
          <h1 className="text-lg font-bold gradient-text">
            Job Search Command Center
          </h1>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            March 24 – April 30, 2026 · Full-time execution mode
          </p>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-extrabold"
            style={{ color: daysRemaining <= 14 ? '#f59e0b' : 'var(--accent-cyan)' }}
          >
            {daysRemaining}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            days remaining in sprint
          </div>
        </div>
      </header>

      <JobSearchApp initialData={data} />
    </div>
  )
}
