# MICCI OS — MASTER CONTEXT FOR CLAUDE CODE

This file is the single source of truth for all Claude Code sessions. Read it fully before doing anything.

---

## WHAT THIS APP IS

**micci-os** is Brandon Micci's personal life operating system. A Next.js 15 app that consolidates 7 existing apps into 4 sections: 💰 Financial, 🎯 Goals + Vision, 📅 Planner, 🏋️ Health. Built on Supabase (PostgreSQL + pgvector), deployed to Vercel.

**Owner:** Brandon Micci (brandon.micci@gmail.com)
**Repo:** github.com/bmicci/micci-os
**Supabase project:** ptrcyxqybzqwwkridvze
**Supabase URL:** https://ptrcyxqybzqwwkridvze.supabase.co

---

## CURRENT STATE OF THE REPO

### ✅ What exists (files created)
```
src/
  app/
    (app)/                          ← Route group with sidebar layout
      layout.tsx                    ← Sidebar + AnimatedBackground + AIChat
      financial/page.tsx            ← PLACEHOLDER — needs full dashboard
      goals/page.tsx                ← placeholder
      planner/page.tsx              ← placeholder
      health/page.tsx               ← placeholder
    api/
      chat/route.ts                 ← RAG AI chat (Anthropic + Supabase vector search)
      upload/route.ts               ← Document upload to Supabase storage
      process-document/route.ts     ← PDF/XLSX/CSV → chunk → embed → store
      goals/route.ts                ← Goals CRUD
      goals/[id]/route.ts           ← Goals CRUD
    login/page.tsx                  ← Magic link auth
    globals.css                     ← Design system CSS variables
    layout.tsx                      ← Root layout (Geist fonts)
    page.tsx                        ← Root redirect
    financial/page.tsx              ← OLD placeholder (pre-route-group) — can delete
    goals/page.tsx                  ← OLD — can delete
    planner/page.tsx                ← OLD — can delete
    health/page.tsx                 ← OLD — can delete
  components/
    Sidebar.tsx                     ← Nav sidebar (4 sections)
    AnimatedBackground.tsx          ← Cyan grid + particles
    AIChat.tsx                      ← Floating AI chat panel (bottom-right)
    DocumentUpload.tsx              ← Drag & drop file upload
    PlaceholderPage.tsx             ← Temp placeholder
  lib/
    supabase/client.ts              ← Browser Supabase client
    supabase/server.ts              ← Server Supabase client (createClient + createServiceClient)
    ai/embeddings.ts                ← OpenAI-compatible embedding functions
    ai/retrieval.ts                 ← Vector similarity search
  middleware.ts                     ← Auth protection (redirect to /login if not authed)
```

### ❌ Critical: node_modules does not exist
**Run `npm install` first before anything else.**

### ❌ Missing packages — add to package.json and install
```bash
npm install @supabase/supabase-js @supabase/ssr ai @ai-sdk/anthropic pdf-parse xlsx mammoth recharts
npm install -D @types/pdf-parse
```

### Current package.json dependencies (base only)
- next 16.1.6, react 19.2.3, react-dom 19.2.3, geist, tailwindcss 4

---

## ENVIRONMENT VARIABLES (.env.local — already exists)
```
NEXT_PUBLIC_SUPABASE_URL=https://ptrcyxqybzqwwkridvze.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  ✅
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...      ✅
ANTHROPIC_API_KEY=sk-ant-api03-...         ✅
```

---

## DESIGN SYSTEM (non-negotiable — match exactly)

All components must use these CSS variables from globals.css:

```css
--bg-base: #050505
--bg-body: #0a0a0a
--bg-elevated: #0a0e27
--accent-cyan: #00d4ff
--accent-blue: #1e90ff
--accent-gradient: linear-gradient(135deg, #00d4ff, #1e90ff)
--card-bg: rgba(255,255,255,0.05)
--card-border: rgba(0,212,255,0.2)
--text-primary: #f0f6ff
--text-secondary: rgba(240,246,255,0.6)
--text-muted: rgba(240,246,255,0.35)
```

**Glass card pattern:**
```css
background: var(--card-bg);
border: 1px solid var(--card-border);
border-radius: 16px;
backdrop-filter: blur(20px);
transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;

/* hover */
transform: translateY(-4px);
border-color: rgba(0,212,255,0.4);
box-shadow: 0 8px 32px rgba(0,212,255,0.15);
```

**Gradient text/buttons:** `background: var(--accent-gradient); -webkit-background-clip: text;`
**Font:** Geist Sans (already loaded in root layout)

---

## SUPABASE SCHEMA — ALL 27 TABLES

All tables have RLS enabled. All require authenticated user.

### Financial tables
- `accounts` — debt/credit accounts (15 rows seeded — real Brandon data)
- `transactions` — income/expense transactions
- `subscriptions` — recurring subscriptions (25 rows seeded)
- `budget_categories` — budget line items (10 rows seeded)
- `financial_modules` — 9-module tracker (9 rows seeded)
- `financial_snapshots` — net worth over time
- `cashflow_events` — one-time cash events

### Goals + Vision tables
- `goal_categories`, `goals`, `core_values`, `affirmations`
- `role_models`, `vision_items`, `rituals`, `ritual_log`

### Planner tables
- `weekly_plans`, `daily_tasks`, `time_blocks`, `schedule_templates`

### Health tables
- `hormone_protocols`, `protocol_logs`, `supplements`
- `lab_markers`, `workouts`, `body_metrics`, `daily_schedule`

### Documents + RAG tables
- `documents` — uploaded file metadata
- `document_chunks` — vector(1536) embeddings for RAG
- `chat_messages` — AI chat history

---

## SEEDED DATA (already in Supabase — don't re-insert)

### accounts (15 rows — Brandon's real debt)
| Account | Balance | Rate | Action |
|---------|---------|------|--------|
| SoFi Personal Loan | $56,958.92 | 12.41% | ROLL TO HELOC |
| BofA Mortgage | $498,903.37 | 3.375% | HOLD |
| LightStream Auto | $44,018.42 | 5.87% | KEEP |
| Chase Freedom Unlimited 7117 | $22,531.00 | 0% promo | HOLD |
| Chase Freedom 4628 | $13,269.00 | 0% promo | HOLD |
| Citi Diamond 4205 | $12,475.53 | 0% BT | HOLD til Jun 2027 |
| AmEx Personal Loan | $3,942.57 | 7.33% | KEEP |
| AmEx Gold revolving | $1,930.25 | 27.49% | ROLL TO HELOC |
| AmEx Plat Plan It #2 | $2,835.58 | 14.31% eff | ROLL TO HELOC |
| AmEx Plat Plan It #1 | $2,021.80 | 17.09% eff | ROLL TO HELOC |
| AmEx Gold Plan It | $1,754.20 | 15.51% eff | ROLL TO HELOC |
| AmEx Plat revolving | $513.11 | 27.49% | ROLL TO HELOC |
| Best Buy/Citi 4802 Promo 1 | $1,312.44 | 0% (deferred) | PAY BY JUN 27 |
| Nordstrom | $653.43 | 29.40% | ROLL TO HELOC |
| Dad (Virginia FCU) | $21,420.00 | 0% | $1,100/mo |

### financial_modules (9 rows)
| # | Module | Status | Progress |
|---|--------|--------|----------|
| 1 | Spending Analysis | complete | 100% |
| 2 | Subscription Audit | complete | 100% |
| 3 | Tax & Income | in_progress | 85% |
| 4 | Debt & Mortgage | in_progress | 90% |
| 5 | 401k & Investments | in_progress | 40% |
| 6 | Property Tax Dispute | in_progress | 50% |
| 7 | IRS Notices | not_started | 0% |
| 8 | Savings & Accounts | not_started | 0% |
| 9 | Estate Planning | not_started | 0% |

**Run this UPDATE to sync progress values:**
```sql
UPDATE financial_modules SET progress_percent = 100, status = 'complete' WHERE module_number IN (1, 2);
UPDATE financial_modules SET progress_percent = 85, status = 'in_progress' WHERE module_number = 3;
UPDATE financial_modules SET progress_percent = 90, status = 'in_progress' WHERE module_number = 4;
UPDATE financial_modules SET progress_percent = 40, status = 'in_progress' WHERE module_number = 5;
UPDATE financial_modules SET progress_percent = 50, status = 'in_progress' WHERE module_number = 6;
```

### subscriptions (25 rows)
- 6 to cancel, 9 to review, 3 to keep, 7 essential bills
- Monthly burn: ~$3,200 active | ~$450 potential savings from cancellations

### budget_categories (10 rows)
Housing, Food, Transport, Health, Entertainment, Personal, Subscriptions, Debt Service, Savings, Misc

---

## FINANCIAL DATA CONTEXT (for the dashboard and AI chat)

### Brandon's situation
- **Leaving JPMC:** March 19, 2026 (VP, Analytics Solutions Manager, $153,400 salary)
- **2025 income:** $173,180 (base $153,117 + bonus $20,010)
- **2026 YTD through Mar 19:** ~$40,566 (partial year — low income year)
- **Texas resident** — no state income tax
- **Home:** 2214 N Carroll Ave, Dallas TX 75204 — assessed $850,000 by DCAD
- **Mortgage:** BofA, $498,903 @ 3.375% fixed, payment $2,486.79/mo

### HELOC (CRITICAL — March 19 deadline)
- Texas Credit Union, $190,000 limit @ 6.85% variable
- **Must close before March 19** (employment verification required)
- Rolling ~$109K of high-rate debt → saves ~$2,800/mo in payments
- Remaining availability for 0% promo payoffs starting July 2026

### HELOC Architecture (dynamic)
- HELOC data is derived from the live `debts` array — single source of truth
- `financial-data.ts` exports: `deriveHelocAccounts()`, `computeHelocKPIs()`, `computeWaterfall()`
- Constants `HELOC_LIMIT` (190K) and `HELOC_RATE` (6.85) are in `financial-data.ts`
- `financial-data-service.ts` computes HELOC accounts/KPIs from Supabase debts (not hardcoded)
- When debt balances change (reimport), all HELOC KPIs, decision matrix, waterfall, and charts auto-update
- Document tracking: `docs/uploads/README.md` tracks all documents needed per module

### 2025 Tax estimate
- W-2 Box 1: $160,667.19 | Federal withheld: $23,126.93
- Estimated owed (no SALT): ~$4,164 | With $10K SALT deduction: ~$1,764
- Mortgage interest deduction: $17,152.41 (itemizes > $15K standard)
- Property taxes paid 2025: $14,595.02 (confirm HAF deductibility with accountant)

### Critical deadlines
| Date | Action |
|------|--------|
| **Mar 19, 2026** | 🔴 HELOC close + last day at JPMC |
| **May 15, 2026** | 🟠 DCAD property tax protest deadline |
| **Jun 27, 2026** | 🟠 Best Buy promo expires ($339 deferred interest risk) |
| **Jul–Dec 2026** | 🟡 Chase 0% promos expire staggered ($36K) |
| **Dec 31, 2026** | 🟡 Roth conversion deadline (low income year opportunity) |
| **Jun 18, 2027** | 🔵 Citi Diamond 0% expires ($12,476) |

---

## CURRENT SESSION TASK: BUILD THE FINANCIAL DASHBOARD

Replace `src/app/(app)/financial/page.tsx` with a fully functional dashboard.

### Step 1 — Install dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr ai @ai-sdk/anthropic pdf-parse xlsx mammoth recharts
npm install -D @types/pdf-parse
```

### Step 2 — Verify app runs
```bash
npm run dev
```
Fix any TypeScript/import errors before building the dashboard.

### Step 3 — Build these components

**File structure:**
```
src/
  app/(app)/financial/page.tsx     ← Server component, fetches all data
  components/financial/
    KPIStrip.tsx                   ← 5 top-level metric cards
    ModuleTracker.tsx              ← 9-module progress bars
    DebtOverview.tsx               ← Debt table + donut chart (recharts)
    DeadlineTimeline.tsx           ← Critical dates countdown
    SubscriptionBurn.tsx           ← Subscriptions table + savings callout
    TaxSnapshot.tsx                ← 2025 tax summary, two scenarios
```

**page.tsx data fetching:**
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function FinancialPage() {
  const supabase = await createClient()
  const [
    { data: accounts },
    { data: modules },
    { data: subscriptions },
    { data: categories },
  ] = await Promise.all([
    supabase.from('accounts').select('*').order('current_balance', { ascending: false }),
    supabase.from('financial_modules').select('*').order('module_number'),
    supabase.from('subscriptions').select('*').order('monthly_cost', { ascending: false }),
    supabase.from('budget_categories').select('*'),
  ])
  // pass as props to components
}
```

### Section specs:

**1. Page header**
```
💰 Financial Command Center
March 2026 · Survival Budget Mode · JPMC Exit: March 19

[urgent banner if today < Mar 19]  ⚡ HELOC window: X days remaining
```

**2. KPI Strip (5 glass cards)**
| Card | Source | Formula |
|------|--------|---------|
| Total Debt | accounts | SUM(current_balance) |
| Monthly Service | accounts | SUM(minimum_payment) |
| Subscriptions Burn | subscriptions | SUM(monthly_cost) where status != 'cancelled' |
| Modules Done | financial_modules | COUNT where status = 'complete' / 9 |
| Net Worth (est.) | calculated | $850,000 - total_debt |

**3. Module Tracker**
- All 9 modules, progress bar (cyan gradient fill), status badge
- Click to expand accordion with module description

**4. Debt Overview (two columns)**
- LEFT: Table grouped by action (ROLL TO HELOC | KEEP | HOLD 0% | MORTGAGE | FAMILY)
  - Color coding: red=HELOC target, green=keep, yellow=0% promo, blue=mortgage, purple=family
- RIGHT: Recharts PieChart donut, segments by category, center shows total

**5. Critical Deadlines Timeline**
```tsx
const deadlines = [
  { date: 'Mar 19, 2026', label: 'HELOC Close', urgency: 'critical', note: 'Must close while employed at JPMC' },
  { date: 'May 15, 2026', label: 'DCAD Protest Deadline', urgency: 'high', note: 'File at ifile.dallascad.org — dispute $850K' },
  { date: 'Jun 27, 2026', label: 'Best Buy Promo Expires', urgency: 'high', note: '$1,312 — $339 deferred interest if missed' },
  { date: 'Jul–Dec 2026', label: 'Chase 0% Promos Expire', urgency: 'medium', note: '$36,427 — pay from HELOC as buckets expire' },
  { date: 'Dec 31, 2026', label: 'Roth Conversion Deadline', urgency: 'medium', note: 'Low income year — convert up to $23K at 22%' },
  { date: 'Jun 18, 2027', label: 'Citi Diamond Expires', urgency: 'low', note: '$12,476 — longest runway' },
]
```
Show days-remaining countdown for critical + high items. Left border color = urgency.

**6. Subscription Burn**
- Stats row: Active burn | Cancel candidates (savings in red) | Review count
- Table: name | monthly cost | status badge | category
- Sort: cancel first, then review, keep, essential
- Status badges: cancel=red, review=amber, keep=green, essential=blue

**7. Tax Snapshot (hardcoded)**
Two side-by-side cards:
- Scenario A (no SALT): Owe ~$4,164
- Scenario B (with $10K SALT): Owe ~$1,764
Note: "Confirm HAF program impact on property tax deductibility with accountant"

### Done criteria
- [ ] `npm run dev` starts without errors
- [ ] `/financial` loads with real Supabase data
- [ ] KPI strip shows live numbers
- [ ] Module tracker shows all 9 with correct progress
- [ ] Debt table color-coded correctly
- [ ] Donut chart renders
- [ ] Deadline countdown accurate (days from today)
- [ ] Subscriptions sorted + savings shown
- [ ] Tax snapshot both scenarios visible
- [ ] All glass card styling matches design system
- [ ] Mobile responsive (single column < 768px)
- [ ] No TypeScript errors, no console errors

---

## SESSIONS ROADMAP

| Session | Focus | Status |
|---------|-------|--------|
| A | Scaffold + design system + 4 section layouts | ✅ Done |
| B | Auth + Supabase client + upload + RAG + AI chat | ✅ Files created (needs npm install + verification) |
| **C** | **Financial dashboard (current)** | 🔄 In progress |
| D | Goals + Vision section | ⬜ Pending |
| E | Planner section | ⬜ Pending |
| F | Health section | ⬜ Pending |
| G | Polish + Vercel deploy | ⬜ Pending |

---

## IMPORTANT NOTES

1. **Route group:** The active app lives at `src/app/(app)/` — the old top-level `src/app/financial/`, `goals/`, etc. can be deleted to avoid routing conflicts.

2. **Auth:** middleware.ts protects all `/(app)/*` routes. Unauthenticated users → `/login`. Magic link via `supabase.auth.signInWithOtp({ email })`.

3. **Recharts + 'use client':** Any component with recharts must be a client component (`'use client'`). Keep data fetching in the server component (page.tsx) and pass data as props.

4. **No hardcoded user ID:** All Supabase queries use RLS — the authenticated user's session is automatic. Never hardcode a user UUID.

5. **Tailwind 4:** This project uses Tailwind v4 with `@import "tailwindcss"` (not the v3 config file). Use utility classes normally.
