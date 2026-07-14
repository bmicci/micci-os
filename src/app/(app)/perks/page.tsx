import { createServiceClient } from '@/lib/supabase/service'
import PerksTab from '@/components/perks/PerksTab'
import type { DbPerkCredit } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Perks & Points — Micci OS' }

// ── Period auto-roll (rule: time never freezes) ─────────────────────────────
// Credits are calendar-aligned. When a credit's period has ended, roll it to
// the CURRENT period and reset usage — the tracker is always about now.

function currentPeriod(reset: string, today: Date): { start: string; end: string } {
  const y = today.getFullYear()
  const m = today.getMonth() // 0-based
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  switch (reset) {
    case 'monthly':
      return { start: iso(new Date(Date.UTC(y, m, 1))), end: iso(new Date(Date.UTC(y, m + 1, 0))) }
    case 'quarterly': {
      const q = Math.floor(m / 3) * 3
      return { start: iso(new Date(Date.UTC(y, q, 1))), end: iso(new Date(Date.UTC(y, q + 3, 0))) }
    }
    case 'semi-annual': {
      const h = m < 6 ? 0 : 6
      return { start: iso(new Date(Date.UTC(y, h, 1))), end: iso(new Date(Date.UTC(y, h + 6, 0))) }
    }
    default: // annual
      return { start: `${y}-01-01`, end: `${y}-12-31` }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function rollStalePeriods(supabase: any, credits: DbPerkCredit[]): Promise<DbPerkCredit[]> {
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const rolled: DbPerkCredit[] = []

  for (const c of credits) {
    if (c.period_end >= todayIso) { rolled.push(c); continue }
    const period = currentPeriod(c.reset_period, today)
    const patch = {
      period_start: period.start,
      period_end: period.end,
      used: false,
      used_amount: 0,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('perk_credits').update(patch).eq('id', c.id)
    rolled.push({ ...c, ...patch } as DbPerkCredit)
  }
  return rolled
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default async function PerksPage() {
  const supabase = createServiceClient()

  let credits: DbPerkCredit[] = []
  let mrBalance: number | null = null
  let mrAsOf: string | null = null

  if (supabase) {
    const [{ data: rawCredits }, { data: mrRow }] = await Promise.all([
      supabase
        .from('perk_credits')
        .select('*')
        .order('period_end', { ascending: true })
        .order('card_name', { ascending: true }),
      supabase.from('financial_settings').select('value').eq('key', 'mr_balance').maybeSingle(),
    ])

    credits = await rollStalePeriods(supabase, (rawCredits ?? []) as DbPerkCredit[])

    const mr = mrRow?.value as { balance?: number; as_of?: string } | null
    if (mr?.balance != null) {
      mrBalance = Number(mr.balance)
      mrAsOf = mr.as_of ?? null
    }
  }

  const totalUnused = credits
    .filter(c => !c.used)
    .reduce((s, c) => s + Number(c.amount), 0)
  const unusedCount = credits.filter(c => !c.used).length

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Page Header ── */}
      <header
        className="shrink-0 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
        }}
      >
        <div>
          <div
            className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1.5"
            style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}
          >
            AMEX PLATINUM ($895/yr) + GOLD ($325/yr) · $3,500+ ANNUAL VALUE
          </div>
          <h1 className="text-lg font-bold gradient-text">Perks &amp; Points Maximizer</h1>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Brandon Micci · {mrBalance != null ? `${mrBalance.toLocaleString('en-US')} MR Points` : '2 Amex Cards'}
            {mrBalance != null ? ' · 2 Amex Cards' : ''}
          </p>
        </div>
        <div className="text-right">
          {totalUnused > 0 ? (
            <>
              <div className="text-xl font-extrabold" style={{ color: '#f59e0b' }}>
                ${totalUnused.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                unclaimed across {unusedCount} credits
              </div>
            </>
          ) : (
            <>
              <div className="text-xl font-extrabold" style={{ color: '#22c55e' }}>
                All Used ✅
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                all current credits redeemed
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Dashboard ── */}
      <div className="flex-1 p-3 sm:p-6 max-w-[1400px] mx-auto w-full">
        <PerksTab initialCredits={credits} initialMrBalance={mrBalance} mrAsOf={mrAsOf} />
      </div>
    </div>
  )
}
