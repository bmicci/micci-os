import Link from 'next/link'
import { getPipelineData } from '@/lib/pipeline-data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Companies — Micci OS' }

const STATUS_COLORS: Record<string, string> = {
  interviewing: '#22c55e', offer: '#00d4ff', active: '#f59e0b', submitted: '#3b82f6',
  researching: '#a78bfa', not_started: '#64748b', dormant: '#475569', closed: '#334155',
}

export default async function CompaniesPage() {
  const { companies, reqs, contacts } = await getPipelineData()
  const reqCount = new Map<string, number>()
  reqs.forEach(r => reqCount.set(r.company_id, (reqCount.get(r.company_id) ?? 0) + 1))
  const contactCount = new Map<string, number>()
  contacts.forEach(c => { if (c.company_id) contactCount.set(c.company_id, (contactCount.get(c.company_id) ?? 0) + 1) })

  const groups = [
    { key: 'active', label: '🔥 In Motion', rows: companies.filter(c => c.source === 'active_pipeline') },
    { key: 't1', label: 'Tier 1 Targets', rows: companies.filter(c => c.source === 'target_list' && c.tier === 1) },
    { key: 't2', label: 'Tier 2 Targets', rows: companies.filter(c => c.source === 'target_list' && c.tier === 2) },
    { key: 't3', label: 'Tier 3 Targets', rows: companies.filter(c => c.source === 'target_list' && c.tier === 3) },
  ]

  return (
    <div className="px-6 md:px-10 py-8 space-y-5 max-w-[1200px]">
      <div>
        <Link href="/pipeline" className="text-[12px]" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>← Pipeline</Link>
        <h1 className="text-2xl font-bold gradient-text mt-1">Companies</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {companies.length} total · active threads sort above tiers (tier is a target-list concept)
        </p>
      </div>

      {groups.map(g => g.rows.length > 0 && (
        <div key={g.key} className="glass-card p-5">
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            {g.label} · {g.rows.length}
          </h3>
          <div className="space-y-1">
            {g.rows.map(c => (
              <Link key={c.id} href={`/pipeline/companies/${c.id}`}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}>
                <span className="text-[13px] font-semibold min-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                  {c.name}{c.greenfield && <span title="greenfield" className="ml-1.5">🌱</span>}
                </span>
                <span className="text-[11px] flex-1 truncate hidden md:block" style={{ color: 'var(--text-muted)' }}>
                  {c.dfw_location ?? (c.notes ?? '').split('.')[0]}
                </span>
                <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                  {reqCount.get(c.id) ?? 0} reqs · {contactCount.get(c.id) ?? 0} contacts
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0"
                  style={{
                    background: `${STATUS_COLORS[c.status] ?? '#64748b'}22`,
                    color: STATUS_COLORS[c.status] ?? '#64748b',
                    border: `1px solid ${STATUS_COLORS[c.status] ?? '#64748b'}55`,
                  }}>
                  {c.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
