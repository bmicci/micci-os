import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPipelineData } from '@/lib/pipeline-data'

export const dynamic = 'force-dynamic'

export default async function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { companies, contacts, reqs, recentTouches } = await getPipelineData()
  const company = companies.find(c => c.id === id)
  if (!company) notFound()

  const myContacts = contacts.filter(c => c.company_id === id)
  const myReqs = reqs.filter(r => r.company_id === id)
  const myTouches = recentTouches.filter(t => t.company_id === id)

  const Field = ({ label, value }: { label: string; value: string | null }) =>
    value ? (
      <div className="mb-3">
        <div className="text-[10.5px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
        <div className="text-[13px]" style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>{value}</div>
      </div>
    ) : null

  return (
    <div className="px-6 md:px-10 py-8 space-y-4 max-w-[1000px]">
      <div>
        <Link href="/pipeline/companies" className="text-[12px]" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>← Companies</Link>
        <h1 className="text-2xl font-bold gradient-text mt-1">
          {company.name}{company.greenfield && <span className="ml-2 text-lg" title="greenfield build-out">🌱</span>}
        </h1>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {company.source === 'active_pipeline' ? 'In motion' : `Tier ${company.tier} target`} · status: {company.status.replace('_', ' ')} · P{company.priority}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 glass-card p-5">
          <Field label="Notes" value={company.notes} />
          <Field label="Why fit" value={company.why_fit} />
          <Field label="Network angle" value={company.network_angle} />
          <Field label="Title ladder" value={company.title_ladder} />
          <Field label="Location" value={company.dfw_location} />
          <Field label="Headcount" value={company.dfw_headcount} />
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Contacts · {myContacts.length}
            </h3>
            {myContacts.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>None yet.</p>}
            {myContacts.map(c => (
              <div key={c.id} className="py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {c.name} <span style={{ color: '#f59e0b' }}>{'★'.repeat(c.warmth ?? 0)}</span>
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {c.title ?? c.contact_type?.replace('_', ' ')}
                </div>
                {c.notes && <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{c.notes}</div>}
              </div>
            ))}
          </div>

          {myReqs.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Reqs · {myReqs.length}
              </h3>
              {myReqs.map(r => (
                <div key={r.id} className="py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[12.5px]" style={{ color: 'var(--text-primary)' }}>{r.title}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {r.level}{r.fit_score != null && ` · fit ${r.fit_score}/10`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {myTouches.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Recent touches</h3>
              {myTouches.map(t => (
                <div key={t.id} className="text-[11.5px] py-1" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-cyan)' }}>{t.prong}</span> ·{' '}
                  {new Date(t.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {t.summary && ` — ${t.summary}`}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
