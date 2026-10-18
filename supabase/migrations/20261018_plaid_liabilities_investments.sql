-- Plaid Liabilities + Investments mirrors (true-up Phase 2).
--
-- Written by the daily Plaid sync (src/lib/plaid.ts) for Items that have
-- consented to these products; read server-side only. Deny-all RLS like the
-- other single-tenant pipeline tables. These are mirrors of what the bank
-- reports: the manual debt_accounts / portfolio_positions rows are NOT
-- overwritten — the app shows both when they disagree.

alter table public.plaid_items
  add column if not exists product_status jsonb not null default '{}'::jsonb;
  -- e.g. {"liabilities":"ok","investments":"not_consented"}

create table if not exists public.plaid_liabilities (
  plaid_account_id        text primary key,
  item_id                 text not null,
  institution             text,
  account_name            text,
  kind                    text not null check (kind in ('credit','mortgage','student')),
  current_balance         numeric,
  last_statement_balance  numeric,
  last_statement_date     date,
  minimum_payment         numeric,
  next_payment_due_date   date,
  last_payment_amount     numeric,
  last_payment_date       date,
  is_overdue              boolean,
  interest_rate           numeric,          -- mortgage / student: percentage
  aprs                    jsonb not null default '[]'::jsonb,  -- credit: [{apr_type, apr_percentage, balance_subject_to_apr}]
  raw                     jsonb not null default '{}'::jsonb,
  updated_at              timestamptz not null default now()
);

create table if not exists public.plaid_holdings (
  plaid_account_id   text not null,
  security_id        text not null,
  item_id            text not null,
  account_name       text,
  ticker             text,
  name               text,
  security_type      text,
  quantity           numeric,
  price              numeric,
  price_as_of        date,
  value              numeric,
  cost_basis         numeric,
  updated_at         timestamptz not null default now(),
  primary key (plaid_account_id, security_id)
);

alter table public.plaid_liabilities enable row level security;
alter table public.plaid_holdings    enable row level security;
