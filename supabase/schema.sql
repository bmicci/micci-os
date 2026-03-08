-- micci-os Financial Tables
-- All tables use UUID PKs, RLS enabled

create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════
-- Financial Modules (9 modules)
-- ═══════════════════════════════════════
create table financial_modules (
  id uuid primary key default uuid_generate_v4(),
  module_number int not null unique,
  name text not null,
  category text,
  status text not null check (status in ('not_started', 'in_progress', 'complete')),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  description text,
  details jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table financial_modules enable row level security;
create policy "Authenticated users can read financial_modules"
  on financial_modules for select to authenticated using (true);
create policy "Authenticated users can write financial_modules"
  on financial_modules for all to authenticated using (true);

-- ═══════════════════════════════════════
-- Debt Accounts (17 accounts)
-- ═══════════════════════════════════════
create table debt_accounts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  account_type text not null check (account_type in ('credit_card', 'loan', 'mortgage', 'heloc', 'other')),
  balance decimal not null default 0,
  interest_rate decimal not null default 0,
  minimum_payment decimal,
  due_day int,
  status text,
  recommendation text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table debt_accounts enable row level security;
create policy "Authenticated users can read debt_accounts"
  on debt_accounts for select to authenticated using (true);
create policy "Authenticated users can write debt_accounts"
  on debt_accounts for all to authenticated using (true);

-- ═══════════════════════════════════════
-- Subscriptions
-- ═══════════════════════════════════════
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  amount decimal not null default 0,
  billing_cycle text default 'monthly',
  category text,
  action text check (action in ('cancel', 'review', 'keep', 'essential')),
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "Authenticated users can read subscriptions"
  on subscriptions for select to authenticated using (true);
create policy "Authenticated users can write subscriptions"
  on subscriptions for all to authenticated using (true);

-- ═══════════════════════════════════════
-- Budget Categories
-- ═══════════════════════════════════════
create table budget_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  monthly_actual numeric,
  annual_actual numeric,
  survival_budget numeric,
  pct_of_total numeric,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table budget_categories enable row level security;
create policy "Authenticated users can read budget_categories"
  on budget_categories for select to authenticated using (true);
create policy "Authenticated users can write budget_categories"
  on budget_categories for all to authenticated using (true);
