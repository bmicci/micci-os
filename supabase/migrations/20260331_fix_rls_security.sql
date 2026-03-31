-- ============================================================
-- Fix RLS Security — Enable RLS on all public tables
-- Resolves Supabase security alert: rls_disabled_in_public
-- ============================================================

-- 1. Enable RLS on tables that had it disabled
ALTER TABLE schedule_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

-- 2. Add policies for authenticated access (single-user app)
CREATE POLICY "Auth users manage schedule_completions"
  ON schedule_completions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth users manage schedule_blocks"
  ON schedule_blocks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 3. Add missing policies for tables that had RLS enabled but no policies
--    (previously only accessible via service role key)
CREATE POLICY "Auth users manage financial_deadlines"
  ON financial_deadlines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth users manage paycheck_settings"
  ON paycheck_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth users manage financial_scenarios"
  ON financial_scenarios FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
