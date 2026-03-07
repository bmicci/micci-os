import { createClient } from '@/lib/supabase/server'
import DocumentUpload from '@/components/DocumentUpload'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Planner — Micci OS' }

// ── Types ──────────────────────────────────────────────────────────────────

interface ScheduleBlock {
  id: string
  day_type: string
  time_slot: string
  activity: string
  category: string | null
  duration_minutes: number | null
  is_fixed: boolean
}

// ── Category config ────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  morning_routine: { label: 'Morning Routine', color: 'bg-cyan-500/15 border-cyan-500/30',     dot: 'bg-cyan-400' },
  wellness:        { label: 'Wellness',         color: 'bg-teal-500/15 border-teal-500/30',     dot: 'bg-teal-400' },
  health:          { label: 'Health',           color: 'bg-blue-500/15 border-blue-500/30',     dot: 'bg-blue-400' },
  fitness:         { label: 'Fitness',          color: 'bg-orange-500/15 border-orange-500/30', dot: 'bg-orange-400' },
  nutrition:       { label: 'Nutrition',        color: 'bg-green-500/15 border-green-500/30',   dot: 'bg-green-400' },
  mental_health:   { label: 'Mental Health',    color: 'bg-purple-500/15 border-purple-500/30', dot: 'bg-purple-400' },
  planning:        { label: 'Planning',         color: 'bg-indigo-500/15 border-indigo-500/30', dot: 'bg-indigo-400' },
  job_search:      { label: 'Job Search',       color: 'bg-yellow-500/15 border-yellow-500/30', dot: 'bg-yellow-400' },
  deep_work:       { label: 'Deep Work',        color: 'bg-sky-500/15 border-sky-500/30',       dot: 'bg-sky-400' },
  admin:           { label: 'Admin',            color: 'bg-gray-500/15 border-gray-500/30',     dot: 'bg-gray-400' },
  personal_care:   { label: 'Personal Care',    color: 'bg-pink-500/15 border-pink-500/30',     dot: 'bg-pink-400' },
  personal:        { label: 'Personal',         color: 'bg-slate-500/15 border-slate-500/30',   dot: 'bg-slate-400' },
  sleep:           { label: 'Sleep',            color: 'bg-violet-500/15 border-violet-500/30', dot: 'bg-violet-500' },
  recovery:        { label: 'Recovery',         color: 'bg-emerald-500/15 border-emerald-500/30', dot: 'bg-emerald-400' },
}

const DEFAULT_CONFIG = { label: 'Other', color: 'bg-white/5 border-white/10', dot: 'bg-gray-500' }

function getCfg(cat: string | null) {
  return cat ? (CATEGORY_CONFIG[cat] ?? DEFAULT_CONFIG) : DEFAULT_CONFIG
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtTime(slot: string) {
  const [h, m] = slot.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function fmtDuration(mins: number | null) {
  if (!mins) return null
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TimelineBlock({ block }: { block: ScheduleBlock }) {
  const cfg = getCfg(block.category)
  const dur = fmtDuration(block.duration_minutes)

  return (
    <div className="flex gap-4 group">
      {/* Time column */}
      <div className="w-20 shrink-0 pt-3 text-right">
        <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
          {fmtTime(block.time_slot)}
        </span>
      </div>

      {/* Connector line */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full mt-3.5 shrink-0 ${cfg.dot}`} />
        <div className="w-px flex-1 bg-white/8 mt-1" />
      </div>

      {/* Block content */}
      <div className={`flex-1 mb-2 rounded-lg border px-4 py-3 ${cfg.color} ${block.is_fixed ? 'ring-1 ring-white/10' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-[var(--text-primary)] leading-snug">{block.activity}</p>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            {block.is_fixed && (
              <span className="text-[10px] text-[var(--text-muted)] bg-white/8 rounded px-1.5 py-0.5 uppercase tracking-wide">
                fixed
              </span>
            )}
            {dur && (
              <span className="text-xs text-[var(--text-muted)] font-mono">{dur}</span>
            )}
          </div>
        </div>
        {block.category && (
          <p className="text-[11px] text-[var(--text-muted)] mt-1 capitalize">
            {getCfg(block.category).label}
          </p>
        )}
      </div>
    </div>
  )
}

function CategoryBreakdown({ blocks }: { blocks: ScheduleBlock[] }) {
  const totals: Record<string, number> = {}
  for (const b of blocks) {
    const key = b.category ?? 'other'
    totals[key] = (totals[key] ?? 0) + (b.duration_minutes ?? 0)
  }

  const totalMins = Object.values(totals).reduce((s, v) => s + v, 0)
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Time by Category
        <span className="text-[var(--text-muted)] font-normal ml-2 text-xs">
          {fmtDuration(totalMins)} accounted
        </span>
      </h3>
      <div className="space-y-2.5">
        {sorted.map(([cat, mins]) => {
          const cfg = getCfg(cat)
          const pct = totalMins > 0 ? (mins / totalMins) * 100 : 0
          return (
            <div key={cat} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="text-xs text-[var(--text-secondary)] w-32 shrink-0">{cfg.label}</span>
              <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${cfg.dot} opacity-70`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)] font-mono w-10 text-right">
                {fmtDuration(mins)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function PlannerPage() {
  const supabase = await createClient()

  const { data: schedule } = await supabase
    .from('daily_schedule')
    .select('*')
    .order('time_slot', { ascending: true })

  const blocks = (schedule ?? []) as ScheduleBlock[]
  const weekday = blocks.filter((b) => b.day_type === 'weekday')
  const weekend = blocks.filter((b) => b.day_type === 'weekend')

  const fixedWeekday = weekday.filter((b) => b.is_fixed).length
  const fixedWeekend = weekend.filter((b) => b.is_fixed).length

  return (
    <div className="px-6 md:px-10 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-1">📅 Planner</h1>
        <p className="text-[var(--text-secondary)] text-sm">Daily schedule template · Time blocks · Routine design</p>
      </div>

      {/* Schedule grids: side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

        {/* Weekday */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Weekday Schedule
            </h2>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span>{weekday.length} blocks</span>
              <span className="text-[var(--text-muted)]/50">·</span>
              <span>{fixedWeekday} fixed</span>
            </div>
          </div>
          <div className="space-y-0">
            {weekday.map((block) => (
              <TimelineBlock key={block.id} block={block} />
            ))}
          </div>
        </section>

        {/* Weekend */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Weekend Schedule
            </h2>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span>{weekend.length} blocks</span>
              <span className="text-[var(--text-muted)]/50">·</span>
              <span>{fixedWeekend} fixed</span>
            </div>
          </div>
          <div className="space-y-0">
            {weekend.map((block) => (
              <TimelineBlock key={block.id} block={block} />
            ))}
          </div>
        </section>
      </div>

      {/* Category breakdown: side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CategoryBreakdown blocks={weekday} />
        <CategoryBreakdown blocks={weekend} />
      </div>

      {/* Document Upload */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">📎 Documents</h2>
        <DocumentUpload section="planner" />
      </section>
    </div>
  )
}
