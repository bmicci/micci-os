# Financial Dashboard — Context & Rebuild Plan

## What This Is

`micci-os` is a personal OS dashboard built in Next.js 15 + Supabase. The `/financial` route
is the Financial Command Center — a full rebuild of an HTML prototype called
**Financial Master Plan 2026** that had 8 tabs of rich data.

The goal is to rebuild all 8 tabs as a polished, data-driven `/financial` page inside micci-os.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, RSC)
- **DB:** Supabase (Postgres) with RLS — all tables use UUID PKs
- **Auth:** Supabase Auth (single-user app — RLS allows any `authenticated` user)
- **Styling:** Tailwind CSS + CSS variables (`var(--text-primary)`, `var(--accent-cyan)`, etc.)
- **Charts:** Recharts (already installed)
- **Deploy:** Vercel

### Key file paths
```
src/app/(app)/financial/page.tsx          ← server component, fetches all data
src/components/financial/                 ← all financial sub-components
  KPIStrip.tsx
  ModuleTracker.tsx
  DebtTable.tsx
  DebtDonut.tsx
  DeadlineTimeline.tsx
  SubscriptionBurn.tsx
  TaxSnapshot.tsx
  BudgetBreakdown.tsx
src/lib/supabase/server.ts                ← createClient() for RSC
supabase/schema.sql                       ← table definitions
supabase/seed.sql                         ← real seed data
```

---

## Database Tables (all UUID PKs, RLS enabled)

### `financial_modules`
```sql
id, module_number INT, name TEXT, category TEXT,
status TEXT,   -- 'not_started' | 'in_progress' | 'complete'
progress INT,  -- 0–100
description TEXT, details JSONB
```

### `debt_accounts`
```sql
id, name, account_type TEXT,  -- 'credit_card'|'loan'|'mortgage'|'heloc'|'other'
balance DECIMAL, interest_rate DECIMAL, minimum_payment DECIMAL,
due_day INT, status TEXT, recommendation TEXT, notes TEXT
```

### `subscriptions`
```sql
id, name, amount DECIMAL, billing_cycle TEXT,
category TEXT, action TEXT,  -- 'cancel'|'review'|'keep'|'essential'
notes TEXT, is_active BOOLEAN
```

### `budget_categories`
```sql
id, name, monthly_actual NUMERIC, annual_actual NUMERIC,
survival_budget NUMERIC, pct_of_total NUMERIC, color TEXT
```

---

## The 8 Original Tabs to Rebuild

### Tab 1 — Overview
- KPI cards: Total Debt (excl mortgage), Immediate HELOC Roll ($110,630), Monthly Payment Relief ($2,860), March Cash Buffer (~$3,686), HELOC Available ($85K), Modules complete
- Action items list (urgent, amber, blue priorities)
- Module progress grid
- Debt breakdown donut chart
- Key Deadlines table

### Tab 2 — March Runway
- KPI: Starting balance ~$8K, Mar 15 paycheck $4,652, Partial check ~$1,598, Total ~$14,250, Obligations ~$10,564, Buffer ~$3,686
- Bill calendar table (sorted by due date)
- Cash flow timeline chart

### Tab 3 — HELOC Plan
- KPI: Limit $190K (Loan Depot 6.85%), Immediate Roll $110,630, After Roll $79,370, Monthly HELOC Interest $777, Monthly Relief $2,860, Annual Gain $34,323
- Decision matrix table: roll vs keep (cutoff 6.85%)
- Before/after monthly payment bar chart
- HELOC utilization waterfall

### Tab 4 — Debt Tracker
- KPI: Total debt (excl mortgage), High-rate >6.85%, 0% Promo balances, Below HELOC rate
- Sortable debt table
- Debt by category donut
- Rate distribution bar chart

### Tab 5 — Promo Deadlines
- Warning banner: $51,118 across 11 accounts, HELOC has $79,370 available
- Promo countdown cards (sorted by expiry)

### Tab 6 — Module Playbook
- KPI: Complete/In Progress/Pending counts
- Expandable module cards with docs have/need/actions

### Tab 7 — Spending & Budget
- KPI: 2025 CC Spend $76,052, Monthly avg $6,338, #1 category Food & Dining, Savings target ~$3,800/mo
- Spending donut chart + category table
- Burn rate: current vs survival budget bar chart
- 20-year wealth projection chart (3 scenarios: Conservative/Moderate/Aggressive, starting NW $410K)
- Income bridge & runway (3 scenarios post-JPMC)
- Property tax detail ($14,595.02/yr, 2214 N Carroll Ave Dallas TX 75204)

### Tab 8 — Subscriptions
- KPI: Cancel $87.03/mo, Under Review $457.90/mo, Conservative savings $315.98/mo, Keep $36.29/mo, 102 recurring merchants found
- Cancel table (6 services)
- Review table (9 services)
- Essential bills table (7 bills)
- Subscription donut chart
- Top 5 fastest actions this week

---

## Real Financial Data

### Debt Accounts (17 accounts)
| Account | Balance | Rate | Decision |
|---|---|---|---|
| SoFi Personal Loan | $56,958.92 | 12.41% | ROLL TO HELOC |
| LightStream Loan | $44,018.42 | 5.87% | KEEP |
| Wells Fargo Loan (via Dad) | $21,420.00 | 12.49% | ROLL TO HELOC |
| Chase Freedom Unlimited (7117) | $22,531.00 | 0% promo | HOLD - 0% PROMO |
| Chase Freedom (9313) | $13,269.00 | 0% promo | HOLD - 0% PROMO |
| Citi Diamond Preferred | $12,366.00 | 0% promo | HOLD - 0% PROMO |
| Virginia FCU Loan (via Dad) | $18,600.00 | 9.25% | ROLL TO HELOC |
| AmEx Platinum — Old Plan It® | $2,252.41 | 15.5% | ROLL TO HELOC |
| AmEx Platinum — New Plan It® | $2,835.58 | 15.5% | ROLL TO HELOC |
| AmEx Platinum — Revolving | $513.11 | 27.49% | ROLL TO HELOC |
| AmEx Gold — Plan It® | $1,776.88 | 15.5% | ROLL TO HELOC |
| AmEx Personal Loan | $3,942.57 | 7.33% | KEEP |
| Nordstrom (Synchrony) | $653.43 | 29.4% | ROLL TO HELOC |
| Citi Best Buy 4802 | $2,230.40 | 0% promo | HOLD - 0% PROMO |
| Chase Prime Visa | $627.73 | 0% promo | HOLD - 0% PROMO |
| PayPal Credit | $124.35 | 0% promo | HOLD - 0% PROMO |
| BofA Mortgage | $498,903.37 | 3.375% | KEEP - NEVER PAY EARLY |

### HELOC Details
- Provider: Loan Depot (Texas Credit Union)
- Limit: $190,000 @ 6.85% variable
- Immediate roll at close: $110,630 (SoFi + WF + VFCU + AmEx plans/revolving + Nordstrom)
- Available after roll: $79,370 (covers all promo payoffs)
- Monthly interest-only on $110,630: $777
- Monthly payment relief vs current: $2,860/mo
- Annual cash flow gain: $34,323

### Promo Deadlines
| Account | Balance | Expiry |
|---|---|---|
| Citizens Pay 6607 | $0 (DONE) | Mar 2, 2026 |
| Citi Best Buy — Promo 1 | $1,312.44 | Jun 27, 2026 |
| Chase Freedom Unlim — BT1 | $8,500 | Jul 9, 2026 |
| PayPal Credit | $124.35 | Aug 4, 2026 |
| Chase Freedom — BT1 | $7,500 | Aug 12, 2026 |
| Chase Freedom Unlim — BT2 | $2,600 | Sep 9, 2026 |
| Chase Freedom — BT2 | $2,600 | Sep 12, 2026 |
| Chase Freedom Unlim — BT3 | $7,000 | Oct 9, 2026 |
| Chase Freedom Unlim — BT4 | $1,032.25 | Dec 9, 2026 |
| Chase Freedom — BT3 | $1,064.51 | Dec 12, 2026 |
| Citi Best Buy — Promo 2 | $917.96 | Dec 27, 2026 |
| Citi Diamond BT | $12,366 | Jun 18, 2027 |

### March 2026 Bills
| Date | Payee | Amount |
|---|---|---|
| Feb 28 | AmEx Platinum (Plan It plans) | $501.09 |
| Feb 28 | Citi Best Buy 4802 | $50.00 |
| Mar 1 | BofA Mortgage | $2,486.79 |
| Mar 1 | Transfer to Dad (Wells Fargo) | $1,100.00 |
| Mar 1 | AmEx Personal Loan | $407.01 |
| Mar 2 | Citizens Pay 6607 — FINAL | $769.78 |
| Mar 5 | SoFi Personal Loan | $1,464.07 |
| Mar 5 | PayPal Credit | $30.00 |
| Mar 6–22 | Chase Cards (3 accounts) | $452.77 |
| Mar 8 | Nordstrom (Synchrony) | $40.00 |
| Mar 9 | NFM (Synchrony) | $15.00 |
| Mar 10 | AmEx Gold — Adjusted Balance | $2,112.43 |
| Mar 10 | Apple Card (GS Bank) | $104.54 |
| Mar 14 | Citi Diamond Preferred | $124.00 |
| Mar 20 | LightStream Loan | $577.47 |
| Mar 21 | Virginia FCU Loan | $350.00 |
| **TOTAL** | | **$10,563.95** |

### March Cash Flow
- Starting balance: ~$8,000
- Mar 15 paycheck: $4,652 (semi-monthly, $153,400/24)
- Mar 31 partial check (Mar 16–19, 4 days): ~$1,598
- Total available: ~$14,250
- Total obligations: ~$10,564
- End buffer: ~$3,686

### Subscriptions
**Cancel ($87.03/mo):**
- GoPro Subscription: $5.32
- Paramount+: $14.06
- Cloaked: $9.99
- Credit Sesame Premium: $14.28
- Pressed Juicery: $10.00
- Zips Car Wash: $33.38

**Under Review ($457.90/mo):**
- Paddle.net (Unknown): $12.88
- Canva Pro: $15.00
- Adobe Creative Cloud: $20.81
- Cursor AI: $21.32
- Uber One: $9.99
- AT&T Uverse: $100.03
- LifeTime Fitness: $228.23 ← BIGGEST WIN
- PlayStation Network: $84.30
- Hand & Stone Massage: $25.55

**Essential Bills ($1,138.54/mo):**
- GEICO Auto: $230.51
- State Farm: $65.67
- Homeowners Insurance: $385.01
- TXU Electric: $215.19
- Atmos Energy: $80.05
- Dallas Water: $122.11
- NTTA Toll: $40.00

### 2025 Spending Categories (CC only — 1,615 transactions, $76,052 total)
| Category | Annual | Monthly | Survival | % |
|---|---|---|---|---|
| Food & Dining | $27,441 | $2,287 | $1,100 | 36.1% |
| Shopping/Retail | $13,182 | $1,099 | $200 | 17.3% |
| Housing | $8,676 | $723 | $723 | 11.4% |
| Health | $6,884 | $574 | $100 | 9.1% |
| Insurance | $6,249 | $521 | $467 | 8.2% |
| Transportation | $5,095 | $425 | $200 | 6.7% |
| Other | $3,413 | $284 | $100 | 4.5% |
| Travel | $1,885 | $157 | $0 | 2.5% |
| Subscriptions | $1,558 | $130 | $80 | 2.0% |
| Debt Service | $1,537 | $128 | $0 | 2.0% |
| Entertainment | $131 | $11 | $50 | 0.2% |

### Monthly Burn Rate: Current vs Survival
| Line Item | Current | Survival |
|---|---|---|
| BofA Mortgage | $2,486.79 | $2,486.79 |
| HELOC Interest (6.85% on $110.6K) | $0 | $631.51 |
| LightStream Auto | $577.47 | $577.47 |
| AmEx Personal Loan (→ROLLED) | $407.01 | $0 |
| Property Tax (escrowed) | $1,216.25 | $1,216.25 |
| Other fixed + promos | $756.31 | $756.31 |
| Rolled debt (SoFi/WF/VFCU/AmEx) | $4,077.34 | $0 |
| CC variable spend | $5,756.00 | $2,197.00 |
| **TOTAL** | **$14,488** | **$7,234** |

### 20-Year Wealth Projections (Age 40→60, Starting NW $410K)
- Conservative: 20% saved ($62.4K/yr) at 7% return
- Moderate: 30% ($93.6K/yr) at 8% return
- Aggressive: 40% ($124.8K/yr) at 10% return
- Target comp: $312K total ($240K base + 30% bonus), Texas 0% state tax

### Property Tax (2214 N Carroll Ave, Dallas TX 75204)
- Dallas ISD: $6,211.47
- City of Dallas: $4,751.84
- Dallas County: $1,465.40
- Parkland Hospital: $1,441.60
- Dallas College: $724.71
- **Total: $14,595.02/yr ($1,216.25/mo)**
- Market value: $850,000 — protest by May 15, 2026 to save ~$1,700/yr

### Financial Modules (9)
1. Spending Analysis — in_progress 90%
2. Subscription Audit — in_progress 90%
3. Tax Prep — in_progress 30%
4. Debt Inventory & HELOC — in_progress 70%
5. 401(k) Review — not_started 0%
6. Property Tax Protest (DCAD) — not_started 0%
7. IRS Balance Resolution — not_started 0%
8. Savings & Wealth Plan — not_started 0%
9. Estate Planning — not_started 0%

### Income Bridge Scenarios (post March 19)
- Monthly survival burn: $7,234
- Scenario A (no income): ~5.7 months runway on ~$41,250 liquid
- Scenario B (consulting $2.5K/mo net): ~8.7 months
- Scenario C (new job $240K): +$6,436/mo surplus
- Liquid breakdown: Checking ~$8K + Mar paychecks ~$6,250 + Severance ~$25K + Family ~$2K = $41,250

---

## What Currently Exists in micci-os

The `/financial` page is a **single scrolling page** with these sections:
- KPI Strip (totals)
- Budget Breakdown
- Module Tracker
- Debt Table + Debt Donut
- Deadline Timeline
- Subscription Burn
- Tax Snapshot
- Document Upload

**What's missing vs the original:**
- No tabs/navigation
- Missing: March Runway tab (bill calendar, cash flow chart)
- Missing: HELOC Plan tab (waterfall, decision matrix, before/after chart)
- Missing: Promo Deadlines tab (countdown cards)
- Missing: Module Playbook tab (expandable docs + actions)
- Missing: Full Spending & Budget tab (donut, burn rate, wealth projections, property tax)
- Missing: Full Subscriptions tab (cancel/review/essential tables, donut chart)
- Charts are mostly placeholders or missing

---

## Design System

The app uses dark glass-morphism styling with CSS variables:
```css
--bg-primary: deep navy/dark
--text-primary: near white
--text-secondary: muted
--accent-cyan: cyan highlight color
--glass-card: translucent card style (class: glass-card)
```

Components use Tailwind classes + `glass-card` for card containers.
Charts use Recharts. Server components fetch from Supabase directly.
Client components use `'use client'` and receive data as props.

---

## Supabase Connection Pattern

```typescript
// Server component
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data } = await supabase.from('table').select('*')
```

RLS policies allow any `authenticated` user to read/write all financial tables.
