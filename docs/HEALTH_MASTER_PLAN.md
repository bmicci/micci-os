# Health, Fitness & Diet — Master Plan
**Date:** Sep 27, 2026 · Companion to `COMPREHENSIVE_AUDIT.md` §5
**Design principle (proven by the finance module):** derive from data streams,
never depend on typing. The finance module works because transactions flow in
and everything derives. Health today is the opposite — four manual-entry tabs,
zero streams, zero usage. This plan flips it.

**North star:** open one page each morning and see — recovery state, today's
protocol + schedule merged, what to train, and whether the trend lines are
moving. One glance, three taps max.

---

## 1. Existing foundation (more than it looks)

Schema already in place, mostly empty: `protocols`, `protocol_logs`,
`protocol_compliance`, `protocol_supplies`, `supplements`,
`hormone_protocols`, `lab_markers`, `workouts`, `body_metrics`,
`progress_photos`, `skincare_routine`, `rituals`, `ritual_log`,
`schedule_blocks`, `schedule_completions`, `daily_schedule`.
UI: 4 tabs (Protocols, Labs, Fitness, Skincare), 1,590 LOC.
The cron + OAuth-token patterns are proven (Plaid). Health reuses both.

## 2. Data streams (the fix for zero usage)

### 2a. Whoop — primary stream (build first)
OAuth2 REST API (developer.whoop.com): recovery %, HRV, RHR, sleep stages +
duration + need, strain, workouts w/ HR zones, respiratory rate, skin temp.
- Mirror the Plaid pattern exactly: `wearable_items` (provider, tokens,
  status, last_synced_at) + daily cron `/api/health/sync` (CRON_SECRET,
  proxy-exempt GET like the other crons) + on-demand button.
- Normalized tables (provider-agnostic): `health_days` (date, recovery_pct,
  hrv, rhr, sleep_min, sleep_need_min, strain, source), `health_workouts`
  (start, sport, strain/load, avg_hr, zones jsonb, source).
- Token refresh handled server-side; item goes `login_required` on revoke —
  same status UX as Plaid items.

### 2b. Apple Health — secondary stream
No server API exists. Route: **Health Auto Export** app (one-time $5-ish) →
scheduled JSON POST to `/api/health/ingest` (bearer token env var) → same
normalized tables with `source='apple'`. Gets steps, stand hours, weight from
smart scale, workouts from Watch. Conflict rule: Whoop wins for
sleep/recovery, Apple wins for steps/weight, workouts union by time-overlap
dedup (learned that lesson with Plaid — dedup on ingest, tolerant insert).

### 2c. Deliberate non-integrations
Full food-logging APIs (MyFitnessPal has no public API; Cronometer export
only) — see §5 for why we don't want them anyway.

## 3. The "Today" panel — the habit loop (build second)

One screen replacing the protocols-tab-plus-planner-page split:
- **Left: today's time blocks** from `schedule_blocks`/`daily_schedule`.
- **Right rail, aligned to time slots: protocol items** (AM supplements with
  the 6:30 block, gym protocol with the training block, PM stack with wind-
  down). One tap = `protocol_compliance` row; tap the block = completion.
- **Top strip: recovery-aware header** — Whoop recovery % colors the day
  (green: push / yellow: as planned / red: swap training for zone-2 + sleep
  target). This is the moment wearable data changes behavior, not just
  decorates a chart.
- **Bottom: streaks** (protocol %, workouts/wk, sleep-need met) — the
  compliance flywheel. Streak math server-side from compliance rows.
Data exists; this is a view + two mutations. Highest-leverage single build in
the module.

## 4. Training

- **Templates**: `workout_templates` (name, exercises jsonb: sets/reps/last
  weight). "Repeat last leg day" pre-fills; progressive-overload hint (+5 lb
  when all sets hit last time). Logging a lift = 3 taps, not a form.
- **Auto-import**: Whoop/Watch workouts land as `health_workouts`; the panel
  asks "attach to template?" so cardio counts without typing.
- **Body comp**: weight auto-flows from scale via Apple export; `body_metrics`
  chart gains trend + 7-day smoothing; `progress_photos` monthly prompt as an
  action item.
- **Recovery-adjusted plan**: weekly volume vs strain chart; red-recovery day
  auto-suggests swapping the scheduled session.

## 5. Diet — the 80/20 (deliberately not a macro logger)

Macro logging is where health apps go to die; compliance collapses in week 2.
Instead, three objective-ish signals with near-zero friction:
1. **Daily 3-state protocol check** — on / partial / off, one tap on the
   Today panel, trend-charted weekly. (Add `diet_state` to the compliance
   row.)
2. **Eating-out index from transactions** — the finance DB already knows
   DoorDash/restaurant/grocery spend. A weekly "food environment" card
   (restaurant vs grocery ratio, delivery count) — objective diet drift
   signal, zero entry, and something literally no commercial health app can
   do because they don't have your transactions.
3. **Protein anchor (optional)**: a single daily tap "hit protein target?"
   if wanted — never full macros. If real macro data is ever desired,
   Cronometer CSV import, not built-in logging.

## 6. Labs & biomarkers (Function Health-style, self-owned)

- `lab_markers` gains reference ranges + optimal ranges (two bands on every
  chart), draw-window scheduling (trough reminders as action items — the
  Jul 12–13 window was missed for lack of a nag), and panel groupings
  (hormone, metabolic, lipid, inflammation).
- Import path: paste/upload PDF → existing `process-document` pipeline
  extracts values (the RAG chat infra already parses PDFs) → confirm rows.
- Trend view across draws per marker with protocol-change annotations
  ("started X on date") — turns labs from a table into an experiment log.
- Hormone protocol compliance (`hormone_protocols` + `protocol_supplies`)
  ties in: supplies runway ("reorder in 12 days") as auto action items.

## 7. The moat: cross-domain correlations

All of this lands in ONE Postgres with finance, planner, goals, job search.
No commercial app can join these:
- Sleep/recovery vs deep-work blocks completed (planner) — "you close 2x
  more blocks above 70% recovery."
- Spend vs state: eating-out index vs recovery/protocol compliance weeks.
- Stress era tracking: RHR/HRV trend across the job-search timeline.
- Monthly auto-generated "State of Brandon" report card: one page, all
  domains, generated by a cron into the dashboard (and later email).
Start simple: a `correlations` card on /health computing 3 fixed pairings
weekly. Grow from there.

## 8. Build order (sized for future sessions)

| # | Build | Size | Unlocks |
|---|---|---|---|
| 1 | Whoop OAuth + daily sync cron + `health_days`/`health_workouts` | 1–2 sessions | The stream everything rides on |
| 2 | Today panel (schedule ⊕ protocols ⊕ recovery header ⊕ streaks) | 1 session | The habit loop; module goes from 0 usage to daily |
| 3 | Apple Health ingest webhook (weight/steps/workouts) | 0.5 session | Body comp auto-flow |
| 4 | Workout templates + auto-attach | 1 session | 3-tap logging |
| 5 | Diet signals (3-state + eating-out index) | 0.5 session | Diet visibility w/o logging |
| 6 | Labs upgrade (ranges, PDF import, annotations, draw reminders) | 1 session | Experiment log |
| 7 | Correlations card + monthly report | 1 session | The moat |

Prereq for #1: Whoop developer account (free) — create app at
developer.whoop.com, redirect URI `https://micci-os.vercel.app/api/health/whoop/callback`,
store client id/secret in Vercel env (Sensitive type this time).

**Total: ~6–7 sessions to a health module that beats Whoop's own app** —
because Whoop can't see your schedule, your protocols, your labs, or your
DoorDash orders, and this can.
