import Link from 'next/link'
import { Wallet, Briefcase, HeartPulse, Gem, Target, ClipboardList, ArrowLeftRight } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { getFinancialData } from '@/lib/financial-data-service'
import { getJobSearchData } from '@/lib/job-search-data-service'
import { fmtK, HELOC_LIMIT } from '@/lib/financial-data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Command Center — Micci OS' }

// ═══════════════════════════════════════════════════════════════════════════
// Command Center — the front door. Everything derives from TODAY and live
// data (rule: time never freezes). No hardcoded dates, no frozen headers.
//   1. Runway ribbon — the season's headline number
//   2. Today across everything — money, job search, health in one feed
//   3. Money this month — mini in/out + upcoming deadline pills
//   4. Section pulses
// ═══════════════════════════════════════════════════════════════════════════

function fmtRound(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function daysUntil(dateStr: string): number {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T00:00:00' : dateStr)
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function DashboardPage() {
  const supabase = createServiceClient()

  const [data, jobData, protocolsRes, goalsRes, perksRes] = await Promise.all([
    getFinancialData(),
    getJobSearchData(),
    supabase?.from('hormone_protocols').select('name, dosage, day_of_week, time_of_day, is_active').eq('is_active', true) ?? Promise.resolve({ data: null }),
    supabase?.from('goals').select('id', { count: 'exact', head: true }).eq('status', 'active') ?? Promise.resolve({ count: null }),
    supabase?.from('perk_credits').select('amount, used, used_amount') ?? Promise.resolve({ data: null }),
  ])

  // ── Derived: runway & money ──
  // Cliff-aware: walks day by day so a confirmed income cutoff (e.g. TWC
  // benefits exhausting on a known date) actually moves the cash-out date,
  // instead of assuming today's burn rate holds forever.
  const { burnAnalysis, runwayProjection, assets, portfolio, actionItems, monthlyFlows, promos, debts } = data
  const liquid = assets.cash + assets.savings
  const cashOut = runwayProjection.cashOutDate ? new Date(runwayProjection.cashOutDate + 'T00:00:00') : null
  const runwayMonths = cashOut ? Math.max(0, (cashOut.getTime() - Date.now()) / (30.44 * 86400000)) : Infinity
  const meterPct = runwayMonths === Infinity ? 100 : Math.min(runwayMonths / 12, 1) * 100
  const burn = runwayProjection.phase === 'post-cliff' ? runwayProjection.postCliffMonthlyBurn : runwayProjection.preCliffMonthlyBurn
  const cliffDate = runwayProjection.cliffDate ? new Date(runwayProjection.cliffDate + 'T00:00:00') : null
  const showCliff = cliffDate && runwayProjection.phase === 'pre-cliff'
  const helocBal = debts.find(d => d.category === 'HELOC')?.balance ?? 0
  const helocLeft = HELOC_LIMIT - helocBal

  // ── Derived: today feed ──
  const today = new Date()
  const dow = DOW[today.getDay()]
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const openActions = actionItems.filter(i => (i.status ?? 'active') === 'active')
  const overdueActions = openActions.filter(i => i.dueDate && daysUntil(i.dueDate) < 0).length
  const actionsToday = openActions
    .filter(i => i.priority === 'red' || (i.dueDate && daysUntil(i.dueDate) <= 30))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    .slice(0, 4)

  const activePipeline = jobData.pipeline.filter(p => {
    const st = String(p.status ?? '').toLowerCase()
    return st === 'active' || st === 'waiting' || st === 'offer'
  })
  const jobToday = activePipeline
    .filter(p => p.next_step)
    .slice(0, 3)

  const protocolsToday = ((protocolsRes.data ?? []) as any[]).filter(p => {
    const d = p.day_of_week
    if (!d) return false
    const s = Array.isArray(d) ? d.join(',') : String(d)
    return s.toLowerCase().includes(dow.toLowerCase()) || s.toLowerCase() === 'daily'
  })

  const goalsCount = (goalsRes as any).count ?? null
  const perksUnclaimed = ((perksRes.data ?? []) as any[])
    .filter(p => !p.used)
    .reduce((s, p) => s + (Number(p.amount ?? 0) - Number(p.used_amount ?? 0)), 0)

  // ── Derived: money mini-chart ──
  const flows = monthlyFlows.slice(-6)
  const maxFlow = Math.max(...flows.flatMap(f => [f.income, f.spend]), 1)
  const upcomingPromos = [...promos]
    .filter(p => p.balance > 0 && daysUntil(p.expires) >= 0)
    .sort((a, b) => a.expires.localeCompare(b.expires))
    .slice(0, 3)

  const dot = (c: string) => (
    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: c }} />
  )

  return (
    <div className="px-6 md:px-10 py-8 space-y-5 max-w-[1200px]">

      {/* ── Header — derived from today, never frozen ── */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-1">Command Center</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {' · '}Post-JPMC · Stabilization
          </p>
        </div>
        {portfolio && (
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Portfolio today</div>
            <div className="font-mono font-bold text-[15px]" style={{ color: portfolio.dayChange >= 0 ? '#22c55e' : '#ef4444' }}>
              {portfolio.dayChange >= 0 ? '▲' : '▼'} {fmtRound(Math.abs(portfolio.dayChange))} ({portfolio.dayChangePct >= 0 ? '+' : ''}{portfolio.dayChangePct}%)
            </div>
          </div>
        )}
      </div>

      {/* ── 1. Runway ribbon — the season's headline ── */}
      <div className="rounded-xl px-5 py-4 flex items-center gap-6 flex-wrap"
        style={{
          background: 'linear-gradient(90deg, rgba(245,158,11,0.10), rgba(239,68,68,0.05))',
          border: '1px solid rgba(245,158,11,0.35)',
        }}>
        <div>
          <div className="font-mono text-[22px] font-bold" style={{ color: '#f59e0b' }}>
            {runwayMonths === Infinity ? '∞' : `${runwayMonths.toFixed(1)} mo`}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Cash runway</div>
        </div>
        <div className="flex-1 min-w-[140px] h-2 rounded-full relative" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${meterPct}%`, background: 'linear-gradient(90deg, #ef4444, #f59e0b)' }} />
        </div>
        {cashOut && (
          <div>
            <div className="font-mono text-[22px] font-bold text-[var(--text-primary)]">
              {cashOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Est. cash-out</div>
          </div>
        )}
        <div>
          <div className="font-mono text-[22px] font-bold" style={{ color: '#ef4444' }}>
            −{fmtRound(Math.max(burn, 0))}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            Net burn / mo{runwayProjection.phase === 'post-cliff' ? ' (post-benefits)' : ''}
          </div>
        </div>
        {showCliff && (
          <div>
            <div className="font-mono text-[22px] font-bold" style={{ color: '#fbbf24' }}>
              {cliffDate!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              Benefits end → burn jumps to {fmtRound(runwayProjection.postCliffMonthlyBurn)}/mo
            </div>
          </div>
        )}
        <Link href="/job-search" className="btn btn-primary ml-auto">
          Job pipeline →
        </Link>
      </div>

      {/* ── 2+3. Today feed + Money mini ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">

        {/* Today — across everything */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2"><ClipboardList size={14} strokeWidth={2} className="text-[var(--accent-cyan)]" /> Today — across everything</h3>
            <span className="text-[10px] text-[var(--text-muted)]">{dateLabel}</span>
          </div>

          <div>
            {actionsToday.map(item => (
              <Link key={item.id ?? item.title} href="/tasks"
                className="flex items-center gap-3 py-2 text-[12.5px] hover:bg-white/[0.02] transition-colors"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {dot(item.priority === 'red' ? '#ef4444' : item.priority === 'amber' ? '#f59e0b' : '#00d4ff')}
                <span className="flex-1 text-[var(--text-primary)] truncate">{item.title}</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                  {item.amount ? fmtRound(item.amount) + ' · ' : ''}{item.dueDate ? `${daysUntil(item.dueDate)}d` : 'open'}
                </span>
              </Link>
            ))}
            {jobToday.map((p, i) => (
              <Link key={`job-${i}`} href="/job-search"
                className="flex items-center gap-3 py-2 text-[12.5px] hover:bg-white/[0.02] transition-colors"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {dot('#8b5cf6')}
                <span className="flex-1 text-[var(--text-primary)] truncate">
                  {p.company}: {p.next_step}
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">job</span>
              </Link>
            ))}
            {protocolsToday.map((p, i) => (
              <Link key={`hp-${i}`} href="/health"
                className="flex items-center gap-3 py-2 text-[12.5px] hover:bg-white/[0.02] transition-colors"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {dot('#22c55e')}
                <span className="flex-1 text-[var(--text-primary)] truncate">{p.name} · {p.dosage}</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">{p.time_of_day ?? 'today'}</span>
              </Link>
            ))}
            {actionsToday.length + jobToday.length + protocolsToday.length === 0 && (
              <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">
                Clear day — nothing due across money, job search, or health.
              </div>
            )}
          </div>

          {/* Stat line */}
          <div className="flex gap-7 flex-wrap mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div className="font-mono text-[15px] font-bold text-[var(--text-primary)]">{fmtRound(liquid)}</div>
              <div className="text-[9.5px] uppercase tracking-widest text-[var(--text-muted)]">Liquid</div>
            </div>
            <div>
              <div className="font-mono text-[15px] font-bold text-[var(--text-primary)]">{portfolio ? fmtK(portfolio.value + portfolio.employerSupplement) : '—'}</div>
              <div className="text-[9.5px] uppercase tracking-widest text-[var(--text-muted)]">Portfolio</div>
            </div>
            <div>
              <div className="font-mono text-[15px] font-bold text-[var(--text-primary)]">{activePipeline.length}</div>
              <div className="text-[9.5px] uppercase tracking-widest text-[var(--text-muted)]">Pipeline cos.</div>
            </div>
            <div>
              <div className="font-mono text-[15px] font-bold text-[var(--text-primary)]">{protocolsToday.length}</div>
              <div className="text-[9.5px] uppercase tracking-widest text-[var(--text-muted)]">Protocols today</div>
            </div>
          </div>
        </div>

        {/* Money — this month */}
        <div className="glass-card p-5 flex flex-col">
          <h3 className="text-[13px] font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2"><ArrowLeftRight size={14} strokeWidth={2} className="text-[var(--accent-cyan)]" /> Money — this month</h3>
          <div className="flex items-end gap-[3px] h-[64px]">
            {flows.map(f => (
              <div key={f.month} className="flex-1 h-full flex items-end gap-[2px]" title={`${f.month}: in ${fmtRound(f.income)} / out ${fmtRound(f.spend)}`}>
                <div className="flex-1 rounded-t" style={{ height: `${(f.income / maxFlow) * 100}%`, background: 'rgba(34,197,94,0.8)', minHeight: 2 }} />
                <div className="flex-1 rounded-t" style={{ height: `${(f.spend / maxFlow) * 100}%`, background: 'rgba(239,68,68,0.65)', minHeight: 2 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-5 mt-3">
            <div>
              <div className="font-mono text-[14px] font-bold" style={{ color: '#22c55e' }}>
                {fmtRound(burnAnalysis.hasData ? burnAnalysis.monthlyIncome : 0)}
              </div>
              <div className="text-[9.5px] uppercase tracking-widest text-[var(--text-muted)]">In / mo</div>
            </div>
            <div>
              <div className="font-mono text-[14px] font-bold" style={{ color: '#ef4444' }}>
                {fmtRound(burnAnalysis.hasData ? burnAnalysis.monthlySpend : 0)}
              </div>
              <div className="text-[9.5px] uppercase tracking-widest text-[var(--text-muted)]">Out / mo</div>
            </div>
            <div>
              <div className="font-mono text-[14px] font-bold text-[var(--text-primary)]">{fmtK(helocLeft)}</div>
              <div className="text-[9.5px] uppercase tracking-widest text-[var(--text-muted)]">HELOC left</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-auto pt-4">
            {upcomingPromos.map(p => {
              const d = daysUntil(p.expires)
              return (
                <Link key={p.name} href="/financial"
                  className="text-[10.5px] px-2.5 py-1 rounded-full"
                  style={{
                    border: `1px solid ${d <= 21 ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.12)'}`,
                    color: d <= 21 ? '#f59e0b' : 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.03)',
                  }}>
                  <b>{new Date(p.expires + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</b>
                  {' '}{p.name.replace(/—.*/, '').trim()} · {fmtK(p.balance)}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 4. Section pulses ── */}
      <div className="flex flex-wrap gap-2.5">
        <Link href="/financial" className="text-[11.5px] px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
          <Wallet size={12} strokeWidth={2} className="inline mr-1 -mt-0.5" /> Financial · <b className="text-[var(--text-primary)]">live</b>
        </Link>
        <Link href="/job-search" className="text-[11.5px] px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
          style={{
            border: `1px solid ${activePipeline.length === 0 ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.1)'}`,
            background: activePipeline.length === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
            color: activePipeline.length === 0 ? '#f87171' : 'var(--text-secondary)',
          }}>
          <Briefcase size={12} strokeWidth={2} className="inline mr-1 -mt-0.5" /> Job Search · <b style={{ color: activePipeline.length === 0 ? '#ef4444' : 'var(--text-primary)' }}>{activePipeline.length === 0 ? 'pipeline empty' : `${activePipeline.length} active`}</b>
        </Link>
        <Link href="/health" className="text-[11.5px] px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
          <HeartPulse size={12} strokeWidth={2} className="inline mr-1 -mt-0.5" /> Health · <b className="text-[var(--text-primary)]">{protocolsToday.length} today</b>
        </Link>
        <Link href="/perks" className="text-[11.5px] px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
          <Gem size={12} strokeWidth={2} className="inline mr-1 -mt-0.5" /> Perks · <b className="text-[var(--text-primary)]">{fmtRound(perksUnclaimed)} unclaimed</b>
        </Link>
        <Link href="/goals" className="text-[11.5px] px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
          <Target size={12} strokeWidth={2} className="inline mr-1 -mt-0.5" /> Goals · <b className="text-[var(--text-primary)]">{goalsCount ?? '—'} active</b>
        </Link>
        <Link href="/tasks" className="text-[11.5px] px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
          style={{
            border: `1px solid ${overdueActions > 0 ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.1)'}`,
            background: overdueActions > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
            color: overdueActions > 0 ? '#f87171' : 'var(--text-secondary)',
          }}>
          <ClipboardList size={12} strokeWidth={2} className="inline mr-1 -mt-0.5" /> Actions · <b style={{ color: overdueActions > 0 ? '#ef4444' : 'var(--text-primary)' }}>{overdueActions > 0 ? `${overdueActions} overdue` : `${openActions.length} open`}</b>
        </Link>
      </div>
    </div>
  )
}
