// Backlog of habit/routine ideas generated from the original AI planner build.
// These weren't in the battle-plan schedule but are worth considering.
// Each item can be promoted to the active schedule or dismissed.

interface BacklogItem {
  time: string
  category: string
  categoryColor: string
  activity: string
  duration: string | null
  type: 'weekday' | 'weekend' | 'both'
  note?: string
}

const BACKLOG: BacklogItem[] = [
  // Morning Routine ideas
  {
    time: '5:30 AM', category: 'Morning Routine', categoryColor: '#67e8f9',
    activity: 'Cold exposure — 2-3 min cold shower or plunge',
    duration: '5m', type: 'both',
    note: 'Pairs with IR sauna cycle for max contrast therapy benefit',
  },
  {
    time: '6:00 AM', category: 'Morning Routine', categoryColor: '#67e8f9',
    activity: 'Gratitude voice memo — record 3 specific things',
    duration: '5m', type: 'both',
    note: 'Alternative to journaling when short on time',
  },
  // Nutrition
  {
    time: '9:00 AM', category: 'Nutrition', categoryColor: '#4ade80',
    activity: 'High-protein breakfast: 4 eggs + Greek yogurt + fruit',
    duration: '20m', type: 'both',
    note: 'Target 40-50g protein before 10 AM to support muscle retention',
  },
  {
    time: '2:00 PM', category: 'Nutrition', categoryColor: '#4ade80',
    activity: 'Creatine + pre-workout stack (on gym days)',
    duration: null, type: 'weekday',
  },
  {
    time: '8:00 PM', category: 'Nutrition', categoryColor: '#4ade80',
    activity: 'Casein protein shake before bed',
    duration: null, type: 'both',
    note: 'Slow-digesting protein supports overnight recovery',
  },
  // Mental Health
  {
    time: '12:00 PM', category: 'Mental Health', categoryColor: '#a78bfa',
    activity: 'Midday check-in: mood, stress level, energy (1-10)',
    duration: '5m', type: 'weekday',
    note: 'Track in micci-os health section for trend data',
  },
  {
    time: '3:00 PM', category: 'Mental Health', categoryColor: '#a78bfa',
    activity: 'Breathwork session — box breathing 4-7-8',
    duration: '10m', type: 'weekday',
    note: 'Use between deep work blocks to reset nervous system',
  },
  // Planning
  {
    time: '9:00 PM', category: 'Planning', categoryColor: '#60a5fa',
    activity: 'Tomorrow\'s top 3 priorities — write them down tonight',
    duration: '5m', type: 'both',
    note: 'Reduces morning decision fatigue',
  },
  {
    time: '10:00 AM', category: 'Planning', categoryColor: '#60a5fa',
    activity: 'Weekly financial check-in — log any purchases, review burn rate',
    duration: '15m', type: 'weekend',
    note: 'Sunday only. Feeds into financial dashboard data',
  },
  // Deep Work
  {
    time: '11:00 AM', category: 'Deep Work', categoryColor: '#38bdf8',
    activity: 'Skill building block — upskill in target role areas (AI/analytics)',
    duration: '60m', type: 'weekday',
    note: 'Alternate with job search blocks post-JPMC',
  },
  // Personal Care
  {
    time: '8:30 PM', category: 'Personal Care', categoryColor: '#f9a8d4',
    activity: 'Skincare routine — evening wash + moisturizer',
    duration: '10m', type: 'both',
  },
  {
    time: '6:00 PM', category: 'Personal Care', categoryColor: '#f9a8d4',
    activity: 'Evening walk — sunset, no phone, decompression only',
    duration: '20m', type: 'both',
    note: 'Different from afternoon workout walk — intentional wind-down',
  },
  // Admin
  {
    time: '4:00 PM', category: 'Admin/Claims', categoryColor: '#f472b6',
    activity: 'Inbox zero + file any pending documents',
    duration: '20m', type: 'weekday',
    note: 'Cap at 20 min — do not let admin bleed into other blocks',
  },
  // Recovery extras
  {
    time: '7:00 PM', category: 'Recovery', categoryColor: '#67e8f9',
    activity: 'Legs up the wall pose — 10 min passive recovery',
    duration: '10m', type: 'both',
    note: 'Great after heavy leg days — reduces DOMS significantly',
  },
  {
    time: '8:00 PM', category: 'Recovery', categoryColor: '#67e8f9',
    activity: 'Epsom salt bath (weekly on Sundays)',
    duration: '30m', type: 'weekend',
    note: 'Magnesium absorption through skin, relaxation',
  },
]

const TYPE_COLORS = {
  weekday: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', text: '#60a5fa', label: 'Weekday' },
  weekend: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', text: '#a78bfa', label: 'Weekend' },
  both:    { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)', text: '#34d399', label: 'Any day' },
}

export default function BacklogTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">🗂 Habit Backlog</h2>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          AI-generated ideas from the original planner build. Not in the active battle plan — but worth considering.
          Promote to your schedule or note them for April.
        </p>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-[10px]">
        {Object.entries(TYPE_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: val.text }} />
            <span style={{ color: val.text }}>{val.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {BACKLOG.map((item, i) => {
          const tc = TYPE_COLORS[item.type]
          return (
            <div
              key={i}
              className="rounded-xl border px-4 py-3"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
              }}
            >
              <div className="flex items-start gap-3">
                {/* Time + type */}
                <div className="shrink-0 pt-0.5 text-right w-16">
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">{item.time}</div>
                  <div
                    className="text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded mt-0.5 inline-block"
                    style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text }}
                  >
                    {tc.label}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className="text-[9px] font-bold uppercase tracking-wide"
                      style={{ color: item.categoryColor }}
                    >
                      {item.category}
                    </span>
                    {item.duration && (
                      <span className="text-[9px] text-[var(--text-muted)] font-mono">{item.duration}</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-primary)] leading-snug mb-1">{item.activity}</div>
                  {item.note && (
                    <div className="text-[10px] text-[var(--text-muted)] italic leading-snug">{item.note}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          More ideas to add? Flag them in the AI chat — they&apos;ll be added here.
        </p>
      </div>
    </div>
  )
}
