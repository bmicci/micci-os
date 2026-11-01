import Link from 'next/link'
import { Newspaper, ArrowRight } from 'lucide-react'
import type { BriefHeadline } from '@/lib/briefsOverview'

/** One brief's headline on its section page (/financial, /pipeline), linking into /briefs. */
export default function BriefHeadlineCard({ brief, today }: { brief: BriefHeadline | undefined; today: string }) {
  if (!brief?.headline) return null
  const when = brief.date === today ? 'today'
    : new Date(brief.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <Link href={brief.href}
          className="flex items-center gap-3 rounded-xl px-4 py-3 min-w-0"
          style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.18)', textDecoration: 'none' }}>
      <Newspaper size={16} className="shrink-0 text-[var(--accent-cyan)]" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          {brief.label} brief · {when}{brief.flags > 0 ? ` · ${brief.flags} to act on` : ''}
        </div>
        <div className="text-[13px] text-[var(--text-primary)] leading-snug line-clamp-2">{brief.headline}</div>
      </div>
      <ArrowRight size={14} className="shrink-0 text-[var(--text-muted)]" />
    </Link>
  )
}
