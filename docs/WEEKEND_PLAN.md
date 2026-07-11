# Financial Dashboard — Finalization Plan (Jul 11–12, 2026 weekend)

Goal: every number real, every tab current, UI tightened. After this
weekend the dashboard runs on a simple monthly routine (re-import CSVs,
glance, act).

Legend: 🧑 = needs Brandon (data only he can get) · 🤖 = Claude builds

---

## Phase 1 — Data truth (Sat morning, ~1 hr of Brandon's time)

The remaining places where the dashboard disagrees with reality. Everything
downstream recomputes automatically once these land.

1. 🧑 **Investments refresh** — export fresh Chase CSVs (tax lots +
   transactions) for BOTH accounts (rollover IRA 3509 + employer plan) and
   re-import at /finance/investments. Target: page shows ~$210K.
   *(Assets "retirement" already bumped to $210K manually — the positions
   page needs the CSVs to match.)*
2. 🧑 **Exact HELOC draw amounts** from Texas CU for the Best Buy ($962.44?)
   and Chase CFU ($8,453.66?) payoffs → Claude trues up drawn balance.
3. 🧑 **Citi Diamond + Citi Best Buy transaction exports** (2yr if easy) →
   Claude verifies Citi's format once, then imports. Completes the 8-account
   picture.
4. 🧑 **TWC benefit end date** — log into TWC portal. Single biggest input
   to the runway model.
5. 🧑 **Current balances quick check**: checking, Wealthfront, and confirm
   vehicles ($35K placeholder) — or drop vehicles from net worth.

## Phase 2 — Stale-data sweep (Sat, 🤖 with Brandon spot-checking)

6. 🤖 Full-text sweep of every module description, note, and action item
   for pre-exit-era references (severance, JPMC dates, old balances).
   Brandon reviews a diff summary, not each file.
7. 🤖 True-up pass from Phase 1 numbers (HELOC drawn, investments,
   balances) across Supabase + code fallbacks.
8. 🤖 Recompute/verify: Overview KPIs, runway, HELOC plan fit after
   true-ups.

## Phase 3 — Last hardcoded tab → live (Sat/Sun, 🤖)

9. 🤖 **Subscriptions tab live**: detect recurring merchants from the
   4,112 imported transactions (same merchant, ~monthly cadence, similar
   amount). Shows: real current price, last-charged date, price-creep vs
   6 months ago, "zombie" flags (still charging post-cancel-list), and
   cancel-candidate savings. Replaces the frozen 2025 audit list.

## Phase 4 — UI/UX pass (Sun, 🤖 builds, Brandon approves order)

10. 🤖 **Tab consolidation 9 → 7** (recommendation):
    - Merge **Promo Deadlines into Debt Payoff** (promo timeline already
      appears in 3 places; Debt Payoff is its natural home)
    - Merge **Net Worth into Overview** (or keep — Brandon's call)
    - Proposed order (matches how the money actually flows):
      **Overview · Cash Flow · Spending (rename Budget vs Actual) ·
      HELOC Plan · Debt Payoff · Investments · Subscriptions**
11. 🤖 **Overview reorder**: KPI strip → Action Items → Deadlines →
    modules/donut below the fold (actions before status).
12. 🤖 **Cash Flow forecast chart**: bars are illegibly small vs the
    cumulative line — switch to dual-axis or area style; add unemployment
    cliff marker (TWC date from Phase 1) and cash-out date marker.
13. 🤖 **Runway front and center**: move the runway KPI into the page
    header (visible from every tab, not just Cash Flow).
14. 🤖 Mobile pass on the new layouts.

## Phase 5 — Walkthrough + routine (Sun evening, together)

15. Tab-by-tab live walkthrough in the browser (like the verify pass).
16. Write the **monthly routine** into the dashboard footer/README:
    export 8 CSVs → drop at /import → glance Overview → act on red items.

---

## Backlog (post-weekend, explicitly NOT this weekend)

- Auto-sync via Plaid/SimpleFIN instead of manual CSV exports
- Consolidate duplicate category names (Transport vs Transportation, etc.)
- Merge the two auth accounts or link them
- Goals/Planner/Health section polish (other PRDs)
