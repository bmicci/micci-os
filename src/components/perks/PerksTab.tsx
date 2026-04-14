'use client'

/*
 * PerksTab — Perks & Points Maximizer
 *
 * Supabase setup — run this SQL once in your Supabase dashboard:
 * ─────────────────────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS perk_credits (
 *   id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
 *   card_name    TEXT        NOT NULL CHECK (card_name IN ('platinum','gold')),
 *   credit_name  TEXT        NOT NULL,
 *   amount       NUMERIC(10,2) NOT NULL,
 *   reset_period TEXT        NOT NULL CHECK (reset_period IN ('monthly','quarterly','semi-annual','annual')),
 *   period_start DATE        NOT NULL,
 *   period_end   DATE        NOT NULL,
 *   used         BOOLEAN     NOT NULL DEFAULT false,
 *   used_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
 *   notes        TEXT,
 *   updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * ALTER TABLE perk_credits ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "authenticated_full_access" ON perk_credits
 *   FOR ALL USING (auth.role() = 'authenticated');
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DbPerkCredit } from '@/types/database'
import KPICard from '@/components/financial/KPICard'

// ── Constants ────────────────────────────────────────────────────
const DEFAULT_MR_BALANCE = 342_286

// ── Helpers ──────────────────────────────────────────────────────
function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
function fmtPoints(n: number) {
  return n.toLocaleString('en-US')
}
function getDaysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(dateStr)
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000)
}
function formatDateRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${s} – ${e}`
}

const PERIOD_ORDER = ['monthly', 'quarterly', 'semi-annual', 'annual'] as const
const PERIOD_LABELS: Record<string, string> = {
  monthly: '📅 Monthly',
  quarterly: '🗓️ Quarterly',
  'semi-annual': '📆 Semi-Annual',
  annual: '📋 Annual',
}

// ── Card Optimizer reference data ────────────────────────────────
const CARD_OPTIMIZER = [
  { category: '🛒 Groceries (U.S. supermarkets)', card: 'Gold', rate: '4x MR', note: 'Up to $25K/yr' },
  { category: '🍽️ Restaurants worldwide', card: 'Gold', rate: '4x MR', note: 'Up to $50K/yr' },
  { category: '✈️ Flights (direct or Amex Travel)', card: 'Platinum', rate: '5x MR', note: 'Up to $500K/yr' },
  { category: '✈️ Flights (alt — direct or Amex Travel)', card: 'Gold', rate: '3x MR', note: 'Full earning' },
  { category: '🏨 Prepaid hotels via Amex Travel', card: 'Platinum', rate: '5x MR', note: 'Must book via AmexTravel.com' },
  { category: '🏨 Prepaid hotels via Amex Travel (alt)', card: 'Gold', rate: '2x MR', note: 'Must book via AmexTravel.com' },
  { category: '💳 Everything else', card: 'CFU (Chase)', rate: '1.5% CB', note: 'Chase Freedom Unlimited cash back' },
]

// ── Seed data for fresh Supabase table (current period: Apr 2026) ─
const SEED_CREDITS: Omit<DbPerkCredit, 'id' | 'updated_at'>[] = [
  // ── Monthly (April 2026) ─────────────────────────────────────────
  { card_name: 'platinum', credit_name: 'Uber Cash', amount: 15, reset_period: 'monthly', period_start: '2026-04-01', period_end: '2026-04-30', used: false, used_amount: 0, notes: '$20 in December' },
  { card_name: 'platinum', credit_name: 'Walmart+ Membership', amount: 12.95, reset_period: 'monthly', period_start: '2026-04-01', period_end: '2026-04-30', used: false, used_amount: 0, notes: 'Statement credit for Walmart+ subscription' },
  { card_name: 'gold', credit_name: 'Dining Credit', amount: 10, reset_period: 'monthly', period_start: '2026-04-01', period_end: '2026-04-30', used: false, used_amount: 0, notes: 'Grubhub, Goldbelly, etc. — enrollment required' },
  { card_name: 'gold', credit_name: 'Uber Cash', amount: 10, reset_period: 'monthly', period_start: '2026-04-01', period_end: '2026-04-30', used: false, used_amount: 0, notes: 'Eats or rides — enrollment required' },
  { card_name: 'gold', credit_name: "Dunkin' Credit", amount: 7, reset_period: 'monthly', period_start: '2026-04-01', period_end: '2026-04-30', used: false, used_amount: 0, notes: null },
  // ── Quarterly (Q2 2026: Apr – Jun) ──────────────────────────────
  { card_name: 'platinum', credit_name: 'Resy Dining', amount: 100, reset_period: 'quarterly', period_start: '2026-04-01', period_end: '2026-06-30', used: false, used_amount: 0, notes: 'Enrollment required. $400/yr total.' },
  { card_name: 'platinum', credit_name: 'Lululemon', amount: 75, reset_period: 'quarterly', period_start: '2026-04-01', period_end: '2026-06-30', used: false, used_amount: 0, notes: 'Retail or online, excl. outlets. $300/yr total.' },
  // ── Semi-Annual (H1 2026: Jan – Jun) ────────────────────────────
  { card_name: 'platinum', credit_name: 'Hotel Collection', amount: 150, reset_period: 'semi-annual', period_start: '2026-01-01', period_end: '2026-06-30', used: false, used_amount: 0, notes: 'Fine Hotels + Resorts or Hotel Collection, 2-night min. $300/yr total.' },
  { card_name: 'platinum', credit_name: 'Saks Fifth Avenue', amount: 50, reset_period: 'semi-annual', period_start: '2026-01-01', period_end: '2026-06-30', used: false, used_amount: 0, notes: 'Saks or saks.com. $100/yr total.' },
  { card_name: 'gold', credit_name: 'Resy Credit', amount: 50, reset_period: 'semi-annual', period_start: '2026-01-01', period_end: '2026-06-30', used: false, used_amount: 0, notes: 'In-person dining at Resy restaurants. $100/yr total.' },
  // ── Annual (2026) ────────────────────────────────────────────────
  { card_name: 'platinum', credit_name: 'Airline Fee Credit', amount: 200, reset_period: 'annual', period_start: '2026-01-01', period_end: '2026-12-31', used: false, used_amount: 0, notes: 'One designated airline, must enroll. Incidental fees only.' },
  { card_name: 'platinum', credit_name: 'Global Entry / TSA PreCheck', amount: 100, reset_period: 'annual', period_start: '2026-01-01', period_end: '2026-12-31', used: false, used_amount: 0, notes: 'Reimbursed every 4–5 years.' },
]

// ── Component ────────────────────────────────────────────────────

export default function PerksTab({ initialCredits }: { initialCredits: DbPerkCredit[] }) {
  const [credits, setCredits] = useState<DbPerkCredit[]>(initialCredits)
  const [loading, setLoading] = useState(initialCredits.length === 0)
  const [mrBalance, setMrBalance] = useState(DEFAULT_MR_BALANCE)
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState(String(DEFAULT_MR_BALANCE))
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const supabase = createClient()

  // Auto-seed table if empty
  useEffect(() => {
    if (initialCredits.length === 0) {
      seedData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function seedData() {
    const { data, error } = await supabase
      .from('perk_credits')
      .insert(SEED_CREDITS)
      .select()
    if (!error && data) setCredits(data as DbPerkCredit[])
    setLoading(false)
  }

  async function toggleCredit(id: string, currentUsed: boolean) {
    setTogglingId(id)
    // Optimistic update
    setCredits(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, used: !currentUsed, updated_at: new Date().toISOString() }
          : c,
      ),
    )
    const { error } = await supabase
      .from('perk_credits')
      .update({ used: !currentUsed, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      // Revert on failure
      setCredits(prev =>
        prev.map(c => (c.id === id ? { ...c, used: currentUsed } : c)),
      )
    }
    setTogglingId(null)
  }

  function saveBalance() {
    const parsed = parseInt(balanceInput.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(parsed) && parsed >= 0) setMrBalance(parsed)
    setEditingBalance(false)
  }

  // ── Derived values ───────────────────────────────────────────────
  const creditsByPeriod = PERIOD_ORDER.reduce(
    (acc, p) => {
      acc[p] = credits.filter(c => c.reset_period === p)
      return acc
    },
    {} as Record<string, DbPerkCredit[]>,
  )

  const totalAvailable = credits.filter(c => !c.used).reduce((s, c) => s + Number(c.amount), 0)
  const totalUsed = credits.filter(c => c.used).reduce((s, c) => s + Number(c.amount), 0)
  const totalCredits = credits.reduce((s, c) => s + Number(c.amount), 0)

  const pointsAt1c = mrBalance * 0.01
  const pointsAt1_5c = mrBalance * 0.015
  const pointsAt2c = mrBalance * 0.02

  const upcomingDeadlines = credits
    .filter(c => !c.used)
    .sort((a, b) => new Date(a.period_end).getTime() - new Date(b.period_end).getTime())
    .slice(0, 8)

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Summary KPI Strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Credits Available"
          value={fmt(totalAvailable)}
          note={`${credits.filter(c => !c.used).length} of ${credits.length} unused this period`}
          accent="cyan"
        />
        <KPICard
          label="Credits Used"
          value={fmt(totalUsed)}
          note={`${credits.filter(c => c.used).length} of ${credits.length} redeemed`}
          accent="green"
        />
        <KPICard
          label="Total Period Credits"
          value={fmt(totalCredits)}
          note="across all current periods"
          accent="cyan"
        />
        <KPICard
          label="MR Points Balance"
          value={fmtPoints(mrBalance)}
          note={`≈ ${fmt(pointsAt1_5c)} at 1.5¢/pt`}
          accent="amber"
        />
      </div>

      {/* ── Points Balance Card ───────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
              💎 Membership Rewards Balance
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Amex Platinum + Gold — shared MR pool · Both cards earn into the same bucket
            </p>
          </div>
          <button
            onClick={() => {
              if (editingBalance) {
                saveBalance()
              } else {
                setBalanceInput(String(mrBalance))
                setEditingBalance(true)
              }
            }}
            className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
            style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: 'var(--accent-cyan)',
            }}
          >
            {editingBalance ? '✓ Save' : '✏️ Update Balance'}
          </button>
        </div>

        {/* Balance display / edit */}
        <div className="mb-5">
          {editingBalance ? (
            <div className="flex items-end gap-3">
              <input
                type="text"
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveBalance(); if (e.key === 'Escape') setEditingBalance(false) }}
                className="text-4xl font-extrabold bg-transparent border-b-2 outline-none"
                style={{ color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', width: '280px' }}
                autoFocus
              />
              <span className="text-lg pb-1" style={{ color: 'var(--text-muted)' }}>points</span>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="text-4xl font-extrabold gradient-text">
                {fmtPoints(mrBalance)}
              </div>
              <span className="text-lg pb-1" style={{ color: 'var(--text-muted)' }}>points</span>
            </div>
          )}
          <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Balance as of Apr 7, 2026 · Click &ldquo;Update Balance&rdquo; to change
          </div>
        </div>

        {/* Value at different redemption rates */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div
            className="p-3 rounded-lg text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              1¢ / point
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--text-secondary)' }}>
              {fmt(pointsAt1c)}
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Cash back / statement credit
            </div>
          </div>

          <div
            className="p-3 rounded-lg text-center"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.25)' }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--accent-cyan)' }}>
              1.5¢ / point
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--accent-cyan)' }}>
              {fmt(pointsAt1_5c)}
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Amex Travel bookings
            </div>
          </div>

          <div
            className="p-3 rounded-lg text-center relative"
            style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.35)' }}
          >
            <div
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold px-2 py-0.5 rounded-full"
              style={{ background: '#22c55e', color: '#050505' }}
            >
              BEST VALUE
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#22c55e' }}>
              2¢+ / point
            </div>
            <div className="text-xl font-bold" style={{ color: '#22c55e' }}>
              {fmt(pointsAt2c)}+
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Transfer partners
            </div>
          </div>
        </div>

        {/* Best redemption tip */}
        <div
          className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-[12px]"
          style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <span className="text-base shrink-0">💡</span>
          <div style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#22c55e' }}>Best redemption:</strong> Transfer to airline/hotel partners
            (Air France/KLM Flying Blue, Delta SkyMiles, Marriott Bonvoy, Hilton Honors) for 2¢+ per point.
            Your {fmtPoints(mrBalance)} points are worth{' '}
            <strong style={{ color: '#22c55e' }}>{fmt(pointsAt2c)}+</strong> in travel — don&apos;t cash them out at 1¢.
          </div>
        </div>
      </div>

      {/* ── Credits Tracker ───────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
              💳 Credits Tracker
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Click any row to toggle used / unused · Saved to Supabase instantly
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] shrink-0 pt-0.5">
            <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <span>✅</span> Used
            </span>
            <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <span>❌</span> Not Used
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Setting up credits tracker...
          </div>
        ) : (
          <div className="space-y-6">
            {PERIOD_ORDER.map(period => {
              const periodCredits = creditsByPeriod[period] ?? []
              if (periodCredits.length === 0) return null
              const remainingInPeriod = periodCredits
                .filter(c => !c.used)
                .reduce((s, c) => s + Number(c.amount), 0)

              return (
                <div key={period}>
                  {/* Period header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {PERIOD_LABELS[period]}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    {remainingInPeriod > 0 && (
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: 'var(--accent-cyan)' }}
                      >
                        {fmt(remainingInPeriod)} remaining
                      </span>
                    )}
                    {remainingInPeriod === 0 && (
                      <span className="text-[11px] font-semibold" style={{ color: '#22c55e' }}>
                        ✅ All used
                      </span>
                    )}
                  </div>

                  {/* Credit rows */}
                  <div className="space-y-1.5">
                    {periodCredits.map(credit => {
                      const isLululemon = credit.credit_name === 'Lululemon'
                      const daysLeft = getDaysUntil(credit.period_end)
                      const isExpiringSoon = !credit.used && daysLeft > 0 && daysLeft <= 21
                      const isToggling = togglingId === credit.id

                      return (
                        <div
                          key={credit.id}
                          onClick={() => !isToggling && toggleCredit(credit.id, credit.used)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                          style={{
                            background: credit.used
                              ? 'rgba(34,197,94,0.04)'
                              : 'rgba(255,255,255,0.025)',
                            border: `1px solid ${credit.used ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.07)'}`,
                            cursor: isToggling ? 'wait' : 'pointer',
                            opacity: isToggling ? 0.7 : 1,
                          }}
                        >
                          {/* Status icon */}
                          <div className="text-[15px] shrink-0 w-5 text-center">
                            {isToggling ? '⏳' : credit.used ? '✅' : '❌'}
                          </div>

                          {/* Card badge */}
                          <div
                            className="shrink-0 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={{
                              background:
                                credit.card_name === 'platinum'
                                  ? 'rgba(148,163,184,0.12)'
                                  : 'rgba(251,191,36,0.12)',
                              color:
                                credit.card_name === 'platinum' ? '#94a3b8' : '#fbbf24',
                              border: `1px solid ${credit.card_name === 'platinum' ? 'rgba(148,163,184,0.25)' : 'rgba(251,191,36,0.25)'}`,
                            }}
                          >
                            {credit.card_name === 'platinum' ? '💎 Plat' : '🥇 Gold'}
                          </div>

                          {/* Name + badges */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-[13px] font-medium"
                                style={{
                                  color: credit.used ? 'var(--text-muted)' : 'var(--text-primary)',
                                  textDecoration: credit.used ? 'line-through' : 'none',
                                }}
                              >
                                {credit.credit_name}
                              </span>
                              {/* Lululemon missed-Q1 warning */}
                              {isLululemon && (
                                <span
                                  className="text-[9px] font-extrabold px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                                >
                                  ⚠️ MISSED Q1
                                </span>
                              )}
                              {/* Expiring soon badge */}
                              {isExpiringSoon && (
                                <span
                                  className="text-[9px] font-extrabold px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}
                                >
                                  ⏰ {daysLeft}d left
                                </span>
                              )}
                            </div>
                            {credit.notes && (
                              <div
                                className="text-[10px] mt-0.5 truncate"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {credit.notes}
                              </div>
                            )}
                          </div>

                          {/* Amount + period dates */}
                          <div className="shrink-0 text-right ml-2">
                            <div
                              className="text-[14px] font-extrabold font-mono"
                              style={{ color: credit.used ? 'var(--text-muted)' : 'var(--accent-cyan)' }}
                            >
                              {fmt(Number(credit.amount))}
                            </div>
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {formatDateRange(credit.period_start, credit.period_end)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Card Optimizer ────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <h3 className="text-[14px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          🎯 Card Optimizer — Which Card to Use
        </h3>
        <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
          Quick-reference for maximizing Membership Rewards on every purchase
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
            <thead>
              <tr>
                <th
                  className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Category
                </th>
                <th
                  className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Card
                </th>
                <th
                  className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Earn Rate
                </th>
                <th
                  className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-widest hidden sm:table-cell"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {CARD_OPTIMIZER.map((row, i) => (
                <tr
                  key={i}
                  className="transition-colors hover:bg-white/[0.02]"
                  style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}
                >
                  <td className="px-3 py-3 rounded-l-lg" style={{ color: 'var(--text-primary)' }}>
                    {row.category}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          row.card === 'Gold'
                            ? 'rgba(251,191,36,0.14)'
                            : row.card === 'Platinum'
                            ? 'rgba(148,163,184,0.14)'
                            : 'rgba(59,130,246,0.14)',
                        color:
                          row.card === 'Gold'
                            ? '#fbbf24'
                            : row.card === 'Platinum'
                            ? '#94a3b8'
                            : '#60a5fa',
                      }}
                    >
                      {row.card}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className="text-[14px] font-extrabold font-mono"
                      style={{ color: 'var(--accent-cyan)' }}
                    >
                      {row.rate}
                    </span>
                  </td>
                  <td
                    className="px-3 py-3 text-right rounded-r-lg hidden sm:table-cell"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Upcoming Perk Deadlines ───────────────────────────────── */}
      <div className="glass-card p-5">
        <h3 className="text-[14px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          ⏰ Upcoming Perk Deadlines
        </h3>
        <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
          Unused credits sorted by expiration — don&apos;t leave money on the table
        </p>

        {upcomingDeadlines.length === 0 ? (
          <div
            className="py-10 text-center text-[13px] font-semibold rounded-lg"
            style={{ background: 'rgba(34,197,94,0.06)', color: '#22c55e' }}
          >
            🎉 All current-period credits have been used!
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingDeadlines.map(credit => {
              const days = getDaysUntil(credit.period_end)
              const urgency =
                days <= 0
                  ? 'expired'
                  : days <= 7
                  ? 'critical'
                  : days <= 21
                  ? 'high'
                  : days <= 45
                  ? 'medium'
                  : 'low'
              const urgencyColor = {
                expired: '#6b7280',
                critical: '#ef4444',
                high: '#f59e0b',
                medium: 'var(--accent-cyan)',
                low: 'var(--text-muted)',
              }[urgency]

              return (
                <div
                  key={credit.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: `1px solid ${urgency === 'critical' ? 'rgba(239,68,68,0.2)' : urgency === 'high' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  {/* Urgency indicator */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: urgencyColor }}
                  />

                  {/* Credit info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {credit.credit_name}
                      </span>
                      <span
                        className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider"
                        style={{
                          background:
                            credit.card_name === 'platinum'
                              ? 'rgba(148,163,184,0.12)'
                              : 'rgba(251,191,36,0.12)',
                          color: credit.card_name === 'platinum' ? '#94a3b8' : '#fbbf24',
                        }}
                      >
                        {credit.card_name}
                      </span>
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {credit.reset_period}
                      </span>
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Expires{' '}
                      {new Date(credit.period_end).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  {/* Amount + days remaining */}
                  <div className="shrink-0 text-right">
                    <div
                      className="text-[15px] font-extrabold font-mono"
                      style={{ color: 'var(--accent-cyan)' }}
                    >
                      {fmt(Number(credit.amount))}
                    </div>
                    <div className="text-[11px] font-bold mt-0.5" style={{ color: urgencyColor }}>
                      {days <= 0 ? 'EXPIRED' : `${days} day${days === 1 ? '' : 's'} left`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
