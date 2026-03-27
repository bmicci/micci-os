'use client'

const BLOCKS = [
  {
    time: '7:00 – 7:30 AM',
    task: 'Morning Scan',
    detail:
      'Check email, LinkedIn notifications, recruiter messages. Respond within 24hrs.',
    color: 'var(--text-muted)',
  },
  {
    time: '7:30 – 8:30 AM',
    task: 'LinkedIn Engagement Block',
    detail:
      'Post content (Tue/Thu). Comment on 3-5 CDAO/AI leader posts. Engage with responses on own posts.',
    color: '#3b82f6',
  },
  {
    time: '8:30 – 10:30 AM',
    task: 'Deep Outreach & Applications',
    detail:
      '2-3 quality applications. 1-2 personalized outreach messages. Recruiter follow-ups. Research target companies.',
    color: 'var(--accent-cyan)',
  },
  {
    time: '10:30 – 11:00 AM',
    task: 'Pipeline Management',
    detail:
      'Update micci-os tracker. Move stages. Log all activity. Review next steps.',
    color: '#f59e0b',
  },
  {
    time: '11:00 AM – 12:00 PM',
    task: 'Interview Prep / Calls',
    detail:
      'Prep for upcoming interviews. Mock answers. Company research. Take scheduled calls.',
    color: '#ef4444',
  },
  {
    time: '12:00 – 1:00 PM',
    task: 'Lunch + Mental Reset',
    detail: 'Step away from screens. Walk, gym, or meal prep. Protect this time.',
    color: '#22c55e',
  },
  {
    time: '1:00 – 2:30 PM',
    task: 'Content Creation',
    detail:
      'Draft next LinkedIn post. Outline article ideas. Build thought leadership pipeline.',
    color: '#a855f7',
  },
  {
    time: '2:30 – 3:30 PM',
    task: 'Network Activation',
    detail:
      'Warm outreach to former colleagues. Coffee chat scheduling. Ask for referrals and introductions.',
    color: '#f59e0b',
  },
  {
    time: '3:30 – 4:00 PM',
    task: 'EOD Review',
    detail:
      "Log today's KPIs. Set tomorrow's top 3 priorities. Update pipeline statuses.",
    color: 'var(--text-muted)',
  },
]

const WEEKLY_RHYTHM = [
  {
    day: 'Monday',
    detail: 'Week planning. Set targets. Prioritize pipeline. Schedule outreach.',
  },
  {
    day: 'Tuesday',
    detail: 'LinkedIn post #1 (7–8:30 AM). Heavy outreach day.',
  },
  {
    day: 'Wednesday',
    detail:
      'Applications focus. Recruiter follow-ups. Mid-week pipeline review.',
  },
  {
    day: 'Thursday',
    detail: 'LinkedIn post #2 (7–8:30 AM). Network activation.',
  },
  {
    day: 'Friday',
    detail:
      'Weekly KPI tally. Pipeline cleanup. Content planning for next week.',
  },
  {
    day: 'Weekend',
    detail: 'Light LinkedIn engagement only. Rest. Recharge.',
  },
]

export default function ScheduleTab() {
  return (
    <div>
      {/* Operating rhythm intro */}
      <div
        className="glass-card p-5 mb-5"
        style={{ background: 'rgba(0,212,255,0.04)' }}
      >
        <div
          className="text-[13px] font-bold tracking-widest uppercase mb-2"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Daily Operating Rhythm
        </div>
        <div className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Treat the search like a full-time job. 7 AM – 4 PM, Monday through Friday.
          Protect your gym time, protect your lunch. Everything else is execution.
        </div>
      </div>

      {/* Time blocks */}
      {BLOCKS.map((b, i) => (
        <div
          key={i}
          className="mb-2 rounded-r-lg"
          style={{
            borderLeft: `3px solid ${b.color}`,
            background: `${b.color}08`,
            padding: '10px 14px',
          }}
        >
          <div
            className="text-[10px] font-bold tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            {b.time}
          </div>
          <div className="text-[13px] font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {b.task}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {b.detail}
          </div>
        </div>
      ))}

      {/* Weekly rhythm */}
      <div className="glass-card p-5 mt-5">
        <h3
          className="text-[13px] font-bold tracking-widest uppercase mb-4"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Weekly Rhythm
        </h3>
        <div className="text-[12px] leading-loose" style={{ color: 'var(--text-muted)' }}>
          {WEEKLY_RHYTHM.map((w, i) => (
            <div key={i}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {w.day}:
              </span>{' '}
              {w.detail}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
