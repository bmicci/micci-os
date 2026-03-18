# Phase 1: Financial Simulator PRD

**Owner:** Brandon Micci | **Version:** 1.0 | **Date:** March 17, 2026
**Status:** Ready to Build | **Priority:** HIGH — primary new feature set
**Depends On:** Phase 0 (Foundation Refactor)

---

## 1. Purpose

Build four interactive financial simulation modules that provide real-time what-if analysis for income, debt consolidation, cash flow, and financial scenarios. These modules form the analytical core of micci-os and replace the current static financial dashboard tabs with live, interconnected calculators.

## 2. What Exists Today

The current `/financial` route has 8 static tabs:
- OverviewTab — KPI strip, module tracker, action items (keep, enhance)
- MarchRunwayTab — cash flow to March 19 (replace with Cash Flow Model)
- HELOCPlanTab — static HELOC account display (replace with interactive HELOC Tracker)
- DebtTrackerTab — debt table + donut chart (keep, feeds into HELOC Tracker)
- PromoDeadlinesTab — promo expiry timeline (merge into HELOC Tracker deadlines)
- ModulePlaybookTab — M1–M9 tracker (keep as-is)
- SpendingBudgetTab — spending breakdown, burn rate, wealth scenarios (keep, enhance)
- SubscriptionsTab — subscription audit (keep as-is)

The new Financial Simulator adds 4 NEW routes under `/finance/`:
- `/finance/paycheck` — Paycheck Simulator
- `/finance/heloc` — HELOC Consolidation Tracker
- `/finance/cashflow` — Monthly Cash Flow Model
- `/finance/scenarios` — Scenario Comparison Engine

The existing `/financial` route with its 8 tabs becomes the "Financial Overview" — a summary dashboard. The 4 new routes are deep-dive interactive tools.

## 3. Architecture

### 3.1 Cross-Module Data Flow

This is the most critical architectural requirement. The four simulator modules are interconnected:

```
┌──────────────────┐     ┌──────────────────┐
│ Paycheck          │────→│ Cash Flow Model   │
│ Simulator         │     │                   │
│ (net take-home)   │     │ (pulls net pay +  │
└──────────────────┘     │  HELOC payment +  │
                          │  promo minimums)  │
┌──────────────────┐     │                   │
│ HELOC Tracker     │────→│                   │
│ (monthly payment, │     └────────┬──────────┘
│  promo minimums)  │              │
└──────────────────┘              ▼
                          ┌──────────────────┐
                          │ Scenario Engine   │
                          │ (snapshots all    │
                          │  module state)    │
                          └──────────────────┘
```

**Implementation via Zustand:** Each module has its own store. The Cash Flow store subscribes to Paycheck and HELOC stores using `subscribeWithSelector`. When salary changes in Paycheck → net pay recalculates → Cash Flow free cash updates → any open Scenario comparison reflects the change.

### 3.2 Shared Financial UI Components

Create reusable components in `src/components/finance/shared/`:

| Component | Purpose |
|---|---|
| `CurrencyInput.tsx` | Formatted currency input ($XXX,XXX on blur, raw on focus) |
| `PercentageSlider.tsx` | Slider + text input synced, 0–100% |
| `MetricCard.tsx` | Standard card for KPI display (value, label, change indicator) |
| `ComparisonBadge.tsx` | Green/red badge showing delta between two values |
| `WaterfallChart.tsx` | Reusable Recharts waterfall (income → deductions → net) |
| `TimelineChart.tsx` | Reusable area/line chart with milestone markers |

---

## 4. Module 1A: Paycheck Simulator

**Route:** `/finance/paycheck`
**Store:** `stores/finance/paycheck-store.ts`
**Calc Engine:** `lib/finance/paycheck.ts` + `lib/tax/brackets.ts`

### Input Controls

| Input | Type | Default | Validation |
|---|---|---|---|
| Base Salary | CurrencyInput | $250,000 | $0 – $10,000,000 |
| Bonus % | PercentageSlider | 30% | 0% – 200% |
| Pay Frequency | Select | Bi-weekly (26) | 52, 26, 24, 12 |
| Filing Status | Select | Single | Single, MFJ, MFS, HoH |
| State | Select | Texas | All 50 states + DC |
| Federal Tax Method | Toggle | Bracket Calc | bracket_calc \| manual_rate |
| Effective Rate Override | PercentageSlider | 22% | Only visible when manual_rate selected |
| 401(k) Contribution | Slider + input | $23,500/yr | $0 – $23,500 (2026 limit) |
| 401(k) Employer Match | Two inputs | 0% up to 0% | match_pct (0–100%), cap_pct (0–100%) |
| HSA Contribution | CurrencyInput | $0/yr | $0 – $4,300 (individual) or $8,550 (family) |
| Health/Dental/Vision | CurrencyInput | $350/mo | $0 – $5,000/mo |
| Other Pre-Tax Deductions | CurrencyInput | $0/mo | $0 – $10,000/mo |

### Output Display

**Two views, toggled at top:**

**Paycheck Stub View** — renders as a visual pay stub:
- Gross pay (per period)
- Federal income tax (with marginal bracket indicator — e.g., "24% bracket")
- Social Security (6.2%, show which pay period it caps at $176,100 wage base)
- Medicare (1.45% base + 0.9% Additional Medicare on wages > $200K)
- State tax (auto-calculated from state selection)
- 401(k) employee contribution
- 401(k) employer match (shown as benefit line, not deduction)
- HSA, health insurance, other pre-tax
- **Net take-home** (per period) — large, prominent
- Effective total tax rate badge

**Annual Summary View:**
- Same data annualized
- Waterfall chart (Recharts): gross → federal → FICA → state → pre-tax → net
- Year-over-year comparison if previous scenario exists
- Marginal vs. effective rate comparison
- Social Security cap-out pay period indicator

### Tax Calculation Engine (`lib/tax/brackets.ts`)

```typescript
// 2026 Federal Tax Brackets (projected — update if IRS publishes final)
const BRACKETS_2026 = {
  single: [
    { min: 0, max: 11_925, rate: 0.10 },
    { min: 11_925, max: 48_475, rate: 0.12 },
    { min: 48_475, max: 103_350, rate: 0.22 },
    { min: 103_350, max: 197_300, rate: 0.24 },
    { min: 197_300, max: 250_525, rate: 0.32 },
    { min: 250_525, max: 626_350, rate: 0.35 },
    { min: 626_350, max: Infinity, rate: 0.37 },
  ],
  // ... MFJ, MFS, HoH brackets
};

const SS_WAGE_BASE_2026 = 176_100;
const MEDICARE_RATE = 0.0145;
const MEDICARE_ADDITIONAL_RATE = 0.009;
const MEDICARE_ADDITIONAL_THRESHOLD = 200_000; // Single filer
```

### Zustand Store Shape

```typescript
interface PaycheckStore {
  // Inputs
  salary: number;
  bonusPercent: number;
  payFrequency: 52 | 26 | 24 | 12;
  filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh';
  state: string;
  taxMethod: 'bracket_calc' | 'manual_rate';
  manualEffectiveRate: number;
  contribution401k: number;
  employerMatchPct: number;
  employerMatchCap: number;
  hsaContribution: number;
  healthPremium: number;
  otherPreTax: number;

  // Computed (cached, recalculated on input change)
  result: PaycheckResult | null;

  // Actions
  setInput: (key: string, value: any) => void;
  recalculate: () => void;
  hydrate: (data: Partial<PaycheckStore>) => void;
  persist: () => Promise<void>;
}
```

---

## 5. Module 1B: HELOC Consolidation Tracker

**Route:** `/finance/heloc`
**Store:** `stores/finance/heloc-store.ts`
**Calc Engine:** `lib/finance/heloc.ts`

### What Changes from Current HELOCPlanTab

The current `HELOCPlanTab.tsx` is a static read-only display of HELOC accounts. The new HELOC Tracker is an interactive, date-aware module with:
- Editable balances (mark payments, track paydowns)
- Live interest calculations
- Balance projection over time
- Deadline countdowns with penalty modeling
- Savings analysis comparing pre/post consolidation

### Data Model (Supabase: `debt_accounts` table)

Uses the existing `debt_accounts` table. Key fields per the Simulator PRD:

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | RLS scope |
| account_name | text | Creditor / account name |
| account_type | enum | personal_loan, auto_loan, credit_card, charge_plan, deferred_interest |
| original_balance | numeric | Balance at plan creation |
| current_balance | numeric | Live balance (editable) |
| interest_rate | numeric | APR |
| monthly_payment | numeric | Current minimum payment |
| status | enum | rolled, promo_hold, deferred, keep, paid_off |
| roll_date | date | Date rolled into HELOC |
| promo_expiry | date | 0% promo expiration |
| deferred_expiry | date | Deferred interest hard deadline |
| notes | text | Free-text |

### Seed Data (Source of Truth: Financial Simulator PRD)

**First Draw Accounts (status: rolled):**

| Account | Balance | Rate | Monthly Pmt |
|---|---|---|---|
| SoFi Personal Loan | $56,246.68 | 12.41% | $1,464.07 |
| Wells Fargo (Dad) | $21,420.00 | 12.49% | $1,100.00 |
| Virginia FCU Auto (Dad) | $18,600.00 | 9.25% | $350.00 |
| LightStream Auto Loan | $44,018.42 | 5.87% | $577.47 |
| AmEx Personal Loan | $3,558.53 | 7.33% | $407.01 |
| AmEx Gold Pay Over Time | $1,930.25 | 27.49% | $40.00 |
| AmEx Plat Pay Over Time | $513.11 | 27.49% | $15.00 |
| AmEx Gold Plan It | $1,754.20 | 15.51% | $182.18 |
| AmEx Plat Plan It #1 | $2,021.80 | 17.09% | $230.97 |
| AmEx Plat Plan It #2 | $2,835.58 | 14.31% | $270.12 |
| Nordstrom | $653.43 | 29.40% | $40.00 |

**0% Promo Hold Accounts (status: promo_hold):**

| Account | Balance | Promo Expiry |
|---|---|---|
| Chase Freedom Unlimited (7117) | $22,306.00 | Jul–Dec 2026 (bucketed) |
| Chase Freedom (4628) | $13,137.00 | Aug–Dec 2026 (bucketed) |
| Chase Prime Visa (9313) | $980.45 | 07/22/2026 |
| Citi Diamond (4205) | $12,242.00 | 06/18/2027 |

**Deferred Interest Accounts (status: deferred):**

| Account | Balance | Hard Deadline | Penalty APR |
|---|---|---|---|
| Best Buy Promo 1 | $1,312.44 | 06/27/2026 | 29.99% |
| Best Buy Promo 2 | $917.96 | 12/27/2026 | 29.99% |

**HELOC Configuration:**
- Rate: 6.85% (Prime 6.75% + 0.10% margin)
- Limit: $190,000
- First Draw Total: ~$153,552
- Remaining Availability: ~$36,448
- Structure: 10/10 variable (10 yr draw, 10 yr repay)
- Payment Mode: Interest-only during draw period

### Views

**1. Account Overview**
- Table of all accounts with status badges (rolled, promo, deferred, keep, paid_off)
- Color-coded rows by status
- Sortable and filterable by status
- Inline editing of current balance
- Summary cards: Total HELOC Draw, Remaining Availability, Monthly Interest Cost, Monthly Cash Flow Relief

**2. Balance Timeline**
- Area chart (Recharts) showing projected HELOC balance over time
- X-axis: months (Mar 2026 through Jun 2027)
- Y-axis: HELOC balance
- Milestone markers at each promo expiry date (when balance jumps as promo cards roll in)
- Horizontal line at $190K limit
- Shaded danger zone when approaching limit

**3. Deadline Dashboard**
- Calendar-style view of upcoming deadlines
- Red urgency indicators for deferred interest accounts
- Countdown timers (days remaining)
- Estimated back-interest penalty if missed (for deferred interest accounts)
- One-click action to mark as paid or rolled into HELOC

**4. Savings Analysis**
- Pre vs. post consolidation comparison
- Monthly interest savings waterfall
- Cumulative savings over time chart
- Break-even analysis: when does HELOC interest cost equal what the original accounts would have charged

---

## 6. Module 1C: Monthly Cash Flow Model

**Route:** `/finance/cashflow`
**Store:** `stores/finance/cashflow-store.ts`
**Calc Engine:** `lib/finance/cashflow.ts`

### Cross-Module Reactivity (Critical Requirement)

This module does NOT re-ask for income or debt data. It pulls from Zustand stores:

| Data Point | Source Store | How |
|---|---|---|
| Net take-home pay | `paycheckStore.result.netPay` | Subscribe |
| HELOC monthly interest payment | `helocStore` → calculate from balance + rate | Subscribe |
| Promo card minimums | `helocStore` → sum of promo_hold account payments | Subscribe |
| Deferred interest payments | `helocStore` → sum of deferred account payments | Subscribe |

**Changing salary in the Paycheck Simulator instantly updates free cash here.** This is non-negotiable.

### Additional Inputs (Cash Flow specific)

| Category | Line Items | Default |
|---|---|---|
| Housing | Mortgage payment | $2,480/mo |
| Transportation | Car insurance, gas/fuel | $400/mo |
| Utilities | Electric, gas, water, internet | $350/mo |
| Phone | Mobile plan | $100/mo |
| Food | Groceries, dining out | $800/mo |
| Health & Wellness | ClassPass, supplements, wellness | $200/mo |
| Subscriptions | Streaming, apps, SaaS (pull from subscription store if available) | $150/mo |
| Personal / Misc | Clothing, grooming, household | $300/mo |
| Custom Line Items | User-defined (add/remove dynamically) | $0 |

### Output

**1. Monthly Cash Flow Waterfall**
- Animated Recharts waterfall: income flowing through expense categories to free cash
- Color coding: green (income), amber (fixed obligations), red (debt service), gray (living expenses), gold (free cash)

**2. Allocation Engine**
Free cash splits into configurable buckets with drag-to-reorder priority:
- Emergency Fund / HYSA — default 30%
- Extra HELOC Principal — default 30%
- Brokerage / DCA Investing — default 25%
- Discretionary / Lifestyle — default 15%

Percentages are adjustable. Dragging reorders priority. Visual pie chart shows allocation.

**3. 12-Month Projection**
Table + line chart projecting cash flow forward 12 months, accounting for:
- Social Security cap hit (pay period where SS deduction stops → net pay increases)
- Promo card rollovers increasing HELOC payment
- Deferred interest lump payments at deadline
- Known one-time events (tax payment, 401k rollover, etc.)

This is the most powerful view — it shows month-by-month impact of scheduled events.

---

## 7. Module 1D: Scenario Comparison Engine

**Route:** `/finance/scenarios`
**Store:** `stores/finance/scenario-store.ts`
**Calc Engine:** `lib/finance/scenarios.ts`

### Scenario Data Model

Each scenario is a complete snapshot of all inputs:

```typescript
interface Scenario {
  id: string;
  name: string;           // e.g., "McKesson $250K", "Celestica $260K"
  createdAt: Date;
  updatedAt: Date;
  isBaseline: boolean;    // The "current state" scenario
  paycheckInputs: PaycheckInputs;
  helocInputs: HelocInputs;
  cashflowInputs: CashflowInputs;
  notes: string;
}
```

**Storage:** Supabase `scenarios` table with `inputs_json` JSONB column containing the full input snapshot.

### Features

**1. Scenario CRUD**
- Create new scenario (copies current inputs as starting point)
- Name/rename scenarios
- Duplicate an existing scenario
- Delete scenarios
- Mark one as baseline (anchors comparison)
- Maximum 5 scenarios

**2. Side-by-Side Comparison**
Select 2–3 scenarios for comparison. Display cards showing:

| Metric | Description |
|---|---|
| Monthly Net Take-Home | After all taxes, 401k, benefits |
| Monthly Debt Service | HELOC + promo minimums + deferred |
| Monthly Free Cash | Net minus all obligations and living |
| Annual Savings Capacity | Free cash × 12 |
| HELOC Payoff Timeline | Estimated months to pay off at current allocation |
| Total Comp (Annual) | Base + bonus + employer 401k match |
| Effective Tax Rate | All taxes / gross income |
| Debt-to-Income Ratio | Monthly debt service / gross monthly income |

**Delta Highlighting:** Metrics that differ are color-coded green (better) or red (worse) with absolute and percentage difference. Baseline scenario anchors the comparison.

**3. Sensitivity Analysis**
For any single variable (salary, HELOC rate, 401k %), show a mini-chart:
- X-axis: variable range (e.g., salary $220K–$280K in $10K steps)
- Y-axis: free cash (or any selected output metric)
- Current value marked with vertical line
- Each scenario plotted as separate series

---

## 8. Supabase Schema Additions

```sql
-- Scenarios table
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  is_baseline BOOLEAN DEFAULT false,
  paycheck_inputs JSONB NOT NULL,
  heloc_inputs JSONB NOT NULL,
  cashflow_inputs JSONB NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own scenarios" ON scenarios
  FOR ALL USING (auth.uid() = user_id);

-- Ensure only one baseline per user
CREATE UNIQUE INDEX idx_one_baseline_per_user
  ON scenarios (user_id) WHERE is_baseline = true;

-- Paycheck settings (persisted inputs)
CREATE TABLE paycheck_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  salary NUMERIC DEFAULT 250000,
  bonus_percent NUMERIC DEFAULT 30,
  pay_frequency INTEGER DEFAULT 26,
  filing_status TEXT DEFAULT 'single',
  state TEXT DEFAULT 'TX',
  tax_method TEXT DEFAULT 'bracket_calc',
  manual_effective_rate NUMERIC DEFAULT 22,
  contribution_401k NUMERIC DEFAULT 23500,
  employer_match_pct NUMERIC DEFAULT 0,
  employer_match_cap NUMERIC DEFAULT 0,
  hsa_contribution NUMERIC DEFAULT 0,
  health_premium NUMERIC DEFAULT 350,
  other_pre_tax NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE paycheck_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own paycheck settings" ON paycheck_settings
  FOR ALL USING (auth.uid() = user_id);

-- Cash flow settings (persisted inputs)
CREATE TABLE cashflow_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  expense_categories JSONB DEFAULT '[]',
  allocation_buckets JSONB DEFAULT '[]',
  custom_line_items JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cashflow_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cashflow settings" ON cashflow_settings
  FOR ALL USING (auth.uid() = user_id);
```

---

## 9. Build Order

| Step | Task | Duration | Depends On |
|---|---|---|---|
| 1A.1 | Paycheck input controls + Zustand store | 2 days | Phase 0 complete |
| 1A.2 | Tax calculation engine (brackets, FICA, state) + unit tests | 2 days | — |
| 1A.3 | Paystub card UI + annual waterfall chart | 1 day | 1A.1 + 1A.2 |
| 1A.4 | Persist paycheck inputs to Supabase | 0.5 days | 1A.1 |
| 1B.1 | Seed HELOC account data from Simulator PRD numbers | 0.5 days | Phase 0 seed script |
| 1B.2 | Account overview table with inline editing | 1 day | 1B.1 |
| 1B.3 | Balance timeline projection chart | 1 day | 1B.1 |
| 1B.4 | Deadline dashboard with countdowns | 1 day | 1B.1 |
| 1B.5 | Savings analysis view | 0.5 days | 1B.1 |
| 1C.1 | Cash flow cross-module wiring (subscribe to paycheck + HELOC stores) | 1 day | 1A + 1B |
| 1C.2 | Living expense inputs + custom line items | 1 day | — |
| 1C.3 | Waterfall chart + allocation engine | 1 day | 1C.1 + 1C.2 |
| 1C.4 | 12-month projection with event-aware modeling | 2 days | 1C.1 |
| 1D.1 | Scenario CRUD + Supabase persistence | 1 day | 1A + 1B + 1C |
| 1D.2 | Side-by-side comparison view with delta highlighting | 1.5 days | 1D.1 |
| 1D.3 | Sensitivity analysis mini-charts | 1 day | 1D.1 |

**Total: ~3–4 weeks**

## 10. Acceptance Criteria

- [ ] Paycheck Simulator: Any input change recalculates all downstream values in real-time
- [ ] Paycheck Simulator: Federal tax matches manual bracket calculation within $1
- [ ] Paycheck Simulator: SS cap-out correctly identified at the right pay period
- [ ] HELOC Tracker: All 15+ accounts displayed with correct balances from Supabase
- [ ] HELOC Tracker: Balance projection shows promo rollover impact correctly
- [ ] HELOC Tracker: Deadline countdowns are date-accurate
- [ ] Cash Flow Model: Net pay automatically updates when paycheck inputs change
- [ ] Cash Flow Model: 12-month projection accounts for known events (SS cap, promo expires)
- [ ] Scenario Engine: Can save, name, and compare 3 scenarios side-by-side
- [ ] Scenario Engine: Delta highlighting correctly shows green/red with accurate values
- [ ] All modules: Mobile-responsive (375px minimum)
- [ ] All modules: Data persists across sessions via Supabase
- [ ] All modules: No calculation happens in component code — all math in lib/finance/
