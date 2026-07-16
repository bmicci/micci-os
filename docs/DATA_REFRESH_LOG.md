# Data Refresh Log — what needs uploading/refreshing, per section

Living document. Updated every time a build changes how a section gets its
data. Three categories:
- 🔴 **OWED** — data Brandon needs to provide (one-time or overdue)
- 🔁 **ROUTINE** — recurring refresh, with cadence and method
- ⚙️ **AUTO** — refreshes itself; listed so nobody re-builds it

_Last updated: Jul 14, 2026_

---

## 💰 Financial — transactions & balances

| Item | Type | How | Status |
|---|---|---|---|
| Checking + 6 card CSVs (2yr) | done | `/import` or `scripts/ingest_txns.mjs` | ✅ 4,112 txns imported (Jun) |
| **Citi Diamond transactions** | 🔴 OWED | Export CSV → send to Claude (format needs one-time verify) | Never imported |
| **Citi Best Buy transactions** | 🔴 OWED | Same | Never imported |
| Monthly CSV re-import (all 8 accounts) | 🔁 monthly | `/import` — dedup makes overlap safe | Last: mid-June |
| **Checking balance** | 🔴 stale | Tell Claude or update settings `assets.cash` | $2,678.76 as of Jun 15 — stale |
| **Wealthfront balance** | 🔁 monthly | Settings `assets.savings` | $20,128.04 as of Jun 16 |
| **Exact HELOC draw amounts** (Best Buy + CFU payoffs) | 🔴 OWED | From Texas CU statement → true-up `debt_accounts` | Estimated at $962.44 + $8,453.66 |
| Debt balances (cards/HELOC) | 🔁 as-paid | Tell Claude when payments/payoffs happen | Current as of Jul 7 payoffs |
| **TWC unemployment end date** | 🔴 OWED | TWC portal → drives runway model + action item | Assumed ~late Sep |
| Burn rate / spend categories | ⚙️ AUTO | Derives from imported transactions | — |
| Action items | ⚙️ AUTO | Check off in Overview Action Center | — |
| Promo schedule | 🔁 as-paid | Claude updates on each payoff | Next: Chase Prime Jul 22 |

## 📈 Investments

| Item | Type | How | Status |
|---|---|---|---|
| **Fresh IRA CSV (tax lots)** | 🔴 OWED | Chase export → `/finance/investments` import | Holdings are April lots |
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
