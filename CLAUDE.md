# MICCI OS — MASTER CONTEXT FOR CLAUDE CODE

Read this first, then **`docs/ROADMAP.md`** (what's next + open issues). For deeper context read `docs/CLAUDE.md`, then the PRDs in `docs/prds/`.

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
| `/finance/*` | Simulators: paycheck, heloc, cashflow, scenarios, investments, tax, calculators; `/finance/plan` Master Plan (plan vs live balances, cash ledger, card payoff tracker) | ✅ live |
| `/perks` | Amex credits + MR points tracker (auto-rolling periods) | ✅ live |
| `/goals` | Goals + Vision (480 goals, Foundation tab, in-place editing) | ✅ live |
| `/planner` | Live date-driven week + archived Battle Plan | ✅ live |
| `/pipeline` | Job search: target companies, contacts, daily log (`/job-search` redirects here; the older `job_*` tracker tables are kept but unused) | ✅ live |
| `/briefs` | Morning briefs hub, one tab per brief, written by Grok bots (`/markets` redirects to its Markets tab) | ✅ live |
| `/tasks` | Unified Action Center (`action_items` table, all life areas) | ✅ live |
| `/health` | Protocols, labs, fitness | ✅ live |
| `/import` | CSV/document import with dedup + Plaid bank auto-sync (Chase, Amex, Citi, PayPal, BofA; daily 11:00 UTC cron + on-demand) — live since Sep 18, 2026 | ✅ live |

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

**Aurora glass** (Oct 2026 redesign). Tokens in `globals.css`: `--bg-base #070b1a` (ink), `--bg-elevated #0d1330`, `--accent-cyan #5ee6ff` (+ `--accent-rgb` for `rgba(var(--accent-rgb), a)`), `--accent-violet #a78bfa` (second data color), `--accent-gradient` cyan→violet, glass `--glass-bg` white 7% / `--glass-line` white 14% / `--glass-highlight` / `--glass-blur 24px`, text `#f2f5ff` / 74% / 62% (muted must stay ≥4.5:1).
Color ratio: ~60% ink base, ~30% glass, <10% accent. Cyan is for actions and headline numbers only; borders use `--glass-line`, not cyan. Glass card: `.glass-card` (16px radius, blur + saturate, inset top highlight). The `.ambient-glow` layer in `(app)/layout.tsx` sits behind content so the blur has something to frost; keep `<main>` and page wrappers transparent. Use the tokens for new code; literal `#5ee6ff` remains only where a component appends hex-alpha suffixes or feeds a chart prop. Font: Geist Sans. Mobile: single column < 768px, bottom tab bar.

## FINANCIAL CONTEXT (November 2026)

- Brandon left JPMC March 19, 2026. Unemployment benefits ended Oct 2026. He accepted a job at **Schwab**, starting Nov 16, 2026 (semi-monthly pay; first payday assumed Nov 30, to confirm; details in `financial_settings.job_offers`). The Southwest contract fell through. The app is moving from stabilization to rebuild.
- High-rate debt rolled to the HELOC (Texas CU, $190K limit @ 6.85%); remaining 0% promos are paid from the HELOC as they expire. Mortgage: BofA ~$498K @ 3.375% (hold).
- The runway projection lives in the `/financial` header and the dashboard. With a job whose pay covers spend it reports a **cash gap** (days below $0 before pay catches up) instead of a cash-out date; see `computeRunwayProjection`.
- **Strategic plan:** the agreed plan is **v16** (Nov 16, 2026). `/finance/plan` (Master Plan) compares it with live balances. The plan is data in `financial_settings.strategic_plan`, generated from the workbook by `scripts/export-strategic-plan.py` into `supabase/migrations/20261116_strategic_plan_v16.sql`. The database holds **v8** until that migration is applied; do not apply it, or any later plan, without Brandon's explicit approval.
- Vercel previews use the **real** database. Never mutate data from a preview or a script without approval.
- Current balances, statuses, and what data is owed/stale: **`docs/DATA_REFRESH_LOG.md`** — read it before touching data, update it after changing how a section gets data.

## MONTHLY DATA ROUTINE (Brandon's side)

Chase, Amex, Citi, PayPal and BofA transactions and balances sync automatically via Plaid (daily cron; do NOT also CSV-import those accounts — cross-source dedup can't match their differing account names). Remaining manual: loans and the HELOC that are not linked (see `docs/DATA_REFRESH_LOG.md`), Chase investments CSV at `/finance/investments`, and a glance at `/financial` Overview for red items. Cron auth: `CRON_SECRET` env var in Vercel (added Sep 18, 2026 — without it both crons silently 401'd; that was why data froze at Jul 24).

## DOCS MAP

| File | Purpose |
|---|---|
| `docs/ROADMAP.md` | **Start here each session** — waiting-on-Brandon, testing, build queue (GitHub issues) |
| `docs/CLAUDE.md` | Full project context, structure, architectural rules |
| `docs/DATA_REFRESH_LOG.md` | Living log: what data is owed / routine / auto, per section |
| `docs/SECURITY.md` | Access policy (SSO + MFA), machine endpoints, headers |
| `docs/GROK_BRIEFS_HANDOFF.md` | How the Grok brief bots write to the briefs hub |
| `docs/MCP_CONNECTOR.md` · `docs/MCP_LAYER_PROPOSAL.md` | Claude connector and the shared tool registry (`src/lib/mcp/`) |
| `docs/archive/*` | Finished plans (Jul 2026 implementation + weekend plans) — history only |
| `docs/prds/*` | Per-module PRDs |

## WHAT NOT TO CHANGE

- Auth — Google SSO (allowlisted owner) + TOTP second factor, enforced in `src/proxy.ts`, every API route, and every server page (`await requireOwnerPage()` first; a test enforces it); see `docs/SECURITY.md`. Don't loosen it
- AI Chat (`AIChat.tsx` + `/api/chat/`) — working
- Document upload/import pipeline — working; extend, don't replace
- `AnimatedBackground.tsx` — keep as-is
- Existing RLS policies — don't modify without explicit approval
