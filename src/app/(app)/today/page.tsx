import Link from 'next/link'
import { ListChecks, Moon, Wallet, Flame, ArrowRight } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { getFinancialData } from '@/lib/financial-data-service'
import MorningOverview from '@/components/briefs/MorningOverview'
import { chicagoToday, loadBriefHeadlines } from '@/lib/briefsOverview'
import { dueLabel } from '@/lib/finance/due'
import { shiftDay } from '@/lib/health/dates'
import type { HealthDailyRow } from '@/lib/health/overview'
import { checkinStatus, dueThisWeek, nextPayday, pickTopActions, whenLabel } from '@/lib/today'
import { requireOwnerPage } from '@/lib/supabase/require-user'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Today — Micci OS' }

// ═══════════════════════════════════════════════════════════════════════════
// /today — the daily log (ROADMAP Phase 3). One screen for the day, built
// from data the app already has; nothing here writes.
//   1. Top 3 actions (action_items)
//   2. Evening check-in + streak (health_daily ← /health/checkin)
//   3. Money today: liquid cash, next payday, bills and promo cliffs this week
//   4. This morning's brief headlines
// Derivations live in src/lib/today.ts.
// ═══════════════════════════════════════════════════════════════════════════

const fmt$ = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

const PRIORITY_COLOR = { red: '#ef4444', amber: '#f59e0b', blue: 'var(--accent-cyan)' } as const

function dayLabel(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
}

export default async function TodayPage() {
  await requireOwnerPage()
  const service = createServiceClient()
  const today = chicagoToday()

  const [data, dailyRes, headlines] = await Promise.all([
    getFinancialData(),
    // health_daily is service-role only (deny-all RLS), like /health.
    service
      ? service.from('health_daily').select('*').gte('day', shiftDay(today, -400)).order('day', { ascending: true })
      : Promise.resolve({ data: null }),
    loadBriefHeadlines(service, await createClient(), today).catch(() => []),
  ])

  const { assets, actionItems, upcoming, runwayProjection } = data
  const liquid = assets.cash + assets.savings
  const top = pickTopActions(actionItems, today)
  const openCount = actionItems.filter(i => (i.status ?? 'active') === 'active').length
  const due = dueThisWeek(upcoming, today)
  const pay = nextPayday(runwayProjection.employment, today)
  const checkin = checkinStatus((dailyRes.data ?? []) as HealthDailyRow[], today)
  const freshBriefs = headlines.filter(h => h.fresh)

  return (
    <div className="px-6 md:px-10 py-8 space-y-5 max-w-[1100px]">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-1">Today</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          {dayLabel(today, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">

        {/* ── 1. Top 3 actions ── */}
        <section className="lg:col-span-2 glass-card p-5">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ListChecks size={14} strokeWidth={2} className="text-[var(--accent-cyan)]" /> Top 3 today
            </h2>
            <Link href="/tasks" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)]">
              {openCount} open →
            </Link>
          </div>
          {top.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-[var(--text-muted)]">Nothing open. Clear day.</div>
          ) : (
            <ol>
              {top.map((item, i) => (
                <li key={item.id ?? item.title} style={{ borderTop: i ? '1px solid var(--glass-line)' : undefined }}>
                  <Link href="/tasks" className="flex items-start gap-3 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className="font-mono text-[13px] font-bold w-4 shrink-0 text-[var(--text-muted)]">{i + 1}</span>
                    <span className="w-[7px] h-[7px] mt-[6px] rounded-full shrink-0" style={{ background: PRIORITY_COLOR[item.priority] }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] text-[var(--text-primary)] truncate">{item.title}</span>
                      {item.detail && <span className="block text-[12px] text-[var(--text-muted)] truncate">{item.detail}</span>}
                    </span>
                    <span className="font-mono text-[11.5px] shrink-0"
                      style={{ color: item.daysAway != null && item.daysAway < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                      {item.amount ? fmt$(item.amount) + ' · ' : ''}{item.daysAway != null ? dueLabel(item.daysAway) : 'open'}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ── 2. Evening check-in + streak ── */}
        <section className="glass-card p-5 flex flex-col">
          <h2 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2 mb-3">
            <Moon size={14} strokeWidth={2} className="text-[var(--accent-cyan)]" /> Evening check-in
          </h2>
          <div className="flex items-baseline gap-2">
            <Flame size={18} strokeWidth={2} style={{ color: checkin.streak > 0 ? '#f59e0b' : 'var(--text-muted)' }} className="self-center" />
            <span className="font-mono text-[28px] font-bold text-[var(--text-primary)]">{checkin.streak}</span>
            <span className="text-[12px] text-[var(--text-secondary)]">day streak</span>
          </div>
          <p className="text-[12px] text-[var(--text-muted)] mt-1">
            {checkin.last7} of the last 7 days logged
            {!checkin.loggedToday && checkin.lastLogged && checkin.lastLogged !== shiftDay(today, -1)
              ? ` · last ${dayLabel(checkin.lastLogged, { month: 'short', day: 'numeric' })}` : ''}
          </p>
          <div className="mt-auto pt-4">
            {checkin.loggedToday ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px]" style={{ color: '#22c55e' }}>Logged today</span>
                <Link href="/health/checkin" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)]">Edit →</Link>
              </div>
            ) : (
              <Link href="/health/checkin" className="btn btn-primary w-full justify-center">
                Log tonight&apos;s check-in
              </Link>
            )}
          </div>
        </section>
      </div>

      {/* ── 3. Money today ── */}
      <section className="glass-card p-5">
        <div className="flex justify-between items-baseline mb-3">
          <h2 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Wallet size={14} strokeWidth={2} className="text-[var(--accent-cyan)]" /> Money today
          </h2>
          <Link href="/financial" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)]">Financial →</Link>
        </div>
        <div className="flex gap-8 flex-wrap mb-4">
          <div>
            <div className="font-mono text-[20px] font-bold text-[var(--text-primary)]">{fmt$(liquid)}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Liquid cash</div>
          </div>
          {pay && (
            <div>
              <div className="font-mono text-[20px] font-bold" style={{ color: '#22c55e' }}>
                {dayLabel(pay.date, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                {pay.first ? 'First ' : 'Next '}{pay.employer} check · {whenLabel(pay.date, today)} · {fmt$(pay.netPerCheck)} net
              </div>
            </div>
          )}
          {runwayProjection.shortfall && (
            <div>
              <div className="font-mono text-[20px] font-bold" style={{ color: '#fbbf24' }}>
                −{fmt$(Math.abs(runwayProjection.shortfall.deepestCash))}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                Cash gap from {dayLabel(runwayProjection.shortfall.startDate, { month: 'short', day: 'numeric' })}
              </div>
            </div>
          )}
        </div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Due in the next 7 days</h3>
        {due.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)] py-2">No bills or promo deadlines this week.</p>
        ) : (
          <ul>
            {due.map((u, i) => (
              <li key={`${u.kind}-${u.label}-${u.date}`} className="flex items-center gap-3 py-2 text-[13px]"
                style={{ borderTop: i ? '1px solid var(--glass-line)' : undefined }}>
                <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: u.urgent ? '#ef4444' : 'var(--text-muted)' }} />
                <span className="flex-1 min-w-0 truncate text-[var(--text-primary)]">{u.label}</span>
                <span className="font-mono text-[11.5px] shrink-0" style={{ color: u.daysAway < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                  {u.amount != null ? fmt$(u.amount) + ' · ' : ''}{whenLabel(u.date, today)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 4. This morning's briefs ── */}
      {headlines.some(h => h.date) && (
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              This morning{freshBriefs.length ? ` · ${freshBriefs.length} new` : ''}
            </h2>
            <Link href="/briefs" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] inline-flex items-center gap-1">
              All briefs <ArrowRight size={12} />
            </Link>
          </div>
          <MorningOverview headlines={headlines} today={today} compact />
        </section>
      )}
    </div>
  )
}
