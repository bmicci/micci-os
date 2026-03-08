import Link from 'next/link'

interface ScheduleBlock {
  id: string
  day_type: string
  time_slot: string
  activity: string
  category: string | null
  duration_minutes: number | null
}

interface Props {
  blocks: ScheduleBlock[] | null
  dayType: 'weekday' | 'weekend'
}

const DOT: Record<string, string> = {
  morning_routine: 'bg-cyan-400',
  wellness:        'bg-teal-400',
  fitness:         'bg-orange-400',
  health:          'bg-blue-400',
  nutrition:       'bg-green-400',
  planning:        'bg-indigo-400',
  job_search:      'bg-yellow-400',
  deep_work:       'bg-sky-400',
  sleep:           'bg-violet-400',
  recovery:        'bg-emerald-400',
  mental_health:   'bg-purple-400',
  personal_care:   'bg-pink-400',
  admin:           'bg-gray-400',
  personal:        'bg-slate-400',
}

function parseTime(slot: string): number {
  // Handle 24-hour "HH:MM" format (e.g., "06:00", "14:20")
  const parts = slot.split(':').map(Number)
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1]
  }
  // Fallback: "7:00 AM" format
  const m = slot.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h * 60 + min
}

function getCurrentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function fmtDuration(mins: number | null): string {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export default function SchedulePreview({ blocks, dayType }: Props) {
  const all = (blocks ?? []).filter(b => b.day_type === dayType)
  const sorted = [...all].sort((a, b) => parseTime(a.time_slot) - parseTime(b.time_slot))

  const nowMins = getCurrentMinutes()

  // Find current or next block
  let currentIdx = -1
  for (let i = 0; i < sorted.length; i++) {
    const t = parseTime(sorted[i].time_slot)
    const nextT = i + 1 < sorted.length ? parseTime(sorted[i + 1].time_slot) : t + (sorted[i].duration_minutes ?? 60)
    if (nowMins >= t && nowMins < nextT) { currentIdx = i; break }
    if (t > nowMins && currentIdx === -1) currentIdx = i
  }

  const shown = currentIdx >= 0
    ? sorted.slice(currentIdx, currentIdx + 4)
    : sorted.slice(0, 4)

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          📅 {dayType === 'weekday' ? 'Weekday' : 'Weekend'} Schedule
        </h2>
        <Link href="/planner" className="text-xs text-[var(--accent-cyan)] hover:underline">
          Full schedule →
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {shown.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">No schedule blocks</p>
        )}
        {shown.map((b, i) => {
          const isNow = currentIdx >= 0 && i === 0
          const dot = DOT[b.category ?? ''] ?? 'bg-gray-400'
          return (
            <div
              key={b.id}
              className={`flex items-center gap-3 py-1.5 px-2 rounded-lg ${isNow ? 'bg-white/5 border border-white/10' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-[11px] text-[var(--text-muted)] font-mono w-16 flex-shrink-0">{b.time_slot}</span>
              <p className={`text-sm flex-1 min-w-0 truncate ${isNow ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                {b.activity}
              </p>
              {b.duration_minutes && (
                <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{fmtDuration(b.duration_minutes)}</span>
              )}
              {isNow && (
                <span className="text-[10px] text-[var(--accent-cyan)] flex-shrink-0 font-mono">NOW</span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
