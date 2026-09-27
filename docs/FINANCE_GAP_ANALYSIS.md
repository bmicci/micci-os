# Finance Module vs. Monarch / Origin — Gap Analysis
**Date:** Sep 27, 2026 · Companion to `COMPREHENSIVE_AUDIT.md` §4

Goal: make micci-os a comprehensive personal finance + investments dashboard.
Reference points: Monarch Money (best-in-class aggregation/budgeting/reports)
and Origin (planning + tax + equity + advice bundle).

## Where micci-os is already AHEAD of both

These exist here and in neither product — they're the reason micci-os is worth
building instead of paying $8–15/mo:

- **Cliff-aware runway model** — day-by-day cash walk past the benefits end
  date. Monarch has nothing like it; this is the killer feature for 2026.
- **Scenario engine + paycheck/HELOC/cashflow simulators** — Monarch has no
  what-if modeling at all; Origin's is shallow (retirement sliders).
- **Debt strategy depth** — HELOC drawdown plan, deferred-interest promo
  deadline tracking (the Dec 27 Best Buy cliff), payoff waterfalls.
- **Context integration** — job pipeline, goals, planner, health in the same
  system; an AI chat with RAG over your own documents.
- **Tax lot awareness** — actual lots from Chase imports, not just balances.
- **Own your data** — single-tenant Postgres, no aggregator selling insights.

## Where Monarch/Origin are ahead — the real gap list

| # | Capability | Monarch/Origin | micci-os today | Gap size |
|---|---|---|---|---|
| 1 | **Institution coverage** | 13k+ institutions, auto-everything | Plaid: Chase + Amex only. Manual: Citi ×2, Texas CU HELOC, BofA mortgage, Wealthfront, employer 401k | **The big one** |
| 2 | **Budgeting workflow** | Category budgets, flex/rollover, targets vs actual | Spending view (actuals only); `budget_categories` table exists but no target-setting UI | Large |
| 3 | **Categorization rules** | User rules engine, ML recategorize, split transactions, merchant rename | Static `PLAID_CATEGORY_MAP` + CSV import mapping; no rules UI, no splits | Large |
| 4 | **Investment analytics** | Performance (TWR) vs benchmarks, allocation vs target, dividend income | Holdings, daily prices, value; `portfolio_targets` table exists unused; no returns calc, no drift view | Medium (schema half-built) |
| 5 | **Alerts/notifications** | Email/push: low balance, new recurring, large txn, bill due | None — everything requires opening the app | Medium |
| 6 | **Net worth history** | Continuous trend from day 1 | Point-in-time; `balance_snapshots` table exists; home value static assessed | Small–medium |
| 7 | **Reports/export** | Flexible reports, CSV export anywhere | Charts per tab; no export | Small |
| 8 | **Mobile app** | Native iOS/Android + widgets | Responsive web only | Accept (PWA at most) |
| 9 | **Origin: tax filing** | Built-in filing | n/a — TurboTax covers it | Non-goal |
| 10 | **Origin: estate docs, managed investing, human CFP** | Bundled | `estate_documents` table exists for doc tracking; rest non-goal | Non-goal |
| 11 | **Household/multi-user** | Partner sharing | Single-tenant by design | Non-goal |

## Build plan to close the gaps that matter

**Phase A — Aggregation completeness (highest leverage, mostly config not code)**
The Plaid integration is multi-institution already; the Import Center "connect
bank" flow just hasn't been pointed at the rest:
1. Connect via Plaid Link: **Citi** (both cards), **Bank of America** (mortgage
   balance), **Wealthfront** (balance) — likely all supported by Plaid.
   Texas CU HELOC: try Plaid; credit unions are hit-or-miss — else keep manual.
2. Employer 401k: usually the holdout; keep the manual supplement, but show
   its as-of date (audit §4.4).
3. Result: near-zero manual balance upkeep; net worth and runway go fully live.

**Phase B — Investments analytics (schema exists, finish it)**
1. Allocation vs `portfolio_targets` with drift % and rebalance-suggestion
   card.
2. Simple performance: daily portfolio value series already accumulates once
   the price cron lives → add TWR vs SPY/AGG benchmark lines on a chart.
3. Dividend/income tracking from Chase transaction imports (they're in the
   CSV as categories already).

**Phase C — Budget + rules (the Monarch core)**
1. Rules engine: `category_rules` table (merchant/regex/amount → category),
   applied at import time + retroactive "apply to existing" — kills most
   manual categorization pain.
2. Split transactions (one txn → n category rows; schema: parent_txn_id).
3. Budget targets per category with month rollover; Spending tab gains
   target-vs-actual bars (UI pattern already exists in KPI cards).

**Phase D — Alerts (small but transformative)**
Daily cron (pattern now proven) evaluating: runway shift >1wk, new recurring
detected, deferred-interest deadline <30d, large/unusual txn, data staleness.
Delivery: email via Resend (free tier) — no native app needed.

**Phase E — Polish**
Net-worth snapshot cron into `balance_snapshots` (1-line addition to the
daily sync) + trend chart; RentCast home value; CSV export buttons; PWA
manifest for phone home-screen.

## Honest bottom line

Monarch's moat is aggregation breadth and mobile; Origin's is bundled
services. Neither is hard-blocked for you: Phase A closes most of the
aggregation gap with configuration, and phases B–D are 4–6 focused sessions
on schema that half-exists. After that, micci-os is not "as good as"
Monarch for your use — it's strictly better, because the modeling layer
(runway, scenarios, debt strategy) doesn't exist in any commercial product.
