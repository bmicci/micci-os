import { createClient } from '@/lib/supabase/server'
import PerksTab from '@/components/perks/PerksTab'
import type { DbPerkCredit } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Perks & Points — Micci OS' }

export default async function PerksPage() {
  const supabase = await createClient()

  const { data: credits } = await supabase
    .from('perk_credits')
    .select('*')
    .order('period_end', { ascending: true })
    .order('card_name', { ascending: true })

  // Total unused credits for header callout
  const totalUnused = (credits ?? [])
    .filter((c: DbPerkCredit) => !c.used)
    .reduce((s: number, c: DbPerkCredit) => s + Number(c.amount), 0)

  const unusedCount = (credits ?? []).filter((c: DbPerkCredit) => !c.used).length

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
            Brandon Micci · 342,286 MR Points · 2 Amex Cards
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
        <PerksTab initialCredits={(credits ?? []) as DbPerkCredit[]} />
      </div>
    </div>
  )
}
