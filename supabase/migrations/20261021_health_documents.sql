-- Uploaded health documents (Quest/Labcorp lab reports, InBody result sheets)
-- → Claude extraction → reviewed before anything is written to lab_markers /
-- body_metrics. Single-tenant: deny-all RLS, service client only.
create table if not exists public.health_documents (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('lab','inbody')),
  file_name     text,
  storage_path  text not null,
  mime_type     text,
  status        text not null default 'uploaded' check (status in ('uploaded','parsing','parsed','applied','error')),
  parse_error   text,
  extracted     jsonb,
  collected_on  date,
  provider      text,
  applied_at    timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.health_documents enable row level security;

alter table public.lab_markers
  add column if not exists document_id uuid references public.health_documents(id),
  add column if not exists source text,
  add column if not exists flag text,
  add column if not exists panel text;

alter table public.body_metrics
  add column if not exists document_id uuid references public.health_documents(id),
  add column if not exists skeletal_muscle_lbs numeric,
  add column if not exists body_water_lbs numeric,
  add column if not exists visceral_fat_level numeric,
  add column if not exists bmr_kcal numeric,
  add column if not exists inbody_score numeric,
  add column if not exists segmental jsonb;

insert into storage.buckets (id, name, public)
values ('health-docs', 'health-docs', false)
on conflict (id) do nothing;
