import Link from 'next/link'
import { Briefcase, Zap, Users, Building2 } from 'lucide-react'
import { getPipelineData, WEEKLY_TARGETS } from '@/lib/pipeline-data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pipeline — Micci OS' }

const STATUS_COLORS: Record<string, string> = {
  interviewing: '#22c55e',
  offer: '#00d4ff',
  active: '#f59e0b',
  submitted: '#3b82f6',
  researching: '#a78bfa',
  not_started: '#64748b',
  dormant: '#475569',
  closed: '#334155',
}

function statusChip(status: string) {
  const c = STATUS_COLORS[status] ?? '#64748b'
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: `${c}22`, color: c, border: `1px solid ${c}55` }}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default async function PipelinePage() {
  const data = await getPipelineData()
  const active = data.companies.filter(c => c.source === 'active_pipeline' && c.status !== 'dormant' && c.status !== 'closed')
  const dormant = data.companies.filter(c => c.source === 'active_pipeline' && (c.status === 'dormant' || c.status === 'closed'))
  const targets = data.companies.filter(c => c.source === 'target_list')

  return (
    <div className="px-6 md:px-10 py-8 space-y-5 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-1 flex items-center gap-2">
            <Briefcase size={26} className="text-[var(--accent-cyan)]" /> Executive Pipeline
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {active.length} in motion · {targets.length} targets · comp floor $230K base
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/pipeline/log" className="text-[12px] font-bold px-4 py-2 rounded-lg"
            style={{ background: 'linear-gradient(135deg,#00d4ff,#1e90ff)', color: '#050505', textDecoration: 'none' }}>
            <Zap size={13} className="inline mr-1 -mt-0.5" /> Log a touch
          </Link>
          <Link href="/pipeline/companies" className="text-[12px] font-semibold px-4 py-2 rounded-lg"
            style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)', textDecoration: 'none' }}>
            <Building2 size={13} className="inline mr-1 -mt-0.5" /> Companies
          </Link>
          <Link href="/pipeline/contacts" className="text-[12px] font-semibold px-4 py-2 rounded-lg"
            style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)', textDecoration: 'none' }}>
            <Users size={13} className="inline mr-1 -mt-0.5" /> Contacts
          </Link>
        </div>
      </div>

      {/* Prong scoreboard — current week vs targets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(WEEKLY_TARGETS).map(([prong, t]) => {
          const wk = data.thisWeek.find(w => w.prong === prong)
          const actual = wk?.touches ?? 0
          const replies = wk?.replies ?? 0
          const pct = Math.min((actual / t.target) * 100, 100)
          const done = actual >= t.target
          return (
            <div key={prong} className="glass-card p-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.label}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>this week</span>
              </div>
              <div className="text-2xl font-extrabold" style={{ color: done ? '#22c55e' : 'var(--text-primary)' }}>
                {actual}<span className="text-[13px] font-normal" style={{ color: 'var(--text-muted)' }}> / {t.target}</span>
                {replies > 0 && <span className="text-[11px] ml-2 font-semibold" style={{ color: '#22c55e' }}>{replies} replies</span>}
              </div>
              <div className="h-1.5 rounded-full mt-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? '#22c55e' : 'linear-gradient(90deg,#00d4ff,#1e90ff)' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Unreferred applications alert */}
      {data.unreferred.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p className="text-[12px] font-bold mb-2" style={{ color: '#ef4444' }}>
            ⚠ {data.unreferred.length} submission{data.unreferred.length > 1 ? 's' : ''} with no referral after 48h — lowest-yield state in the system
          </p>
          {data.unreferred.map(u => (
            <div key={u.id} className="text-[12px] py-1" style={{ color: u.age_days > 5 ? '#ef4444' : '#f59e0b' }}>
              {u.company} — {u.title} · submitted {u.age_days}d ago
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Active pipeline */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            🔥 In Motion — {active.length} threads
          </h3>
          <div className="space-y-1.5">
            {active.map(c => (
              <Link key={c.id} href={`/pipeline/companies/${c.id}`}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
                <span className="text-[13px] font-semibold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                  {c.name}
                  {c.priority === 1 && <span className="ml-2 text-[10px] font-bold" style={{ color: '#f59e0b' }}>P1</span>}
                </span>
                <span className="text-[11px] truncate hidden sm:block max-w-[280px]" style={{ color: 'var(--text-muted)' }}>
                  {(c.notes ?? '').split('.')[0]}
                </span>
                {statusChip(c.status)}
              </Link>
            ))}
          </div>
          {dormant.length > 0 && (
            <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
              + {dormant.length} dormant ({dormant.map(d => d.name).join(', ')}) — re-approach only with new information
            </p>
          )}
        </div>

        {/* Follow-up queue */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            📞 Follow-Up Queue
          </h3>
          {data.followUps.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Nothing due. Set <code>next_touch</code> dates on contacts to build the queue.
            </p>
          ) : (
            data.followUps.map(c => (
              <div key={c.id} className="py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {c.name} <span style={{ color: '#f59e0b' }}>{'★'.repeat(c.warmth ?? 0)}</span>
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {c.company_name} · due {c.next_touch}
                </div>
              </div>
            ))
          )}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Recent touches</h4>
            {data.recentTouches.slice(0, 5).map(t => (
              <div key={t.id} className="text-[11px] py-1" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>{t.prong}</span>
                {' '}· {new Date(t.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {t.got_reply && <span style={{ color: '#22c55e' }}> · replied</span>}
                {t.summary && <span> — {t.summary.slice(0, 60)}</span>}
              </div>
            ))}
            {data.recentTouches.length === 0 && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No touches logged yet — hit &ldquo;Log a touch.&rdquo;</p>
            )}
          </div>
        </div>
      </div>

      {/* Tier board (targets) */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          🎯 Target List — flood the funnel
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(tier => (
            <div key={tier}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Tier {tier}
              </h4>
              {targets.filter(c => c.tier === tier).map(c => (
                <Link key={c.id} href={`/pipeline/companies/${c.id}`}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-white/[0.04]"
                  style={{ textDecoration: 'none' }}>
                  <span className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
                    {c.name}{c.greenfield && <span title="greenfield build-out" className="ml-1">🌱</span>}
                  </span>
                  {statusChip(c.status)}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
