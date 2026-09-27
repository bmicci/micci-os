-- Security hardening — clears the ERROR/WARN items from Supabase advisors.
--
-- APPLY: paste this whole file into the Supabase dashboard SQL editor
-- (project ptrcyxqybzqwwkridvze) and run — or apply via MCP when connected.
--
-- 1. security_definer_view (ERROR x2): both views sit over the executive
--    pipeline tables, which are intentionally deny-all (RLS on, no
--    policies) and read exclusively through the server-side service client
--    (src/lib/pipeline-data.ts). Flipping to security_invoker changes
--    nothing for the app (service role bypasses RLS) but stops the views
--    from being an RLS bypass if a client-side query ever hits them.
alter view public.weekly_activity set (security_invoker = true);
alter view public.unreferred_applications set (security_invoker = true);

-- 2. function_search_path_mutable (WARN x4): pin search_path on the
--    flagged functions. Signature-agnostic on purpose — these functions
--    only exist in the live DB, so we resolve their signatures at run time.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'update_life_plan_goals_updated_at',
        'update_house_project_actual_cost',
        'match_document_chunks',
        'trigger_set_updated_at'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.sig);
  end loop;
end $$;

-- Not addressed here, by choice:
-- * "extension vector in public" (WARN): relocating pgvector breaks the
--   embedding column types in documents/document_chunks — accepted as-is.
-- * "leaked password protection disabled" (WARN): dashboard toggle, not
--   SQL — Supabase dashboard > Authentication > Settings > enable
--   "Leaked password protection".
