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
| briefs (Claude) | `briefs` (tab, doc_key, blocks, payload) | Existing system of record for Claude Routines. New Grok briefs use a parallel structure below to avoid breaking the current hub. |

## New tables (Grok path)

Created by migration `20261101_micci_daily_grok.sql`:
- `briefs` (new columns or separate? — see migration) wait, conflict. Spec wants unique (brief_key, brief_date). Existing uses (tab, doc_key).
- Decision: keep existing `briefs` for Claude. New Grok output goes into a new table `grok_briefs` OR we extend. For phase one we create the tables as specified under the names in the spec, noting the Claude table remains for cutover.

For phase one (markets pilot) we will write to a new `briefs` schema matching the spec. The UI `/daily` will read from it. Existing `/briefs` stays until cutover.

## Model

- `GROK_MODEL` env var, default `grok-4.7`
- Base URL: `https://api.x.ai/v1`
- Tools: `web_search`, `x_search` via Responses API
