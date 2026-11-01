import Link from 'next/link'
import { BRIEF_TABS, type BriefTab } from '@/lib/briefs'

/** Tab bar for /briefs — Overview first, then every brief. Links, so each view is a shareable URL. */
export default function BriefsNav({
  active, latestByTab, today,
}: {
  active: BriefTab | 'overview'
  latestByTab: Partial<Record<BriefTab, string>>
  today: string
}) {
  const tabs: { id: BriefTab | 'overview'; label: string; href: string }[] = [
    { id: 'overview', label: 'Overview', href: '/briefs' },
    ...BRIEF_TABS.map(t => ({ id: t.id, label: t.label, href: `/briefs?tab=${t.id}` })),
  ]
  return (
    <nav className="flex overflow-x-auto px-3 sm:px-6 shrink-0"
         style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--glass-line)', scrollbarWidth: 'none' }}>
      {tabs.map(t => {
        const isActive = t.id === active
        const fresh = t.id !== 'overview' && latestByTab[t.id] === today
        return (
          <Link key={t.id} href={t.href}
                className="relative px-3 sm:px-5 py-3 text-[12px] sm:text-[13px] font-medium whitespace-nowrap border-b-[3px] shrink-0 transition-all"
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottomColor: isActive ? 'var(--accent-cyan)' : 'transparent',
                  background: isActive ? 'rgba(var(--accent-rgb), 0.04)' : 'transparent',
                }}>
            {t.label}
            {fresh && <span className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-cyan)' }} />}
          </Link>
        )
      })}
    </nav>
  )
}
