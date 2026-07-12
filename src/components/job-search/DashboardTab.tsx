'use client'

import type { JobSearchData } from '@/lib/job-search-data'

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  waiting: '#f59e0b',
  rejected: '#ef4444',
  offer: '#a855f7',
  closed: 'var(--text-muted)',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: 'var(--text-muted)',
}

function weekLabel(): string {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  const f = (d: Date) => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  return `${f(mon)}–${f(fri)}`
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const color = pct >= 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : 'var(--accent-cyan)'
  return (
    <div
      style={{
        height: 6,
        borderRadius: 3,
        background: 'rgba(0,212,255,0.1)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 3,
          background: color,
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  )
}

interface Props {
  data: JobSearchData
}

export default function DashboardTab({ data }: Props) {
  const activePipeline = data.pipeline.filter(
    (p) => p.status !== 'closed' && p.status !== 'rejected'
  ).length
  const highPriority = data.pipeline.filter((p) => p.priority === 'high').length
  const totalApps = data.weeklyKpis.reduce((s, k) => s + k.apps, 0)
  const totalOutreach = data.weeklyKpis.reduce((s, k) => s + k.outreach, 0)
  const recruitersContacted = data.recruiters.filter(
    (r) => r.status === 'engaged' || r.status === 'warm'
  ).length
  const postsPublished = data.content.filter((c) => c.status === 'published').length

  // Current week KPIs (find based on week_number closest to now)
  const kpi = data.weeklyKpis[0] ?? {
    apps: 0, outreach: 0, posts: 0, comments: 0, interviews: 0,
    target_apps: 8, target_outreach: 6, target_posts: 2, target_comments: 15, target_interviews: 2,
  }

  const metrics = [
    { num: activePipeline, label: 'Active Pipeline', color: '#22c55e' },
    { num: highPriority, label: 'High Priority', color: '#ef4444' },
    { num: totalApps, label: 'Total Apps', color: '#3b82f6' },
    { num: totalOutreach, label: 'Outreach Sent', color: '#f59e0b' },
    { num: recruitersContacted, label: 'Recruiters Engaged', color: 'var(--accent-cyan)' },
    { num: postsPublished, label: 'Posts Published', color: '#a855f7' },
  ]

  const liveActions = [
    ...data.pipeline
      .filter((p) => p.priority === 'high' && p.next_step && p.status === 'active')
      .map((p) => ({ task: `${p.company}: ${p.next_step}`, urgency: 'high' as const })),
    ...data.outreach
      .filter((o) => o.status === 'planned')
      .slice(0, 2)
      .map((o) => ({
        task: `Outreach: ${o.target} via ${o.method}`,
        urgency: 'medium' as const,
      })),
    ...data.recruiters
      .filter((r) => r.status === 'to_contact')
      .slice(0, 2)
      .map((r) => ({
        task: `Contact recruiter: ${r.name}`,
        urgency: 'medium' as const,
      })),
  ]

  // Rebuild mode: pipeline is empty — derive actions from reality instead of
  // stale plans: add opportunities + re-engage contacts from closed history.
  const reEngage = data.pipeline
    .filter((p) => p.status === 'closed' && p.contact && !/tbd|recruiter$/i.test(p.contact))
    .slice(0, 3)
    .map((p) => ({
      task: `Re-engage ${p.contact} (${p.company}) — new roles since spring?`,
      urgency: 'medium' as const,
    }))
  const todayActions = activePipeline > 0
    ? liveActions
    : [
        { task: 'Add real opportunities to the pipeline (Pipeline tab → + Add)', urgency: 'high' as const },
        ...reEngage,
        { task: 'Ping 2 exec recruiters (Korn Ferry, Spencer Stuart) with updated availability', urgency: 'medium' as const },
      ]

  return (
    <div>
      {/* Metric strip */}
      <div className="flex gap-3 flex-wrap mb-5">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="glass-card flex-1 min-w-[120px] px-4 py-4 text-center"
          >
            <div className="text-2xl font-black" style={{ color: m.color }}>
              {m.num}
            </div>
            <div
              className="text-[10px] font-semibold tracking-widest uppercase mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {m.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* This Week's KPIs */}
        {kpi && (
          <div className="glass-card p-5">
            <h3
              className="text-[13px] font-bold tracking-widest uppercase mb-4"
              style={{ color: 'var(--accent-cyan)' }}
            >
              This Week&apos;s KPIs — {weekLabel()}
            </h3>
            {[
              { label: 'Applications', val: kpi.apps, target: kpi.target_apps },
              { label: 'Outreach', val: kpi.outreach, target: kpi.target_outreach },
              { label: 'Posts', val: kpi.posts, target: kpi.target_posts },
              { label: 'Comments', val: kpi.comments, target: kpi.target_comments },
              { label: 'Interviews', val: kpi.interviews, target: kpi.target_interviews },
            ].map((item, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between text-[11px] mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    {item.val} / {item.target}
                  </span>
                </div>
                <ProgressBar value={item.val} max={item.target} />
              </div>
            ))}
          </div>
        )}

        {/* Priority Actions */}
        <div className="glass-card p-5">
          <h3
            className="text-[13px] font-bold tracking-widest uppercase mb-4"
            style={{ color: 'var(--accent-cyan)' }}
          >
            Priority Actions — Today
          </h3>
          {todayActions.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              No pending actions. Update your pipeline!
            </p>
          ) : (
            todayActions.map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 mb-2.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: PRIORITY_COLORS[t.urgency] }}
                />
                <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
                  {t.task}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Pipeline Quick View */}
      <div className="glass-card p-5">
        <h3
          className="text-[13px] font-bold tracking-widest uppercase mb-4"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Pipeline — Quick View
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Company', 'Role', 'Stage', 'Status', 'Next Step'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-[10px] font-semibold tracking-widest uppercase"
                    style={{
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid rgba(0,212,255,0.1)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.pipeline
                .filter((p) => p.status !== 'closed')
                .map((p) => (
                  <tr key={p.id}>
                    <td
                      className="px-3 py-2.5 font-bold"
                      style={{
                        color: 'var(--text-primary)',
                        borderBottom: '1px solid rgba(0,212,255,0.05)',
                      }}
                    >
                      {p.company}
                    </td>
                    <td
                      className="px-3 py-2.5 text-[11px]"
                      style={{
                        color: 'var(--text-muted)',
                        borderBottom: '1px solid rgba(0,212,255,0.05)',
                      }}
                    >
                      {p.role}
                    </td>
                    <td
                      className="px-3 py-2.5 text-[11px]"
                      style={{
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid rgba(0,212,255,0.05)',
                      }}
                    >
                      {p.stage}
                    </td>
                    <td
                      className="px-3 py-2.5"
                      style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}
                    >
                      <span
                        className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
                        style={{
                          background: (STATUS_COLORS[p.status] || 'var(--text-muted)') + '22',
                          color: STATUS_COLORS[p.status] || 'var(--text-muted)',
                          border: `1px solid ${STATUS_COLORS[p.status] || 'var(--text-muted)'}44`,
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td
                      className="px-3 py-2.5 text-[11px]"
                      style={{
                        color: 'var(--text-muted)',
                        borderBottom: '1px solid rgba(0,212,255,0.05)',
                      }}
                    >
                      {p.next_step}
                    </td>
                  </tr>
                ))}
              {data.pipeline.filter((p) => p.status !== 'closed').length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                    No active conversations yet — add real opportunities in the Pipeline tab.
                  </td>
                </tr>
              )}
              {data.pipeline.some((p) => p.status === 'closed') && (
                <>
                  <tr>
                    <td colSpan={5} className="px-3 pt-4 pb-1 text-[10px] font-bold tracking-widest uppercase"
                      style={{ color: 'var(--text-muted)' }}>
                      Interview history — stages reached & contacts worth re-engaging
                    </td>
                  </tr>
                  {data.pipeline
                    .filter((p) => p.status === 'closed')
                    .map((p) => (
                      <tr key={p.id} style={{ opacity: 0.65 }}>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(0,212,255,0.04)' }}>
                          {p.company}
                        </td>
                        <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(0,212,255,0.04)' }}>
                          {p.role}
                        </td>
                        <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(0,212,255,0.04)' }}>
                          {p.stage}
                        </td>
                        <td className="px-3 py-2" style={{ borderBottom: '1px solid rgba(0,212,255,0.04)' }}>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            closed
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(0,212,255,0.04)' }}>
                          {p.contact ?? '—'}
                        </td>
                      </tr>
                    ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
