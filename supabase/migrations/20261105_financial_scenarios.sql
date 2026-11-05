-- The Scenarios simulator read and wrote financial_scenarios, which never existed:
-- GET swallowed the error and returned [], POST failed silently, so nothing saved.
-- Single tenant: deny-all RLS, accessed only by the service client in
-- /api/finance/scenarios.
create table if not exists financial_scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_baseline boolean not null default false,
  paycheck_inputs jsonb not null default '{}'::jsonb,
  heloc_inputs jsonb not null default '{}'::jsonb,
  cashflow_inputs jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table financial_scenarios enable row level security;
