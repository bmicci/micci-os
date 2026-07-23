# Data Refresh Log — what needs uploading/refreshing, per section

Living document. Updated every time a build changes how a section gets its
data. Three categories:
- 🔴 **OWED** — data Brandon needs to provide (one-time or overdue)
- 🔁 **ROUTINE** — recurring refresh, with cadence and method
- ⚙️ **AUTO** — refreshes itself; listed so nobody re-builds it

_Last updated: Jul 17, 2026_

---

## 💰 Financial — transactions & balances

| Item | Type | How | Status |
|---|---|---|---|
| Checking + 6 card CSVs (2yr) | done | `/import` or `scripts/ingest_txns.mjs` | ✅ 4,112 txns imported (Jun) |
| Citi Diamond transactions | ⚙️ AUTO | Confirmed via Jun statement: $0 purchases/fees/interest this cycle — only txn is the autopay, already captured on the Chase Checking side | ✅ balance $11,879, limit $14,800, BT 0% thru 6/18/27 |
| Citi Best Buy (4802) transactions | ⚙️ AUTO | Confirmed via Jul statement: $0 purchases this cycle — Promo 1 ($962.44) fully paid off, only Promo 2 remains | ✅ balance $860.40, limit $10,000, Promo 2 0% expires 12/27/26 ($342.12 deferred-interest risk — new action item added) |
| Monthly CSV re-import (all 8 accounts) | 🔁 monthly | `/import` — dedup makes overlap safe | Last: mid-June |
| Checking balance | 🔁 as-provided | Tell Claude or update settings `assets.cash` | ✅ $2,911.92 as of Jul 14 (Chase5332 CSV; 28 txns 6/23–7/14 imported) |
| Wealthfront balance | 🔁 monthly | Settings `assets.savings` | ✅ $12,186.53 as of Jul 8 — down $8K from 3 draws to checking (6/24, 6/25, 7/8) |
| **Exact HELOC draw amounts** (Best Buy + CFU payoffs) | 🔴 OWED | From Texas CU statement → true-up `debt_accounts` | Estimated at $962.44 + $8,453.66 |
| Debt balances (cards/HELOC) | 🔁 as-paid | Tell Claude when payments/payoffs happen | Current as of Jul 7 payoffs |
| Chase Prime Visa (...9313) | ⚙️ AUTO | Wasn't tracked at all — added via Jun statement. Bad action item ($1,398 "pay from HELOC") deleted: card is 6 Equal Pay 0% installments (no deferred-interest cliff, unlike Citi), already on autopay | ✅ added — balance $1,677.54, $556.13/mo autopay covers it, no HELOC action needed |
| TWC unemployment end date | ✅ confirmed | TWC portal → `income_bridge.benefits_end_date` | Final benefit week Oct 4–10, 2026 (14 wks × $605 left) |
| Cliff-aware runway | ⚙️ AUTO | `computeRunwayProjection()` walks day-by-day: current burn until `benefits_end_date`, full spend (no income) after — real cash-out date, not a flat liquid÷burn guess | ✅ built Jul 17 — cash-out ≈ Oct 17, 2026 (liquid cash and benefits both run out within ~a week of each other) |
| Burn rate / spend categories | ⚙️ AUTO | Derives from imported transactions | — |
| Action items | ⚙️ AUTO | Check off in Overview Action Center | — |
| Promo schedule | 🔁 as-paid | Claude updates on each payoff | Next real deferred-interest deadline: Best Buy Promo 2, Dec 27 |

## 📈 Investments

| Item | Type | How | Status |
|---|---|---|---|
| IRA tax lots (portfolio_positions) | 🔁 as-provided | Chase export → send to Claude (import route is upsert-only, doesn't drop sold positions — reconciled by hand this time) | ✅ Jul 22 lots — value ≈$170,282. Sold IAU/SLV/SLVP/XLV, bought ITA/DTCR/VXUS |
| **Employer plan positions/balance** | 🔴 OWED | Chase export, or just tell Claude the balance | Manual $29,467 supplement (June) |
| Prices + day-change + history | ⚙️ AUTO | Daily cron 4pm ET + manual refresh button | Working |
| Portfolio value in Net Worth | ⚙️ AUTO | Derives from positions + employer supplement | — |

## 🏠 Home value

| Item | Type | How | Status |
|---|---|---|---|
| **Market value (vs DCAD assessed)** | 🔴 OWED | Glance at Zillow → tell Claude (sets `home_market`) — or sign up for free RentCast API key for auto-daily | Net worth uses assessed $850K |

## 💎 Perks & Points

| Item | Type | How | Status |
|---|---|---|---|
| Credit periods | ⚙️ AUTO | Auto-roll on page load (Jul periods live) | ✅ |
| Credit used/unused | 🔁 as-used | Click rows in the tracker | Fresh period — all unused |
| **MR points balance** | 🔁 monthly | "Update Balance" button (persists now) | 342,286 unconfirmed since Apr 7 |

## 🚀 Job Search

| Item | Type | How | Status |
|---|---|---|---|
| Pipeline opportunities | 🔁 as-happens | Pipeline tab → + Add / edit / status | Empty (rebuild mode) — add real ones |
| Weekly KPI actuals (apps/outreach/posts) | 🔁 weekly | KPIs tab — editable, row auto-creates Mondays | Week of 7/6 at zeros |
| Outreach log / content ideas | 🔁 as-happens | Tabs write to their tables | Empty (fiction purged) |
| Recruiter statuses | 🔁 as-contacted | Recruiters tab | Korn Ferry + Spencer Stuart seeded `to_contact` |

## 🏋️ Health

| Item | Type | How | Status |
|---|---|---|---|
| Protocol compliance (daily checkboxes) | 🔁 daily | Protocols tab checklist | Unused (streak 0) |
| **Lab results** | 🔴 timely | Labs tab + Add Result — optimal draw window was Jul 12–13 (trough) | 8 markers on file |
| Workouts / body metrics | 🔁 as-done | Fitness tab forms | Sparse |

## 🎯 Goals + Vision

| Item | Type | How | Status |
|---|---|---|---|
| Goals add/edit/complete | 🔁 as-lived | Fully self-service in UI | 480 goals, 0 checked |
| Foundation (values/affirmations/etc.) | 🔁 as-desired | Hover pencil → edit | Migrated + verified |
| Quarterly review | 🔁 quarterly | Banner in Goals tab | Due |

## 📅 Planner / ✅ Tasks

| Item | Type | How | Status |
|---|---|---|---|
| This Week schedule | ⚙️ AUTO | Regenerates from `LIVE_TEMPLATE` + today's date every load | ✅ rebuilt Jul 14 |
| Daily block completions | 🔁 daily | Tap a block in This Week — keyed by real date, not week #  | Fresh, 0 checked |
| Custom/edited blocks (This Week) | 🔁 as-desired | Edit mode → ✏/✕/add — persists to `schedule_blocks` (`week=0`) | Empty |
| Battle Plan (Feb 27–Mar 31) | — | Archived read-only under Planner → Archive tab | 🔒 frozen, preserved |
| Unified actions (all life areas) | 🔁 as-happens | /tasks Action Center — add/edit/check off; Financial Overview rail shows money-scoped view of the same list | ✅ merged Jul 14 (13 items, `action_items` + category) |
