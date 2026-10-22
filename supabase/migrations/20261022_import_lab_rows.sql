-- Bulk-load parsed lab results (compact positional rows). Skips any marker
-- already recorded for the same date + source, so re-running is safe.
-- Used for the Oct 22, 2026 backfill of Labcorp (Jun 2023 – Sep 2026) and
-- Function Health / Quest (Jun 2025) reports.
-- Row: [name, yyyymmdd, value, unit, ref_low, ref_high, flag, panel_idx, source_idx, note_idx, value_text, extra]
create or replace function public.import_lab_rows(p_panels jsonb, p_rows jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  sources text[] := array['Labcorp', 'Quest (Function Health)'];
  notes text[] := array[null, 'From the Previous Result column of a later Labcorp report', 'Function Health'];
  n integer;
begin
  with x as (
    select r->>0 as marker_name,
           to_date(r->>1, 'YYYYMMDD') as test_date,
           (r->>2)::numeric as value,
           r->>3 as unit,
           (r->>4)::numeric as lo,
           (r->>5)::numeric as hi,
           r->>6 as flag,
           p_panels->>((r->>7)::int) as panel,
           sources[(r->>8)::int + 1] as source,
           nullif(concat_ws('; ',
             notes[(r->>9)::int + 1],
             case when (r->>8)::int = 1 and r->>11 is not null then r->>11 end,
             case when r->>10 is not null then 'As reported: ' || (r->>10) end,
             case when (r->>8)::int = 0 and r->>11 is not null then 'Reference: ' || (r->>11) end
           ), '') as note
    from jsonb_array_elements(p_rows) r
  ), ins as (
    insert into lab_markers (marker_name, test_date, value, unit, reference_low, reference_high, reference_min, reference_max, flag, panel, source, notes, is_confirmed)
    select marker_name, test_date, value, unit, lo, hi, lo, hi, flag, panel, source, note, true
    from x
    where not exists (select 1 from lab_markers m where m.marker_name = x.marker_name and m.test_date = x.test_date and m.source = x.source)
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;
revoke all on function public.import_lab_rows(jsonb, jsonb) from public, anon, authenticated;
