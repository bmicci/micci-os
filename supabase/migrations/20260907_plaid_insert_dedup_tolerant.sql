-- Plaid sync fix: bulk insert that tolerates duplicates on ANY unique
-- constraint, not just plaid_txn_id.
--
-- The original sync upserted with ON CONFLICT (plaid_txn_id), but rows can
-- also collide on transactions_dedup_idx (user_id, account_name,
-- transaction_date, merchant, amount) — e.g. two identical same-day charges
-- at the same merchant, or overlap with previously CSV-imported rows. One
-- such collision aborted the whole batch, which is why both connected banks
-- went to status='error' on their first backfill (Jul 25) and never synced.
--
-- ON CONFLICT DO NOTHING (no target) skips rows conflicting on any unique
-- index, including collisions within the same batch. Matches the CSV
-- importer's dedup philosophy: a same-key row is the same transaction.

create or replace function public.plaid_insert_transactions(rows jsonb)
returns integer
language sql
set search_path = public, pg_temp
as $$
  with ins as (
    insert into public.transactions
      (user_id, transaction_date, date, merchant, amount, category,
       account_name, is_income, raw_description, plaid_txn_id)
    select
      (r->>'user_id')::uuid,
      (r->>'transaction_date')::date,
      (r->>'date')::date,
      r->>'merchant',
      (r->>'amount')::numeric,
      r->>'category',
      r->>'account_name',
      (r->>'is_income')::boolean,
      r->>'raw_description',
      r->>'plaid_txn_id'
    from jsonb_array_elements(rows) as r
    on conflict do nothing
    returning 1
  )
  select coalesce(count(*), 0)::integer from ins;
$$;

-- Server-only (called with the service role); keep it away from client roles.
revoke execute on function public.plaid_insert_transactions(jsonb) from public, anon, authenticated;
