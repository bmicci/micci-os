import Link from 'next/link'
import { getPipelineData } from '@/lib/pipeline-data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Contacts — Micci OS' }

export default async function ContactsPage() {
  const { contacts } = await getPipelineData()
  const today = new Date().toISOString().slice(0, 10)

  // Follow-up queue ordering: due first, then by warmth (spec §3) — working
  // a warm cohort beats working alphabetically.
  const sorted = [...contacts].sort((a, b) => {
    const aDue = a.next_touch && a.next_touch <= today ? 0 : 1
    const bDue = b.next_touch && b.next_touch <= today ? 0 : 1
    if (aDue !== bDue) return aDue - bDue
    return (b.warmth ?? 0) - (a.warmth ?? 0)
  })

  return (
    <div className="px-6 md:px-10 py-8 space-y-4 max-w-[1100px]">
      <div>
        <Link href="/pipeline" className="text-[12px]" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>← Pipeline</Link>
        <h1 className="text-2xl font-bold gradient-text mt-1">Contacts</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {contacts.length} people · due follow-ups first, then warmest
        </p>
      </div>

      <div className="glass-card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {['Name', 'Company', 'Role', 'Warmth', 'Last', 'Next'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => {
                const due = c.next_touch && c.next_touch <= today
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="py-2 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {c.name}
                      {c.notes && <div className="text-[10.5px] font-normal mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.notes.slice(0, 90)}</div>}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{c.company_name ?? '—'}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-muted)' }}>
                      {c.title ?? c.contact_type?.replace('_', ' ') ?? '—'}
                    </td>
                    <td className="py-2 px-3" style={{ color: '#f59e0b' }}>{'★'.repeat(c.warmth ?? 0)}</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.last_touch ?? '—'}</td>
                    <td className="py-2 px-3 font-mono text-[11px] font-semibold"
                      style={{ color: due ? '#ef4444' : 'var(--text-muted)' }}>
                      {c.next_touch ?? '—'}{due && ' ⚠'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
