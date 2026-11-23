-- Spend log for the API-key briefs runner (docs/BRIEFS_RUNNER.md).
-- NOT APPLIED with this PR. The runner fails closed while this table is
-- missing: it can't read the month's spend, so it never calls the API.
create table if not exists public.brief_runs (
  id             uuid primary key default gen_random_uuid(),
  ran_at         timestamptz not null default now(),
  model          text not null,
  tab            text not null check (tab in ('money','ai','markets')),
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  searches       integer not null default 0,
  cost_usd       numeric(10,4) not null default 0,
  status         text not null check (status in ('ok','failed')),
  error          text
);
create index if not exists brief_runs_ran_at_idx on public.brief_runs (ran_at);

-- Service role only: RLS on, no policies.
alter table public.brief_runs enable row level security;
