# Micci-OS v2 — Implementation Plan

**Date:** March 17, 2026 | **Owner:** Brandon Micci
**Repo:** github.com/bmicci/micci-os (existing Next.js 16 app)

---

## Approach

This is a **Refactor + Enhance** of an existing, working Next.js application — NOT a ground-up rebuild. The current app has authentication, 27 Supabase tables, a RAG-powered AI chat, 5 working routes, and a glassmorphism design system. The plan adds architectural upgrades (Zustand, TanStack Query, Supabase-first data) and then builds new interactive modules on top.

## Phase Dependency Graph

```
Phase 0: Foundation Refactor (BLOCKS EVERYTHING)
    │
    ├── Phase 1: Financial Simulator (highest priority)
    │   ├── 1A: Paycheck Simulator
    │   ├── 1B: HELOC Interactive Tracker
    │   ├── 1C: Cash Flow Model (depends on 1A + 1B)
    │   └── 1D: Scenario Engine (depends on 1A + 1B + 1C)
    │
    ├── Phase 2: Life Operations (can run parallel with Phase 1)
    │   ├── 2A: Task Manager
    │   └── 2B: Google Calendar Sync (depends on 2A)
    │
    ├── Phase 3: Enhancements (can run parallel after Phase 0)
    │   ├── 3A: Goals Tracker + Vision Board
    │   ├── 3B: Health & Wellness modules
    │   └── 3C: Career modules
    │
    ├── Phase 4: Plaid Integration (depends on Phase 1)
    │
    └── Phase 5: Advanced Viz + Polish (depends on all prior)
```

## Detailed Phase Breakdown

### Phase 0: Foundation Refactor
**Duration:** 1–2 weeks | **Priority:** CRITICAL
**PRD:** `docs/prds/00-PHASE-0-FOUNDATION-REFACTOR.md`

| Task | Duration | Notes |
|---|---|---|
| Install Zustand + create store architecture | 2 days | 7 store slices for finance + settings |
| Install TanStack Query + QueryProvider | 1 day | Wrap app, set up query keys |
| Create `lib/finance/` calculation engine | 3 days | Pure functions + unit tests |
| Create `lib/tax/` bracket engine | 1 day | 2026 brackets, FICA, state rates |
| Build seed script for Supabase | 1 day | Parse hardcoded data → Supabase insert |
| Migrate to Supabase-first data layer | 1 day | Remove hardcoded fallback |
| Create `deadlines` table | 0.5 days | New table + seed critical dates |
| Reorganize component folder structure | 1 day | Move files, fix imports, verify build |
| Consolidate TypeScript types | 0.5 days | `src/types/` barrel exports |

**Exit Criteria:** `npm run build` passes, all existing features work, Zustand stores hydrate from Supabase, calculation engine has passing unit tests.

---

### Phase 1: Financial Simulator
**Duration:** 3–4 weeks | **Priority:** HIGH
**PRD:** `docs/prds/01-FINANCIAL-SIMULATOR.md`

| Sub-Phase | Duration | Depends On |
|---|---|---|
| **1A: Paycheck Simulator** | 1 week | Phase 0 |
| Build input controls (CurrencyInput, PercentageSlider, selects) | 2 days | |
| Implement tax calculation engine + unit tests | 2 days | |
| Build paystub card UI + annual waterfall chart | 1 day | |
| Persist inputs to Supabase via Zustand | 0.5 days | |
| **1B: HELOC Tracker** | 1 week | Phase 0 |
| Seed account data from Simulator PRD numbers | 0.5 days | |
| Account overview table with inline editing + status badges | 1 day | |
| Balance timeline projection chart | 1 day | |
| Deadline dashboard with countdowns | 1 day | |
| Savings analysis view | 0.5 days | |
| **1C: Cash Flow Model** | 1 week | 1A + 1B |
| Cross-module store wiring (paycheck + HELOC → cash flow) | 1 day | |
| Living expense inputs + custom line items | 1 day | |
| Waterfall chart + allocation engine | 1 day | |
| 12-month projection with event-aware modeling | 2 days | |
| **1D: Scenario Engine** | 1 week | 1A + 1B + 1C |
| Scenario CRUD + Supabase persistence | 1 day | |
| Side-by-side comparison view with delta highlighting | 1.5 days | |
| Sensitivity analysis mini-charts | 1 day | |

---

### Phase 2: Life Operations
**Duration:** 2–3 weeks | **Priority:** MEDIUM
**PRD:** `docs/prds/02-LIFE-OPERATIONS.md`
**Can run in parallel with Phase 1 after Phase 0 completes.**

| Sub-Phase | Duration | Depends On |
|---|---|---|
| **2A: Task Manager** | 1.5 weeks | Phase 0 |
| Extract tasks into standalone /tasks route | 1 day | |
| Task CRUD + category pills + month navigation | 2 days | |
| Overdue rollover + recurring tasks | 1 day | |
| Hard deadlines footer | 0.5 days | |
| **2B: Calendar Sync** | 1 week | 2A |
| Google OAuth + /api/calendar/sync | 1 day | |
| Weekly time-block view with calendar events | 2 days | |
| Task → Calendar push | 1 day | |
| **3A: Goals + Vision Board** | 2 weeks | Phase 0 |
| Progress rings + milestones | 1.5 days | |
| Goal → Task linking | 0.5 days | |
| Quarterly review prompts | 1 day | |
| Vision Board interactive canvas | 3 days | |

---

### Phase 3: Health & Career
**Duration:** 3 weeks (parallel) | **Priority:** MEDIUM
**PRDs:** `docs/prds/03-HEALTH-WELLNESS.md`, `docs/prds/04-CAREER-MODULES.md`
**Can run in parallel with Phases 1–2 after Phase 0 completes.**

| Sub-Phase | Duration | Depends On |
|---|---|---|
| **3B: Health & Wellness** | 2 weeks | Phase 0 |
| Protocol tracker + compliance | 2.5 days | |
| Lab results + trend charts | 2 days | |
| Fitness tracker + body metrics | 2.5 days | |
| Skincare regime | 1.5 days | |
| **3C: Career** | 1 week | Phase 0 |
| KPI dashboard + weekly input + pipeline | 2.5 days | |
| Networking CRM + interactions + decay | 2.5 days | |

---

### Phase 4: Plaid Integration
**Duration:** 2–4 weeks | **Priority:** LOW (deferred)
**Depends On:** Phase 1 (Financial Simulator)

- Install `react-plaid-link`
- Build `/api/plaid/` routes (token exchange, webhooks)
- Link accounts → auto-populate HELOC tracker balances
- Transaction categorization → cash flow model
- Net worth tracker

### Phase 5: Advanced Viz + Polish
**Duration:** 2–3 weeks | **Priority:** LOW (deferred)
**Depends On:** All prior phases

- D3.js custom visualizations (Sankey cash flow, force-directed debt payoff)
- Animated transitions and micro-interactions
- Mobile optimization pass
- Performance audit (bundle size, lazy loading, image optimization)
- Error monitoring (Sentry)
- Security hardening (CSP headers, rate limiting, input sanitization)

---

## Recommended Build Approach

**Use Claude Code for:** Phase 0, Phase 1 (heavy calculation engine + component building), Phase 2A (Task Manager CRUD), Phase 3C (Career — straightforward CRUD modules)

**Use Cowork for:** Data migration tasks (seeding Supabase from Excel), content tasks (populating protocol data, skincare routines, goal content), PRD refinement

**Manual development for:** Design polish, custom D3 visualizations, Google Calendar OAuth debugging, Plaid integration testing

---

## Sidebar Navigation Update

The current sidebar has 5 items. After all phases, the sidebar should have:

```
COMMAND CENTER
  Dashboard           /dashboard

FINANCE
  Overview            /financial         (existing 8-tab view)
  Paycheck Sim        /finance/paycheck  (NEW)
  HELOC Tracker       /finance/heloc     (NEW)
  Cash Flow           /finance/cashflow  (NEW)
  Scenarios           /finance/scenarios (NEW)

LIFE OPS
  Tasks               /tasks             (NEW route, extracted from planner)
  Planner             /planner           (existing, enhanced)
  Goals               /goals             (existing, enhanced)

HEALTH
  Protocols           /health/protocols  (NEW sub-route)
  Lab Results         /health/labs       (NEW sub-route)
  Fitness             /health/fitness    (NEW sub-route)
  Skincare            /health/skincare   (NEW sub-route)

CAREER
  Job Search KPIs     /career/kpis       (NEW)
  Network             /career/network    (NEW)

SYSTEM
  Settings            /settings
  AI Chat             (floating panel — existing)
```

---

## Total Timeline Estimate

| Phase | Duration | Can Parallelize? |
|---|---|---|
| Phase 0: Foundation | 1–2 weeks | No — blocks everything |
| Phase 1: Financial Simulator | 3–4 weeks | After Phase 0 |
| Phase 2: Life Operations | 2–3 weeks | Parallel with Phase 1 |
| Phase 3: Health + Career | 3 weeks | Parallel with Phase 1–2 |
| Phase 4: Plaid | 2–4 weeks | After Phase 1 |
| Phase 5: Polish | 2–3 weeks | After all |

**Minimum viable timeline (Phases 0–3):** ~8–10 weeks with parallelization
**Full platform (Phases 0–5):** ~14–18 weeks
