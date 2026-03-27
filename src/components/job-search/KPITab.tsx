'use client'

import type { JobSearchData } from '@/lib/job-search-data'
import { createClient } from '@/lib/supabase/client'

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
  setData: React.Dispatch<React.SetStateAction<JobSearchData>>
}

export default function KPITab({ data, setData }: Props) {
  const updateKPI = async (weekIdx: number, field: string, value: string) => {
    const numVal = parseInt(value) || 0
    setData((s) => ({
      ...s,
      weeklyKpis: s.weeklyKpis.map((k, i) =>
        i === weekIdx ? { ...k, [field]: numVal } : k
      ),
    }))
    try {
      const supabase = createClient()
      const kpi = data.weeklyKpis[weekIdx]
      await supabase
        .from('job_weekly_kpis')
        .update({ [field]: numVal })
        .eq('id', kpi.id)
    } catch {}
  }

  const totals = data.weeklyKpis.reduce(
    (acc, k) => ({
      apps: acc.apps + k.apps,
      outreach: acc.outreach + k.outreach,
      posts: acc.posts + k.posts,
      comments: acc.comments + k.comments,
      interviews: acc.interviews + k.interviews,
      t_apps: acc.t_apps + k.target_apps,
      t_outreach: acc.t_outreach + k.target_outreach,
      t_posts: acc.t_posts + k.target_posts,
      t_comments: acc.t_comments + k.target_comments,
      t_interviews: acc.t_interviews + k.target_interviews,
    }),
    {
      apps: 0, outreach: 0, posts: 0, comments: 0, interviews: 0,
      t_apps: 0, t_outreach: 0, t_posts: 0, t_comments: 0, t_interviews: 0,
    }
  )

  const totalMetrics = [
    { label: 'Apps', val: totals.apps, target: totals.t_apps },
    { label: 'Outreach', val: totals.outreach, target: totals.t_outreach },
    { label: 'Posts', val: totals.posts, target: totals.t_posts },
    { label: 'Comments', val: totals.comments, target: totals.t_comments },
    { label: 'Interviews', val: totals.interviews, target: totals.t_interviews },
  ]

  const kpiFields = [
    { field: 'apps', targetField: 'target_apps' },
    { field: 'outreach', targetField: 'target_outreach' },
    { field: 'posts', targetField: 'target_posts' },
    { field: 'comments', targetField: 'target_comments' },
    { field: 'interviews', targetField: 'target_interviews' },
  ]

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(0,212,255,0.15)',
    borderRadius: 6,
    padding: '4px',
    color: 'var(--text-primary)',
    fontSize: 12,
    width: 45,
    textAlign: 'center',
  }

  return (
    <div>
      {/* Sprint totals */}
      <div className="glass-card p-5 mb-5">
        <h3
          className="text-[13px] font-bold tracking-widest uppercase mb-4"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Sprint Totals vs Targets
        </h3>
        <div className="flex gap-4 flex-wrap">
          {totalMetrics.map((m, i) => (
            <div key={i} className="glass-card flex-1 min-w-[100px] px-4 py-3 text-center">
              <div
                className="text-[22px] font-black"
                style={{
                  color:
                    m.val >= m.target
                      ? '#22c55e'
                      : m.val > 0
                        ? '#f59e0b'
                        : 'var(--text-muted)',
                }}
              >
                {m.val}
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  /{m.target}
                </span>
              </div>
              <div
                className="text-[10px] font-semibold tracking-widest uppercase mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {m.label}
              </div>
              <div className="mt-1.5">
                <ProgressBar value={m.val} max={m.target} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                className="text-left px-3 py-2 text-[10px] font-semibold tracking-widest uppercase"
                style={{
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid rgba(0,212,255,0.1)',
                }}
              >
                Week
              </th>
              {['Apps', 'Outreach', 'Posts', 'Comments', 'Interviews'].map((h) => (
                <th
                  key={h}
                  className="text-center px-3 py-2 text-[10px] font-semibold tracking-widest uppercase"
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
            {data.weeklyKpis.map((k, i) => (
              <tr key={i}>
                <td
                  className="px-3 py-2.5 font-semibold text-[11px] whitespace-nowrap"
                  style={{
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid rgba(0,212,255,0.05)',
                  }}
                >
                  {k.week_label}
                </td>
                {kpiFields.map(({ field, targetField }) => {
                  const val = k[field as keyof typeof k] as number
                  const target = k[targetField as keyof typeof k] as number
                  return (
                    <td
                      key={field}
                      className="px-3 py-2.5 text-center"
                      style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}
                    >
                      <input
                        type="number"
                        min="0"
                        style={inputStyle}
                        value={val}
                        onChange={(e) => updateKPI(i, field, e.target.value)}
                      />
                      <span
                        className="text-[10px] ml-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        /{target}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
