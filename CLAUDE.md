# MICCI OS — MASTER CONTEXT FOR CLAUDE CODE

Read this first. For deeper context read `docs/CLAUDE.md`, then the PRDs in `docs/prds/`.

---

## WHAT THIS APP IS

**micci-os** is Brandon Micci's personal life operating system — a working, mature Next.js 16 app (App Router, React 19, TypeScript strict, Tailwind v4) on Supabase (PostgreSQL + pgvector, all tables RLS-protected), deployed to Vercel.

**Owner:** Brandon Micci (brandon.micci@gmail.com)
**Repo:** github.com/bmicci/micci-os
**Supabase project:** ptrcyxqybzqwwkridvze (https://ptrcyxqybzqwwkridvze.supabase.co)

This is NOT a greenfield build. Every section below is built and live. Do not scaffold, re-seed, or re-create things that exist — verify current state before changing anything.

## CURRENT STATE (all routes live under `src/app/(app)/`)

| Route | Section | State |
|---|---|---|
| `/dashboard` | Command center summary | ✅ live |
| `/financial` | 8-tab financial dashboard (Overview · Cash Flow · Spending · HELOC Plan · Debt Payoff · Subscriptions · Investments · Net Worth) | ✅ live from Supabase |
| `/finance/*` | Simulators: paycheck, heloc, cashflow, scenarios, investments, tax | ✅ live |
| `/perks` | Amex credits + MR points tracker (auto-rolling periods) | ✅ live |
| `/goals` | Goals + Vision (480 goals, Foundation tab, in-place editing) | ✅ live |
| `/planner` | Live date-driven week + archived Battle Plan | ✅ live |
| `/job-search` | Pipeline, KPIs, outreach, recruiters — full CRUD | ✅ live |
| `/tasks` | Unified Action Center (`action_items` table, all life areas) | ✅ live |
| `/health` | Protocols, labs, fitness | ✅ live |
| `/import` | CSV/document import with dedup (8 financial accounts) | ✅ live |

## KEY ARCHITECTURE (do not violate)

1. **Supabase is the single source of truth.** No hardcoded financial data — `src/lib/financial-data.ts` holds types + fallbacks only; `src/lib/financial-data-service.ts` fetches and maps everything. Data enters via `/import` (CSV) or in-app editing.
2. **Financial math lives in `src/lib/finance/`** — pure functions (paycheck, heloc, cashflow, projections, debt, txnAggregate, recurring). Components never calculate.
3. **Live derivations** (never re-hardcode these):
   - Spend categories, burn rate, monthly flows — derived from imported `transactions` (`txnAggregate.ts`)
   - Cliff-aware runway — `computeRunwayProjection()` walks day-by-day past the benefits end date
   - Recurring subscriptions/bills — detected from transactions by cadence + amount stability (`recurring.ts`); zombie flags cross-check the 2025 audit cancel list
   - HELOC accounts/KPIs/waterfall — derived from live `debt_accounts`
   - Portfolio value — `portfolio_positions` + daily price cron + employer-plan supplement
4. **RLS everywhere; service client is server-only.** Never hardcode a user UUID.
5. **Recharts components are client components**; data fetching stays in server components.
6. **`fetchAllTxns` pages past Supabase's 1,000-row cap** — never use a bare `.select()` on `transactions`.

## DESIGN SYSTEM (non-negotiable — match exactly)

CSS variables in `globals.css`: `--bg-base #050505`, `--bg-elevated #0a0e27`, `--accent-cyan #00d4ff`, `--accent-gradient linear-gradient(135deg,#00d4ff,#1e90ff)`, `--card-bg rgba(255,255,255,0.05)`, `--card-border rgba(0,212,255,0.2)`, text `#f0f6ff` / 60% / 35%.
Glass card: card-bg + card-border, 16px radius, `backdrop-filter: blur(20px)`; hover lifts −4px with cyan glow. Font: Geist Sans. Mobile: single column < 768px, bottom tab bar.

## FINANCIAL CONTEXT (July 2026)

- Brandon left JPMC March 19, 2026; HELOC closed in time (Texas CU, $190K limit @ 6.85%). Now in **stabilization mode**: unemployment income bridge (TWC benefits end Oct 2026), job search active.
- High-rate debt rolled to HELOC; remaining 0% promos paid from HELOC as they expire. Mortgage: BofA ~$498K @ 3.375% (hold).
- The runway projection (cash-out date) is the number that matters — it lives in the `/financial` page header.
- Current balances, statuses, and what data is owed/stale: **`docs/DATA_REFRESH_LOG.md`** — read it before touching data, update it after changing how a section gets data.

## MONTHLY DATA ROUTINE (Brandon's side)

Export the 8 account CSVs → drop at `/import` (dedup makes overlap safe) → glance `/financial` Overview → act on red items. Investments: Chase CSV at `/finance/investments`. Everything else derives automatically.

## DOCS MAP

| File | Purpose |
|---|---|
| `docs/CLAUDE.md` | Full project context, structure, architectural rules |
| `docs/DATA_REFRESH_LOG.md` | Living log: what data is owed / routine / auto, per section |
| `docs/IMPLEMENTATION_PLAN.md` | Phase plan (mostly complete; Plaid + polish phases remain) |
| `docs/WEEKEND_PLAN.md` | Jul 2026 finalization plan (Phases 3–4 completed Jul 24) |
| `docs/prds/*` | Per-module PRDs |

## WHAT NOT TO CHANGE

- Auth (magic link + Google OAuth) — working
- AI Chat (`AIChat.tsx` + `/api/chat/`) — working
- Document upload/import pipeline — working; extend, don't replace
- `AnimatedBackground.tsx` — keep as-is
- Existing RLS policies — don't modify without explicit approval
