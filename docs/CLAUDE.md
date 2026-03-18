# CLAUDE.md — Micci-OS v2

> This file provides Claude Code with full project context. Read this first before any development session.

## What Is This Project

Micci-OS is a personal command center for Brandon Micci, covering financial management, career planning, health & wellness, goal tracking, and daily task management. It is a **working Next.js application** being enhanced with new interactive modules — NOT a greenfield build.

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router), React 19, TypeScript (strict)
- **Styling:** Tailwind CSS v4, Geist fonts, CSS variables for glassmorphism theme
- **Database:** Supabase (PostgreSQL + pgvector + RLS) — 27+ tables, all RLS-protected
- **Auth:** Supabase Auth (magic link + Google OAuth)
- **Charts:** Recharts 3.8.0 (standard charts), D3.js/Visx planned for custom viz
- **State:** Currently React useState + server component props. **Migrating to:** Zustand (client) + TanStack Query (server cache)
- **AI:** Anthropic Claude (chat via Vercel AI SDK) + OpenAI (embeddings via text-embedding-3-small)
- **Deployment:** Vercel

## Project Structure

```
src/
├── app/(app)/              # Authenticated routes with sidebar layout
│   ├── dashboard/          # Command center summary
│   ├── financial/          # 8-tab financial overview (existing)
│   ├── finance/            # NEW: interactive simulators (paycheck, heloc, cashflow, scenarios)
│   ├── goals/              # Life plan + vision board
│   ├── planner/            # Weekly planner + schedule
│   ├── health/             # Supplements, protocols, labs, fitness, skincare
│   ├── career/             # NEW: job search KPIs + networking CRM
│   ├── tasks/              # NEW: standalone task manager
│   └── settings/           # Profile + preferences
├── app/api/                # API routes (chat, upload, goals, calendar, plaid stubs)
├── components/             # UI components organized by domain
├── lib/                    # Business logic
│   ├── finance/            # NEW: pure calculation engine (paycheck, heloc, cashflow, scenarios)
│   ├── tax/                # NEW: 2026 federal brackets, FICA, state rates
│   ├── supabase/           # Supabase clients (browser, server, service)
│   └── ai/                 # Embeddings + retrieval
├── stores/                 # NEW: Zustand store slices
├── types/                  # TypeScript type definitions
└── scripts/                # Seed scripts, data migration
```

## Key Architectural Rules

1. **Supabase is the single source of truth.** No hardcoded financial data in production. Data enters Supabase via the Document Import System (see `docs/prds/05-DOCUMENT-IMPORT-SYSTEM.md`) — structured Excel files are parsed deterministically, unstructured PDFs use AI extraction with human review. The app reads from Supabase only. Tax brackets and IRS limits are the exception (reference data stays in `lib/tax/`).

2. **All financial math lives in `lib/finance/`.** Components NEVER do calculations. Pure functions, fully typed, unit testable. The calculation engine is consumed by Zustand stores, not by components directly.

3. **Zustand for client state, TanStack Query for server cache.** Zustand stores hydrate from TanStack Query on initial load. Writes go to Zustand immediately (optimistic) then persist to Supabase. Components read from Zustand stores.

4. **Cross-module reactivity via Zustand subscriptions.** Paycheck Simulator → Cash Flow Model → Scenario Engine are interconnected. Changing salary in Paycheck instantly updates Cash Flow free cash.

5. **All Supabase tables use RLS** scoped to `auth.uid() = user_id`. Never bypass RLS from client code. Service client (bypasses RLS) is server-only for document processing and seeding.

6. **Design system:** Dark glassmorphism theme. CSS variables in `globals.css`. Cards use `rgba(255,255,255,0.05)` bg, `rgba(0,212,255,0.2)` border, `16px` border-radius, `backdrop-filter: blur(20px)`. Primary accent: `linear-gradient(135deg, #00D4FF, #1E90FF)`. Use shadcn/ui components customized to this theme.

7. **Mobile-first responsive design.** All views functional at 375px minimum. Sidebar collapses to bottom tab bar on mobile.

## Current Build Phase

**Phase 0: Foundation Refactor** — See `docs/prds/00-PHASE-0-FOUNDATION-REFACTOR.md`

This phase must complete before any new modules are built. It adds Zustand, TanStack Query, the calculation engine, Supabase-first data migration, component reorganization, and type consolidation.

## PRD Documents

Read the relevant PRD before building any module:

| PRD | Scope | Path |
|---|---|---|
| Phase 0: Foundation Refactor | Zustand, TanStack Query, calc engine, Supabase-first, folder reorg | `docs/prds/00-PHASE-0-FOUNDATION-REFACTOR.md` |
| Phase 1: Financial Simulator | Paycheck Sim, HELOC Tracker, Cash Flow, Scenario Engine | `docs/prds/01-FINANCIAL-SIMULATOR.md` |
| Phase 2: Life Operations | Task Manager, Planner + Calendar Sync, Goals + Vision Board | `docs/prds/02-LIFE-OPERATIONS.md` |
| Phase 3B: Health & Wellness | Protocol tracker, lab results, fitness, skincare | `docs/prds/03-HEALTH-WELLNESS.md` |
| Phase 3C: Career | Job Search KPIs, Networking CRM | `docs/prds/04-CAREER-MODULES.md` |
| Phase 0B: Document Import System | Structured + AI-assisted data ingestion from uploaded documents | `docs/prds/05-DOCUMENT-IMPORT-SYSTEM.md` |
| Implementation Plan | Phase dependencies, build order, timeline | `docs/IMPLEMENTATION_PLAN.md` |

## Supabase Connection

- **Project:** ptrcyxqybzqwwkridvze.supabase.co
- **Client files:** `src/lib/supabase/client.ts` (browser), `server.ts` (SSR), `service.ts` (admin)
- **Env vars needed:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Financial Context

Brandon is transitioning from JPMorgan Chase (last day: March 19, 2026) into a career transition period. Key facts:
- **Total debt:** ~$700K across 15+ accounts
- **HELOC:** $190K limit at 6.85% (Prime + 0.10%), ~$153K drawn
- **Mortgage:** BofA $498K @ 3.375%
- **0% promo debt:** ~$49K across Chase + Citi (expiring Jul 2026 – Jun 2027)
- **Monthly debt service:** ~$7,400/mo
- **Texas resident** (no state income tax)

The Simulator PRD (`docs/prds/01-FINANCIAL-SIMULATOR.md`) has the complete, current account balances. Data is imported into Supabase via the Document Import System (`docs/prds/05-DOCUMENT-IMPORT-SYSTEM.md`) — upload the HELOC Consolidation Plan Excel to populate debt accounts, upload W-2s and IRS notices to populate tax/IRS modules.

## What NOT to Change

- Auth system (magic link + Google OAuth) — working, don't touch
- AI Chat (`AIChat.tsx` + `/api/chat/`) — working, don't touch unless enhancing
- Document upload pipeline — working, being EXTENDED (not replaced) with structured extraction in Phase 0B
- Animated background (`AnimatedBackground.tsx`) — working, keep as-is
- Supabase project configuration — tables may be added, but don't modify existing RLS policies without explicit approval
