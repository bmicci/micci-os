# Prompt — Financial Dashboard Rebuild

Paste this entire prompt into a new Claude Code chat opened in `/home/user/micci-os`.

---

I'm rebuilding the `/financial` page in my Next.js 15 + Supabase app called **micci-os**.

Please read these files first before doing anything:
1. `docs/financial-context.md` — full context, all real financial data, what exists, what's missing
2. `src/app/(app)/financial/page.tsx` — current page structure
3. `src/components/financial/` — all existing components

**The goal:** Transform the current single-scroll financial page into a **tabbed dashboard** matching the 8-tab HTML prototype described in `docs/financial-context.md`. All real data is already in the Supabase database via `seed.sql`.

**Start with Tab 1 (Overview) and Tab 4 (Debt Tracker)** since the most components already exist for those. Then we'll tackle the other tabs one by one.

**Rules:**
- Use the existing component files — extend them, don't replace
- Server components fetch from Supabase directly using `createClient()` from `@/lib/supabase/server`
- Client components (charts, interactive) get data as props
- Match the existing dark glass-morphism design system (`glass-card`, `var(--accent-cyan)`, etc.)
- Charts use Recharts (already installed)
- The page is at `src/app/(app)/financial/page.tsx`
- Branch: `claude/goals-pagination-filtering-RO4I2` — develop and push here

Please start by reading the context file and the existing components, then propose a plan for the tab structure before writing any code.
