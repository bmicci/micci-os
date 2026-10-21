# PRD 07 — Health Data (check-in, labs, body composition, devices, training, food)

Source spec: "Micci-OS Health: Build Spec" (Oct 2026) plus Brandon's additions:
lab uploads (Quest), Withings + WHOOP direct connection, workout log, meal
prep / food plans, InBody results. Waist measurement is optional (field kept,
not shown in the check-in UI).

## Phase 1 — shipped Oct 21, 2026
- **Daily check-in** `/health/checkin` → `health_checkins` (America/Chicago
  day, last 7 days editable). Weekly weigh-in also writes `body_metrics`.
- **Health → Overview** tab: recovery, HRV (7-day avg), last night's sleep,
  nicotine-free streak (from 2026-09-14, restarts after a "no"), check-in
  streak; 7-day habit scorecard; weight / recovery / HRV / sleep trends with
  InBody scans marked; latest Health brief headline. Math in
  `lib/health/overview.ts`.
- **Lab uploads** (Labs tab) and **InBody uploads** (Fitness tab): file →
  private `health-docs` bucket → Claude structured extraction
  (`lib/healthDocs.ts`) → editable review → `lab_markers` / `body_metrics`.
  Nothing is saved until confirmed. Table `health_documents`.

## Phase 2 — WHOOP + Withings (next)
Build per the source spec §3–5: OAuth connect/callback, rotating-token
refresh serialized per provider, signed webhooks into
`device_webhook_events`, nightly reconcile cron (~5:00 AM CT), Devices card
with connect/disconnect. Needs Brandon to register apps:
- developer.whoop.com — redirect `https://os.brandonmicci.com/api/whoop/callback`,
  webhook `https://os.brandonmicci.com/api/whoop/webhook`
- developer.withings.com — redirect `https://os.brandonmicci.com/api/withings/callback`
- Env vars: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WITHINGS_CLIENT_ID`, `WITHINGS_CLIENT_SECRET`
(Webhook routes must be exempt from the session proxy and verify signatures.)

## Phase 3 — Workout log + meal prep / food plans
- Workout log: sessions with exercises × sets (weight, reps, RPE), templates
  for Push/Pull/Legs, PRs. Extends `workouts`; WHOOP workouts link by time.
- Food: weekly meal plan, prep list, recipes with macros, daily targets.
