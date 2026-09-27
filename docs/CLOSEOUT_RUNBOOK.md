# Closeout Runbook — Sep 27, 2026

Everything here is paste-and-run (Supabase SQL editor) or a dashboard click.
Work top to bottom. State as of Sep 25 check: 8,508 transactions, both Plaid
items active, backfill verified through Sep 17; security migration APPLIED to
the live DB (Sep 19).

## 1. Fix the cron scheduler (Vercel dashboard)

`CRON_SECRET` is set and the redeploy happened (Sep 18 23:14 UTC) — the sync
route works when invoked (manual sync succeeded 23:32). But no cron has fired
since: `last_synced_at` stayed at Sep 18 through Sep 25, and the price cron
has never produced a snapshot. The scheduler itself isn't invoking.

- Vercel → micci-os → **Settings → Cron Jobs**: both crons
  (`/api/plaid/sync` daily 11:00 UTC, `/api/investments/refresh-prices`
  weekdays 21:00 UTC) should be listed and **Enabled**. Months of 401s may
  have led Vercel to disable them — if so, re-enable. The page shows recent
  invocations + status codes; a 401 there means the secret mismatches, a
  missing entry means the scheduler is off.
- **Bulletproof fallback** (works regardless of Vercel's scheduler): a free
  external pinger (e.g. cron-job.org) calling once a day:
  `GET https://micci-os.vercel.app/api/plaid/sync` with header
  `Authorization: Bearer <CRON_SECRET value>`. This is proven to work — it's
  exactly what the Sep 18 manual test did.

## 2. De-duplicate the Plaid backfill — ✅ DONE Sep 27 (via MCP)

Plaid's backfill reached Jul 2024, overlapping the CSV-imported years, and
cross-source duplicates evade `transactions_dedup_idx` (different account
names). Measured and cleaned Sep 27: 2,070 exact (date+amount) duplicates
removed, then 1,643 Amex date-shifted duplicates (same amount within ±4
days — Amex CSV uses transaction date, Plaid uses posting date). Final
state: 8,508 → **4,795 rows**, current through Sep 17; 392 CSV-era Plaid
rows remain (transactions the CSVs genuinely missed — kept).
Re-run the queries below only after a full Plaid re-backfill (cursor
reset), which would re-create the overlap:

```sql
-- A. Measure the damage (expect thousands if double-counted)
select count(*) as duplicated_plaid_rows
from transactions p
where p.plaid_txn_id is not null
  and p.date <= '2026-07-24'
  and exists (select 1 from transactions c
              where c.plaid_txn_id is null
                and c.transaction_date = p.transaction_date
                and c.amount = p.amount);

-- B. Cleanup, part 1: CSV fully covers everything before Jul 15
--    (oldest per-account CSV end date) — drop ALL Plaid rows there.
delete from transactions
where plaid_txn_id is not null and date < '2026-07-15';

-- C. Cleanup, part 2: Jul 15–24 is mixed coverage — drop only Plaid rows
--    that exactly duplicate a CSV row (same date + amount).
delete from transactions p
where p.plaid_txn_id is not null
  and p.date between '2026-07-15' and '2026-07-24'
  and exists (select 1 from transactions c
              where c.plaid_txn_id is null
                and c.transaction_date = p.transaction_date
                and c.amount = p.amount);

-- D. Verify: total should land well below 8,508; newest stays ~current
select max(date) as newest_txn, count(*) as total from transactions;
```

CAVEAT: daily incremental syncs will NOT re-add the deleted rows (the sync
cursor is past them). But if `plaid_items.sync_cursor` is ever reset to NULL
again (forcing a full re-backfill), re-run B + C afterward.

After cleanup, glance at `/financial` — burn rate and the runway date
recompute from clean data. That runway number is the one to trust.

## 3. Remaining clicks

- [ ] Merge PR #19 (repo bookkeeping only — the DB migration is already applied)
- [ ] Supabase dashboard → Authentication → Settings → enable **Leaked
      password protection** (advisor WARN; can't be set via SQL)
- [ ] Old repo `brandon-goals-dashboard`: close PR #2 unmerged and archive
      the repo (superseded by /goals here; its sync feature points at a
      dropped table)
- [ ] Vercel env vars marked "Needs Attention" (`SUPABASE_…ROLE_KEY`,
      `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`): re-save as Sensitive type

## Data still owed (from the refresh log, unchanged)

Exact HELOC draw amounts · employer plan balance · home market value ·
MR points confirmation · lab results · quarterly goals review.
