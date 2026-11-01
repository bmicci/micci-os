import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { BriefHeadline } from '@/lib/briefsOverview'

const CRIT = '#f87171'

function fmtDate(date: string, today: string): string {
  if (date === today) return 'Today'
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function HeadlineCard({ h, today, compact }: { h: BriefHeadline; today: string; compact: boolean }) {
  const empty = !h.headline && !h.date
  return (
    <Link href={h.href}
          className={`glass-card block ${compact ? 'p-3.5' : 'p-4 sm:p-5'} min-w-0 no-underline transition-opacity ${empty ? 'opacity-60' : ''}`}
          style={{ textDecoration: 'none' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{h.label}</span>
        {h.fresh && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent-cyan)' }} />}
        {h.grok && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full text-[var(--text-muted)]"
                style={{ border: '1px solid rgba(255,255,255,0.12)' }}>Grok</span>
        )}
        {h.flags > 0 && (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: 'rgba(248,113,113,0.12)', color: CRIT }}>
            {h.flags} {h.tab === 'today' ? 'waiting' : 'to act on'}
          </span>
        )}
      </div>
      <p className={`${compact ? 'text-[13px] line-clamp-2' : 'text-[14px] sm:text-[15px] line-clamp-3'} leading-snug text-[var(--text-primary)]`}>
        {h.headline ?? (empty ? 'No brief yet' : 'Open the brief')}
      </p>
      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--text-muted)]">
        {h.date && <span>{fmtDate(h.date, today)}</span>}
        {h.note && <span>· {h.note}</span>}
        <ArrowRight size={12} className="ml-auto shrink-0" />
      </div>
    </Link>
  )
}

/** Every brief's latest headline, one card each. `compact` is the dashboard strip. */
export default function MorningOverview({
  headlines, today, compact = false,
}: {
  headlines: BriefHeadline[]
  today: string
  compact?: boolean
}) {
  // Fresh briefs first, then by flags; empty tabs last.
  const ordered = [...headlines].sort((a, b) =>
    Number(b.fresh) - Number(a.fresh)
    || b.flags - a.flags
    || Number(Boolean(b.date)) - Number(Boolean(a.date)))
  const freshCount = headlines.filter(h => h.fresh).length
  const flagCount = headlines.reduce((s, h) => s + h.flags, 0)

  return (
    <div>
      {!compact && (
        <p className="text-[13px] text-[var(--text-secondary)] mb-3">
          {freshCount} of {headlines.length} briefs updated today
          {flagCount > 0 && <> · <span style={{ color: CRIT }}>{flagCount} item{flagCount > 1 ? 's' : ''} need you</span></>}
        </p>
      )}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
        {(compact ? ordered.filter(h => h.date) : ordered).map(h => (
          <HeadlineCard key={h.tab} h={h} today={today} compact={compact} />
        ))}
      </div>
    </div>
  )
}
