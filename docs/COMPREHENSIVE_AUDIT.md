# MICCI-OS — Comprehensive Audit
**Date:** Sep 27, 2026 · **Auditor:** Claude (full repo + live DB + Vercel inspection)
**Verdict up front:** The platform is architecturally sound, feature-rich, and — as of today — running on clean data with every known pipeline bug root-caused and fixed. The gap between micci-os and a "finished" product is polish and habit-loop features, not foundations.

---

## 1. What exists today (feature inventory)

~33,400 lines of TypeScript. Next.js 16 / React 19 / Tailwind v4 / Supabase (Postgres 17 + pgvector) / Vercel. Zustand + TanStack Query state layer. 22 pages, 31 API routes.

| Module | Routes | State | Notes |
|---|---|---|---|
| Command center | `/dashboard` | ✅ mature | Summary + Up Next rail |
| Financial | `/financial` (8 tabs), `/finance/{paycheck,heloc,cashflow,scenarios,investments,tax}` | ✅ mature — the crown jewel | See §4 |
| Import | `/import` | ✅ mature | CSV dedup + Plaid auto-sync (2 banks, 8 accounts) |
| Goals + Vision | `/goals` | ✅ mature, unused | 480 goals, Foundation, in-place editing; 0 checked, quarterly review overdue |
| Planner | `/planner` | ✅ works, unused | Live week regeneration; 0 block completions |
| Tasks | `/tasks` | ✅ works | Unified action center, 9 open items |
| Job search | `/job-search`, `/pipeline/*` | ✅ works | Executive pipeline (5 opps), KPIs, outreach, recruiters |
| Health | `/health` (4 tabs) | ⚠️ thin + unused | 1,590 LOC vs financial's ~10x; see §5 |
| Perks | `/perks` | ✅ works | Amex credits auto-roll; MR balance stale since Apr |
| AI chat | floating panel | ✅ works | RAG over uploaded docs (pgvector) |

## 2. Data pipeline — current truth (all verified against live DB)

- **Transactions: 4,795 clean rows**, Jul 2024 → Sep 17, 2026. Two dedup passes ran Sep 27: 2,070 exact + 1,643 Amex posting-date-shifted cross-source duplicates removed (burn rate was ~2x inflated for Jul 2024–Jul 2026 before this).
- **Plaid**: Chase (checking, 4 cards, IRA) + Amex (Gold, Platinum) both `active`, sync proven end-to-end. Checking balance auto-updates on each sync.
- **Crons**: never fired in the app's life. Two stacked root causes, both now fixed: (1) `CRON_SECRET` never existed in Vercel (added Sep 18); (2) **the session proxy 307-redirected cookie-less cron requests to `/login` before the handler ran** — found and fixed Sep 27 (`src/proxy.ts` exempts the two cron GETs, which self-authenticate). After PR #19 merges + deploys, tomorrow's 11:00 UTC run is the first real test. Fallback if Vercel misbehaves: external pinger (see `CLOSEOUT_RUNBOOK.md` §1).
- **Prices**: `portfolio_history` has 2 manual snapshots ever; the weekday 21:00 UTC cron starts working with the same fix.
- Data still owed by Brandon: HELOC draw true-up, employer plan balance, home market value, MR points, lab results, quarterly goals review.

## 3. Security audit

**Fixed this month (verified live):**
- Both `SECURITY DEFINER` views → `security_invoker` (advisor ERRORs cleared)
- 4 functions' `search_path` pinned; `plaid_insert_transactions` created pinned
- Price cron endpoint was **fail-open** when `CRON_SECRET` unset — now fail-closed
- RLS verified by simulation: cross-user and anon access to `goal_progress`-style per-user rows return zero

**Architecture (sound, with caveats):**
- Auth: Supabase magic link + Google OAuth; session proxy gates every non-public path including all API routes.
- Two-tier data access: user-scoped client (RLS) for per-user tables; service client (RLS bypass) server-only for the single-tenant pipeline/financial tables, which are deny-all at the DB level.

**Open items, priority order:**
1. **11 service-client API routes have no in-route auth check** (`finance/accounts`, `finance/scenarios`, `planner/blocks`, `pipeline/log`, `investments/import-csv`, …). They're safe *only* because the proxy gates them — a single point of failure. A proxy matcher regression would expose financial data unauthenticated. **Enhancement: add a one-line `getUser()` guard to each** (~1 hr).
2. **Leaked-password protection** still off — Supabase dashboard → Authentication → Settings (1 click).
3. Vercel env vars stored as plain ("Needs Attention"): `SUPABASE_…ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — re-save as Sensitive.
4. `pgvector` in `public` schema (advisor WARN) — accepted; relocating breaks embedding columns.
5. Old goals-dashboard repo/PR #2: archive; its sync UI points at a dropped table and embeds this project's publishable key (harmless but untidy).

## 4. Finance dashboard — does it make sense?

**Yes — it's the most mature thing here, and its architecture is genuinely good**: pure-function calc engine (`lib/finance/`), everything derived from transactions (burn, subscriptions via cadence detection, cliff-aware runway walking day-by-day past the benefits end date), simulators wired through shared stores. 8 tabs + Tax Center + 6 simulators + Up Next rail.

**Where it needs improvement:**
1. **Tab overload.** 8 tabs + 6 separate simulator pages + Tax Center ≈ 15 finance surfaces. Post-stabilization (after Oct), consolidate: HELOC Plan + Debt Payoff are one story ("Debt"); Cash Flow tab vs `/finance/cashflow` simulator confuses — merge or cross-link clearly.
2. **Trust indicators.** After this month's silent double-counting, every derived number should show its provenance: "based on N transactions through DATE" tooltip on burn/runway. Cheap to add, prevents silently-wrong decisions.
3. **The runway number deserves alerting, not just display** — it's the single number that matters through October. A threshold change (>1 week shift) should surface on `/dashboard` and ideally email. Currently you must open the page to notice.
4. **Stale-supplement risk**: employer-plan value and Wealthfront are manual settings that silently age inside Net Worth. Show per-component as-of dates on the Net Worth tab.
5. **Anomaly surfacing**: the data exists to flag "new recurring charge detected" / "spend in category X 2x normal" on Overview — high value during stabilization mode, mostly reuses `recurring.ts`.

## 5. Health dashboard — enhancement design (requested)

Current state is 4 thin tabs (protocols checklist, labs table, fitness forms, skincare) with zero usage — because it's all manual entry with no feedback loop. The redesign principle that fixed finance applies here: **derive from data streams, don't ask for typing.**

**5a. Wearable integration — recommended: Whoop first.**
- **Whoop** has a proper OAuth2 REST API (developer.whoop.com) with recovery, strain, sleep, workouts, HRV, RHR. Server-side friendly — fits the existing Plaid-style pattern exactly: `whoop_items`-like token table, daily cron pull into `whoop_cycles` / `whoop_sleep` / `whoop_workouts`, same `CRON_SECRET` route shape. ~1–2 sessions of work now that the cron infrastructure works.
- **Apple Health has no server API** — data lives on-device. Realistic paths: (a) auto-export apps (Health Auto Export → webhook JSON to a new `/api/health/ingest` route) — cheap and good enough for steps/weight/workouts; (b) a future iOS shortcut posting daily summaries. Don't build a native app for this.
- Recommendation: **Whoop API + Health Auto Export webhook**, both landing in the same normalized tables so the UI doesn't care about source.

**5b. Protocol ⊕ Schedule side-by-side (requested).** Today protocols (`/health`) and the daily schedule (`/planner`) are separate pages though they're one day in real life. Build a unified "Today" panel: time-blocked schedule down the left, protocol checklist items pinned to their time slots on the right, one tap marks either. Data already exists (`schedule_blocks`, `protocol_compliance`) — this is a view-layer feature, ~1 session. This is also the highest-leverage *usage* fix: the reason streaks are at 0 is that checking off requires visiting two pages.

**5c. Workout tracker**: replace bare forms with template-based logging (repeat last workout, progressive-overload hints), auto-import from Whoop workouts, and a body-metrics trend chart fed by both manual entries and Health export weight. Schema already supports it (`workouts`, `body_metrics`).

**5d. Diet tracking**: full macro logging is a compliance graveyard — don't build it. Do the 80/20: (a) a daily 3-state check ("on protocol / partial / off") added to the protocol list — one tap, trend-chartable; (b) optionally auto-flag food-category spend from transactions (DoorDash/restaurants) as an objective "eating out" signal — the data's already in the finance tables.
- If real macro tracking is ever wanted, integrate MyFitnessPal/Cronometer export rather than building entry UI.

**5e. Labs**: with dates + values already stored, add reference-range bands and draw-window reminders (next trough window as an action item). Small.

## 6. Prioritized roadmap

| P | Item | Size | Why |
|---|---|---|---|
| 0 | Merge PR #19, verify tomorrow's cron ran | clicks | Everything else assumes live data |
| 0 | Leaked-password toggle; re-save 3 env vars as Sensitive | clicks | Last security WARNs |
| 1 | In-route auth guards on 11 service-client routes | 1 hr | Defense in depth for financial data |
| 1 | Runway alerting + provenance tooltips | 1 session | The October number, made trustworthy |
| 2 | Health "Today" panel (protocol ⊕ schedule) | 1 session | Turns health module from forms into a habit loop |
| 2 | Whoop integration (OAuth + daily cron) | 1–2 sessions | Reuses the now-working cron pattern |
| 2 | Mobile pass (Phase 5, deferred) | 1 session | Needs live-viewport check |
| 3 | Finance tab consolidation; anomaly cards | 1–2 sessions | Post-stabilization polish |
| 3 | Health Auto Export webhook; labs ranges; workout templates | 1–2 sessions | |
| 3 | Google Calendar sync (Phase 2B, never built) | 2+ sessions | Only if still wanted |
| — | Housekeeping: archive `brandon-goals-dashboard` (repo + Vercel), delete `goals-tracker` + `brandon-financial-plan` Vercel projects | clicks | `brandonmicci-web` Supabase project (Sep 7) belongs to the website workstream — not touched here |

## 7. Resuming work in any future session

Read in order: `CLAUDE.md` (root) → `docs/DATA_REFRESH_LOG.md` → `docs/CLOSEOUT_RUNBOOK.md` → this file. Supabase project `ptrcyxqybzqwwkridvze` (micci-os); Vercel project `micci-os` (team brandon-miccis-projects). All of this month's history and root-cause analysis is in those four files — no chat context required.
