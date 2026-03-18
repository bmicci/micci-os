# Phase 0: Foundation Refactor PRD

**Owner:** Brandon Micci | **Version:** 1.0 | **Date:** March 17, 2026
**Status:** Ready to Build | **Priority:** CRITICAL — blocks all other phases

---

## 1. Purpose

Upgrade the existing micci-os Next.js application's architecture to support the interactive financial simulator, cross-module reactivity, and Supabase-first data layer. This phase does NOT add new features — it restructures the foundation so Phases 1–5 can build cleanly on top of it.

## 2. Current State (What Exists)

The app is a working Next.js 16 application deployed on Vercel with:

- **Framework:** Next.js 16.1.6 App Router, React 19, TypeScript
- **Auth:** Supabase Auth (magic link + Google OAuth) with RLS
- **Database:** Supabase PostgreSQL with 27 tables + pgvector for embeddings
- **Styling:** Tailwind CSS v4, Geist fonts, glassmorphism design system (CSS variables)
- **Charts:** Recharts 3.8.0
- **AI:** Anthropic Claude (chat) + OpenAI (embeddings) via Vercel AI SDK
- **Routes:** /dashboard, /financial (8 tabs), /goals, /planner, /health
- **Data:** Heavy hardcoded constants in `lib/financial-data.ts` with Supabase fallback

### Key Architectural Gaps

1. **No client state management** — all state is React useState + server component props
2. **No API caching layer** — data is fetched fresh on every page load
3. **Hardcoded financial data** — `financial-data.ts` has 500+ lines of constants; Supabase is the fallback, not the source of truth
4. **Flat component structure** — 18+ financial components in one folder
5. **No calculation engine** — financial math is inline in components or nonexistent
6. **No cross-module reactivity** — changing data in one view doesn't update others

## 3. Refactor Scope

### 3.1 Add Zustand for Client State Management

**Why:** The Financial Simulator requires cross-module reactivity (paycheck inputs → cash flow model → scenario comparison). React useState can't do this without prop drilling through unrelated components.

**Install:**
```bash
npm install zustand
```

**Store Architecture** — create `src/stores/` with the following slices:

| Store File | Purpose | Persisted? |
|---|---|---|
| `stores/finance/paycheck-store.ts` | Salary, tax method, 401k, deductions, pay frequency | Yes (Supabase) |
| `stores/finance/heloc-store.ts` | HELOC accounts, rate, limit, draw history | Yes (Supabase) |
| `stores/finance/cashflow-store.ts` | Income inputs, obligations, living expenses, allocations | Yes (Supabase) |
| `stores/finance/scenario-store.ts` | Saved scenarios (up to 5), active/comparison IDs | Yes (Supabase) |
| `stores/finance/debt-store.ts` | All 15 debt accounts, statuses, balances | Yes (Supabase) |
| `stores/finance/subscription-store.ts` | 25 subscriptions with status/cost | Yes (Supabase) |
| `stores/settings-store.ts` | Theme, display preferences, default assumptions | Yes (Supabase) |

**Zustand Persistence Pattern:**
```typescript
// Zustand stores hydrate from Supabase on initial load via TanStack Query
// Writes go to Zustand immediately (optimistic) then sync to Supabase
// This gives instant UI reactivity + durable persistence
```

**Implementation Notes:**
- Each store is a separate file for code splitting
- Use Zustand's `subscribeWithSelector` middleware for fine-grained reactivity
- Stores expose `hydrate(data)` method called by TanStack Query on initial fetch
- Stores expose `persist()` method that writes current state to Supabase

### 3.2 Add TanStack Query for Server State

**Why:** Current server components fetch data on every page navigation with no caching. TanStack Query adds stale-while-revalidate caching, background refetching, and mutation support — essential for the interactive modules.

**Install:**
```bash
npm install @tanstack/react-query
```

**Setup:**
- Create `src/lib/query-client.ts` — configure default staleTime (5 min for financial data)
- Create `src/components/providers/QueryProvider.tsx` — wrap app in QueryClientProvider
- Add QueryProvider to `src/app/(app)/layout.tsx`

**Query Keys Convention:**
```typescript
// All query keys follow: [domain, entity, ...params]
['finance', 'accounts']
['finance', 'subscriptions']
['finance', 'modules']
['finance', 'scenarios', scenarioId]
['health', 'protocols']
['health', 'labs']
['goals', 'all']
['planner', 'blocks', weekId]
```

**Migration Pattern for Existing Pages:**
Current server component data fetching stays for initial SSR. TanStack Query wraps the client-side hydration and subsequent refetches:
```typescript
// Server Component (page.tsx) — fetches data for SSR
// Client Component — uses useQuery with initialData from server props
// Mutations — useMutation with optimistic updates to Zustand + Supabase write
```

### 3.3 Migrate to Supabase-First Data Layer

**Current Problem:** `src/lib/financial-data.ts` contains 500+ lines of hardcoded debt accounts, modules, subscriptions, deadlines, bills, spending categories, and tax data. The Supabase fetch in `financial-data-service.ts` falls back to these constants if DB queries fail.

**Target State:** Supabase is the single source of truth. Hardcoded data becomes seed scripts only.

**Migration Steps:**

1. **Create seed script** — `scripts/seed-financial-data.ts`
   - Parse existing hardcoded constants from `financial-data.ts`
   - Also parse Excel deliverables (Module 1–6 .xlsx files) if available
   - Insert/upsert into Supabase tables: `debt_accounts`, `financial_modules`, `subscriptions`, `budget_categories`
   - Script must be idempotent (safe to re-run)
   - Log any parsing errors

2. **Update `financial-data-service.ts`**
   - Remove fallback to hardcoded data
   - All queries go to Supabase only
   - Return typed interfaces that match current component expectations
   - Add error boundaries for DB connection failures (show user-friendly error, not fallback data)

3. **Deprecate `financial-data.ts`**
   - Move to `scripts/legacy/financial-data.ts` for reference
   - Remove all imports of hardcoded data from components
   - Tax brackets and IRS limits stay as constants in `lib/tax/brackets.ts` (these are reference data, not user data)

4. **Seed the following Supabase tables** (data from current hardcoded constants + Simulator PRD):

| Table | Source | Row Count |
|---|---|---|
| `debt_accounts` | HELOC Consolidation Plan (Simulator PRD numbers) | 15 |
| `financial_modules` | M1–M9 status tracker | 9 |
| `subscriptions` | Module 2 audit | 25 |
| `budget_categories` | Spending analysis | 10 |
| `deadlines` (new table) | Critical deadlines from all modules | ~12 |

5. **Create new table: `deadlines`**
```sql
CREATE TABLE deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline_date DATE NOT NULL,
  urgency TEXT CHECK (urgency IN ('critical', 'high', 'medium', 'low')) NOT NULL,
  module TEXT, -- which financial module this relates to
  impact_if_missed TEXT,
  status TEXT CHECK (status IN ('upcoming', 'completed', 'missed')) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own deadlines" ON deadlines
  FOR ALL USING (auth.uid() = user_id);
```

### 3.4 Create Financial Calculation Engine

**Purpose:** All financial math lives in pure, testable TypeScript functions in `src/lib/finance/`. No component ever does math directly. This enables unit testing, reuse across modules, and scenario comparison.

**File Structure:**
```
src/lib/finance/
├── paycheck.ts       — gross pay, federal tax, FICA, state tax, net pay
├── heloc.ts          — interest calc, balance projection, savings analysis
├── cashflow.ts       — monthly flow, free cash, allocation suggestions
├── scenarios.ts      — compare scenarios, calculate deltas, rank by metric
├── debt.ts           — payoff timeline, interest cost, consolidation modeling
├── projections.ts    — 12-month forward projection with event-aware modeling
└── index.ts          — barrel export

src/lib/tax/
├── brackets.ts       — 2026 federal brackets, SS wage base ($176,100), Medicare
├── state.ts          — state tax rates by state (TX = 0%)
└── index.ts          — barrel export
```

**Key Functions to Implement:**

```typescript
// paycheck.ts
calculateGrossPay(salary: number, bonus: number, frequency: PayFrequency): number
calculateFederalTax(taxableIncome: number, filingStatus: FilingStatus): TaxResult
calculateSocialSecurity(grossPay: number, ytdGross: number): { amount: number; cappedAt?: number }
calculateMedicare(grossPay: number, ytdGross: number): { base: number; additional: number }
calculateNetPay(inputs: PaycheckInputs): PaycheckResult

// heloc.ts
calculateMonthlyInterest(balance: number, rate: number): number
projectBalance(currentBalance: number, rate: number, payment: number, months: number): BalanceProjection[]
calculateConsolidationSavings(accounts: DebtAccount[], helocRate: number): SavingsAnalysis
getNextDeadline(accounts: DebtAccount[]): DeadlineInfo

// cashflow.ts
calculateMonthlyFlow(income: PaycheckResult, obligations: Obligation[], expenses: Expense[]): CashFlowResult
calculateFreeCash(cashflow: CashFlowResult): number
suggestAllocations(freeCash: number, priorities: AllocationPriority[]): Allocation[]

// scenarios.ts
compareScenarios(scenarios: Scenario[]): ComparisonResult
calculateDelta(baseline: Scenario, variant: Scenario): DeltaResult
rankByMetric(scenarios: Scenario[], metric: MetricKey): RankedScenario[]
```

**All functions must be:**
- Pure (no side effects, no store access, no API calls)
- Fully typed with TypeScript interfaces
- Unit testable (create `__tests__/` alongside each file)

### 3.5 Reorganize Component Folder Structure

**Current:** All financial components flat in `src/components/financial/` (18+ files)

**Target:**
```
src/components/
├── ui/                          — shadcn/ui primitives (exists, keep as-is)
├── layout/
│   ├── Sidebar.tsx              — move from components/
│   ├── AnimatedBackground.tsx   — move from components/
│   └── AIChat.tsx               — move from components/
├── charts/
│   ├── DebtDonut.tsx            — move from financial/
│   ├── BurnRateChart.tsx        — move from financial/
│   ├── WaterfallChart.tsx       — new (reusable)
│   ├── ProjectionChart.tsx      — new (reusable)
│   └── index.ts
├── finance/
│   ├── overview/                — OverviewTab, KPIStrip, KPICard
│   ├── debt/                    — DebtTrackerTab, DebtTable, DebtDonut
│   ├── heloc/                   — HELOCPlanTab → interactive HELOC tracker
│   ├── paycheck/                — NEW: Paycheck Simulator components
│   ├── cashflow/                — NEW: Cash Flow Model components
│   ├── scenarios/               — NEW: Scenario Engine components
│   ├── subscriptions/           — SubscriptionsTab, SubscriptionDonut
│   ├── budget/                  — SpendingBudgetTab, BurnRateChart
│   ├── tax/                     — TaxSnapshot
│   ├── modules/                 — ModulePlaybookTab
│   └── shared/                  — Shared financial UI (currency input, percentage slider)
├── goals/                       — exists, keep structure
├── planner/                     — exists, keep structure
├── health/                      — exists, will expand in Phase 3B
├── career/                      — NEW: Job Search KPIs, Networking CRM
├── dashboard/                   — exists, keep structure
└── providers/
    └── QueryProvider.tsx        — NEW: TanStack Query provider
```

**Migration approach:** Move files one folder at a time. Update all imports. Run `npm run build` after each move to catch broken imports immediately.

### 3.6 TypeScript Types Consolidation

**Current:** Types are scattered — some in `lib/supabase/types.ts`, some inline in components, some in `lib/financial-data.ts`.

**Target:** Centralize all types in `src/types/`:
```
src/types/
├── finance.ts        — DebtAccount, PaycheckInputs, PaycheckResult, CashFlowResult, Scenario, etc.
├── goals.ts          — Goal, Milestone, LifeDomain, VisionBoardItem
├── planner.ts        — ScheduleBlock, Task, CalendarEvent
├── health.ts         — Protocol, LabResult, FitnessLog, SkincareStep
├── career.ts         — KPIMetric, Contact, InteractionLog
├── database.ts       — Supabase row types (generated or manual)
└── index.ts          — barrel export
```

## 4. New Dependencies

| Package | Purpose | Version |
|---|---|---|
| `zustand` | Client state management | latest |
| `@tanstack/react-query` | Server state caching + mutations | latest |
| `date-fns` | Date utilities (already may be used) | latest |

**Note:** shadcn/ui should be initialized if not already. Run `npx shadcn-ui@latest init` and configure for the existing dark theme.

## 5. Acceptance Criteria

- [ ] Zustand stores created for all financial modules with hydrate/persist pattern
- [ ] TanStack Query provider wrapping the app with working query cache
- [ ] `financial-data.ts` hardcoded constants moved to seed script
- [ ] All financial data fetched from Supabase (no hardcoded fallback in production)
- [ ] Seed script runs idempotently and populates all financial tables
- [ ] `deadlines` table created with RLS and seeded with critical dates
- [ ] `lib/finance/` calculation engine created with all core functions
- [ ] Unit tests passing for all calculation functions
- [ ] Component folder restructured per Section 3.5
- [ ] Types consolidated in `src/types/`
- [ ] `npm run build` passes with zero errors
- [ ] Existing features (all 8 financial tabs, goals, planner, health, AI chat) still functional
- [ ] No regression in auth flow or RLS

## 6. Estimated Duration

**1–2 weeks** — This is foundational work. Rushing it creates tech debt that slows every subsequent phase. The calculation engine and Zustand stores are the highest-value items — they unblock the entire Financial Simulator.

## 7. Dependencies

- Supabase project must be accessible with service role key for seed script
- Current debt account balances should be updated to latest numbers before seeding (see: M1–M9 updates pending from Brandon)
- No external API dependencies for this phase

## 8. Risks

| Risk | Mitigation |
|---|---|
| Moving components breaks imports | Run `npm run build` after each folder move. Use IDE refactoring tools. |
| Supabase-first breaks pages if DB is down | Add error boundaries with informative messages, not silent fallbacks to stale data |
| Zustand + TanStack Query interaction complexity | Follow the hydrate-from-query pattern. Don't duplicate state between the two. |
| Existing tests (if any) break | Scan for existing tests first. Update imports in test files alongside component moves. |
