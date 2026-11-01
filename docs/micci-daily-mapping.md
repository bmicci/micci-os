# Micci Daily: Table Mapping

**Date:** 2026-11-01
**Spec:** micci-daily-grok-migration-spec.md

## Existing tables reused

| Spec table | Existing table | Notes |
|---|---|---|
| holdings / positions | `portfolio_positions` | Live tracker: ticker, shares, current_value, cost_basis, day_change, day_change_pct. Also `plaid_holdings` mirror and `tax_lots` for lots. Use `portfolio_positions` as primary for brief inputs. |
| portfolio history | `portfolio_history` | snapshot_date, total_value |
| action items | `action_items` (inferred from PRDs) | For home brief later |
| job pipeline | `job_pipeline`, `job_outreach`, `job_recruiters` | For jobs brief later |
| briefs (Claude) | `briefs` (tab, doc_key, blocks, payload) | Existing system of record for Claude Routines. New Grok briefs use `grok_briefs` to avoid breaking the current hub. |

## New tables (Grok path)

Created by migration `20261101_micci_daily_grok.sql`:
- `grok_briefs` (brief_key, brief_date, title, body_md, highlights, sources, model) — unique (brief_key, brief_date)
- `brief_runs`
- `brief_schedules` (seeded)
- `health_metrics` (empty for now)

## Model & API

- `GROK_MODEL` env var, default `grok-4.7`
- Base URL: `https://api.x.ai/v1`
- Tools: `web_search`, `x_search` via Responses API (`/responses`)
- Secrets: XAI_API_KEY, GROK_MODEL, DISPATCH_SECRET, SUPABASE_SERVICE_ROLE_KEY (already available)

## Phase 1 status

- Migration applied (run in Supabase SQL editor or via CLI)
- Shared helpers: chicago.ts, output.ts, grok.ts, writeBrief.ts
- Functions: markets (pilot), dispatch
- UI: /daily page reads latest grok_briefs for markets

## Next for phase 1 done criteria

1. Deploy functions (`supabase functions deploy markets dispatch`)
2. Set secrets in Supabase dashboard
3. Schedule dispatcher via pg_cron + pg_net every 5 min (see docs or SQL below)
4. Manual test: POST /functions/v1/dispatch?brief=markets&force=true with x-dispatch-secret
5. Verify 3 weekday runs and compare to Claude version

### pg_cron example (run once in SQL editor)

```sql
select cron.schedule(
  'micci-daily-dispatch',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dispatch-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'dispatch_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);
```

Store project_url and dispatch_secret in vault first.
