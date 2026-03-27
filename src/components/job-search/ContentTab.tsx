'use client'

import type { JobSearchData } from '@/lib/job-search-data'
import type { DbJobContent } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

const STATUS_COLORS: Record<string, string> = {
  idea: 'var(--text-muted)',
  draft: '#f59e0b',
  published: '#22c55e',
  ongoing: '#3b82f6',
}

const TYPE_COLORS: Record<string, string> = {
  post: '#f59e0b',
  engage: '#3b82f6',
  article: '#a855f7',
}

interface Props {
  data: JobSearchData
  setData: React.Dispatch<React.SetStateAction<JobSearchData>>
}

export default function ContentTab({ data, setData }: Props) {
  const updateStatus = async (id: string, status: string) => {
    setData((s) => ({
      ...s,
      content: s.content.map((c) =>
        c.id === id ? { ...c, status: status as DbJobContent['status'] } : c
      ),
    }))
    try {
      const supabase = createClient()
      await supabase.from('job_content').update({ status }).eq('id', id)
    } catch {}
  }

  const weeks = [...new Set(data.content.map((c) => c.week))].sort((a, b) => a - b)

  return (
    <div>
      {/* Strategy card */}
      <div
        className="glass-card p-5 mb-5"
        style={{ background: 'rgba(0,212,255,0.04)' }}
      >
        <div
          className="text-[13px] font-bold tracking-widest uppercase mb-2"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Content Strategy
        </div>
        <div className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Cadence:
          </span>{' '}
          2 posts/week (Tue + Thu, 7–8:30 AM CT) + daily engagement (3–5 comments)
          <br />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Positioning:
          </span>{' '}
          Enterprise AI strategy, platform governance, scaled adoption, CDAO-level thought
          leadership
          <br />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Rule:
          </span>{' '}
          Spend first 30–60 min after posting replying to every comment. Never post twice in
          one day.
        </div>
      </div>

      {weeks.map((w) => (
        <div key={w} className="mb-5">
          <div
            className="text-[11px] font-bold tracking-widest uppercase mb-2.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Week {w}
          </div>
          {data.content
            .filter((c) => c.week === w)
            .map((c) => (
              <div
                key={c.id}
                className="mb-2 rounded-r-lg"
                style={{
                  borderLeft: `3px solid ${c.content_type === 'engage' ? '#3b82f6' : c.status === 'published' ? '#22c55e' : '#f59e0b'}`,
                  background:
                    (c.content_type === 'engage' ? '#3b82f6' : c.status === 'published' ? '#22c55e' : '#f59e0b') +
                    '08',
                  padding: '10px 14px',
                }}
              >
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {c.day_label}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{
                        background: (TYPE_COLORS[c.content_type] || 'var(--text-muted)') + '22',
                        color: TYPE_COLORS[c.content_type] || 'var(--text-muted)',
                      }}
                    >
                      {c.content_type}
                    </span>
                  </div>
                  <select
                    className="text-[10px] font-semibold rounded"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(0,212,255,0.15)',
                      color: STATUS_COLORS[c.status] || 'var(--text-muted)',
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                    value={c.status}
                    onChange={(e) => updateStatus(c.id, e.target.value)}
                  >
                    <option value="idea">Idea</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </div>
                <div className="text-[13px] font-semibold mt-1.5" style={{ color: 'var(--text-primary)' }}>
                  {c.topic}
                </div>
                {c.notes && (
                  <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {c.notes}
                  </div>
                )}
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}
