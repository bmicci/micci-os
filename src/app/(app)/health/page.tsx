import { createClient } from '@/lib/supabase/server'
import DocumentUpload from '@/components/DocumentUpload'

export const metadata = { title: 'Health — Micci OS' }

// ── Types ──────────────────────────────────────────────────────────────────

interface Supplement {
  id: string
  name: string
  dosage: string | null
  frequency: string | null
  timing: string | null
  category: string | null
  notes: string | null
  is_active: boolean
}

interface HormoneProtocol {
  id: string
  name: string
  substance: string
  dosage: string | null
  day_of_week: string[] | null
  time_of_day: string | null
  notes: string | null
  is_active: boolean
}

// ── Category config ────────────────────────────────────────────────────────

const SUPP_CATEGORY_CONFIG: Record<string, { label: string; dot: string }> = {
  vitamins:       { label: 'Vitamins',         dot: 'bg-yellow-400' },
  minerals:       { label: 'Minerals',         dot: 'bg-blue-400' },
  essential:      { label: 'Essential',        dot: 'bg-cyan-400' },
  performance:    { label: 'Performance',      dot: 'bg-orange-400' },
  adaptogens:     { label: 'Adaptogens',       dot: 'bg-green-400' },
  mitochondrial:  { label: 'Mitochondrial',    dot: 'bg-amber-400' },
  antioxidants:   { label: 'Antioxidants',     dot: 'bg-rose-400' },
  gut_health:     { label: 'Gut Health',       dot: 'bg-lime-400' },
  metabolic:      { label: 'Metabolic',        dot: 'bg-teal-400' },
  nootropics:     { label: 'Nootropics',       dot: 'bg-indigo-400' },
  sleep:          { label: 'Sleep',            dot: 'bg-violet-400' },
  hormones:       { label: 'Hormones',         dot: 'bg-pink-400' },
  recovery:       { label: 'Recovery',         dot: 'bg-emerald-400' },
  cardiovascular: { label: 'Cardiovascular',   dot: 'bg-red-400' },
  thyroid:        { label: 'Thyroid',          dot: 'bg-sky-400' },
  longevity:      { label: 'Longevity',        dot: 'bg-purple-400' },
  mental_health:  { label: 'Mental Health',    dot: 'bg-fuchsia-400' },
}

const DEFAULT_DOT = 'bg-gray-400'

function getCatCfg(cat: string | null) {
  return cat ? (SUPP_CATEGORY_CONFIG[cat] ?? { label: cat, dot: DEFAULT_DOT }) : { label: 'Other', dot: DEFAULT_DOT }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{children}</h2>
}

function SupplementsSection({ supplements }: { supplements: Supplement[] }) {
  const active   = supplements.filter((s) => s.is_active)
  const inactive = supplements.filter((s) => !s.is_active)

  // Group active by category
  const groups: Record<string, Supplement[]> = {}
  for (const s of active) {
    const key = s.category ?? 'other'
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  }

  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length)

  return (
    <section>
      <SectionHeading>
        💊 Supplements
        <span className="text-[var(--text-muted)] font-normal text-sm ml-2">
          {active.length} active · {inactive.length} inactive
        </span>
      </SectionHeading>
      <div className="space-y-4">
        {sortedGroups.map(([cat, items]) => {
          const cfg = getCatCfg(cat)
          return (
            <div key={cat} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
              {/* Group header */}
              <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-sm font-medium text-[var(--text-primary)]">{cfg.label}</span>
                <span className="text-xs text-[var(--text-muted)] ml-auto">{items.length}</span>
              </div>
              {/* Items */}
              <div className="divide-y divide-white/5">
                {items.map((s) => (
                  <div key={s.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/3 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{s.name}</span>
                        {s.dosage && (
                          <span className="text-xs text-[var(--accent-cyan)] bg-cyan-500/10 rounded px-1.5 py-0.5">
                            {s.dosage}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {s.timing && (
                          <span className="text-xs text-[var(--text-secondary)]">🕐 {s.timing}</span>
                        )}
                        {s.frequency && s.frequency !== 'daily' && (
                          <span className="text-xs text-[var(--text-muted)] capitalize">{s.frequency}</span>
                        )}
                      </div>
                      {s.notes && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{s.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Inactive / paused */}
        {inactive.length > 0 && (
          <div className="bg-[var(--card-bg)] border border-white/8 rounded-xl overflow-hidden opacity-50">
            <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-sm font-medium text-[var(--text-muted)]">Inactive / Paused</span>
              <span className="text-xs text-[var(--text-muted)] ml-auto">{inactive.length}</span>
            </div>
            <div className="divide-y divide-white/5">
              {inactive.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-2">
                  <span className="text-sm text-[var(--text-muted)]">{s.name}</span>
                  {s.dosage && <span className="text-xs text-[var(--text-muted)]">{s.dosage}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function HormoneSection({ protocols }: { protocols: HormoneProtocol[] }) {
  const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <section>
      <SectionHeading>⚗️ Hormone Protocols (TRT)</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {protocols.map((p) => (
          <div
            key={p.id}
            className={`bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 ${!p.is_active ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{p.substance}</h3>
              {!p.is_active && (
                <span className="text-[10px] bg-gray-500/20 text-gray-400 rounded px-1.5 py-0.5 shrink-0">off</span>
              )}
            </div>

            <div className="space-y-2">
              {p.dosage && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] w-14 shrink-0">Dose</span>
                  <span className="text-sm text-[var(--accent-cyan)] font-medium">{p.dosage}</span>
                </div>
              )}
              {p.time_of_day && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] w-14 shrink-0">Time</span>
                  <span className="text-sm text-[var(--text-secondary)] capitalize">{p.time_of_day}</span>
                </div>
              )}
              {p.day_of_week && p.day_of_week.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] w-14 shrink-0">Days</span>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS_ORDER.map((day) => {
                      const active = p.day_of_week!.includes(day)
                      return (
                        <span
                          key={day}
                          className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${
                            active
                              ? 'bg-cyan-500/25 text-cyan-300'
                              : 'bg-white/5 text-[var(--text-muted)]'
                          }`}
                        >
                          {DAY_ABBR[day]}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {p.notes && (
              <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-white/8 leading-relaxed">
                {p.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function HealthPage() {
  const supabase = await createClient()

  const [{ data: supplements }, { data: hormones }] = await Promise.all([
    supabase.from('supplements').select('*').order('category').order('name'),
    supabase.from('hormone_protocols').select('*').order('name'),
  ])

  const supps    = (supplements ?? []) as Supplement[]
  const protocols = (hormones ?? []) as HormoneProtocol[]

  const activeSupps    = supps.filter((s) => s.is_active).length
  const categoryCount  = new Set(supps.filter((s) => s.is_active).map((s) => s.category)).size

  return (
    <div className="px-6 md:px-10 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-1">🏋️ Health</h1>
        <p className="text-[var(--text-secondary)] text-sm">Supplements · Hormone protocols · Recovery</p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white/5 rounded-lg px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Active Supplements</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{activeSupps}</p>
        </div>
        <div className="bg-white/5 rounded-lg px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Categories</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{categoryCount}</p>
        </div>
        <div className="bg-white/5 rounded-lg px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">TRT Protocols</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{protocols.filter((p) => p.is_active).length}</p>
        </div>
      </div>

      {/* Hormone protocols */}
      {protocols.length > 0 && <HormoneSection protocols={protocols} />}

      {/* Supplements */}
      {supps.length > 0 && <SupplementsSection supplements={supps} />}

      {/* Document Upload */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">📎 Documents</h2>
        <DocumentUpload section="health" />
      </section>
    </div>
  )
}
