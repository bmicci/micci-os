-- ============================================================
-- Fix RLS Security — Enable RLS on all public tables
-- Resolves Supabase security alert: rls_disabled_in_public
-- Safe version: skips tables that don't exist yet
-- ============================================================

DO $$ BEGIN
  -- schedule_completions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='schedule_completions') THEN
    ALTER TABLE schedule_completions ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='schedule_completions' AND policyname='Auth users manage schedule_completions') THEN
      CREATE POLICY "Auth users manage schedule_completions"
        ON schedule_completions FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;

  -- schedule_blocks
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='schedule_blocks') THEN
    ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='schedule_blocks' AND policyname='Auth users manage schedule_blocks') THEN
      CREATE POLICY "Auth users manage schedule_blocks"
        ON schedule_blocks FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;

  -- financial_deadlines
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='financial_deadlines') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financial_deadlines' AND policyname='Auth users manage financial_deadlines') THEN
      CREATE POLICY "Auth users manage financial_deadlines"
        ON financial_deadlines FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;

  -- paycheck_settings
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='paycheck_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='paycheck_settings' AND policyname='Auth users manage paycheck_settings') THEN
      CREATE POLICY "Auth users manage paycheck_settings"
        ON paycheck_settings FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;

  -- financial_scenarios
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='financial_scenarios') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financial_scenarios' AND policyname='Auth users manage financial_scenarios') THEN
      CREATE POLICY "Auth users manage financial_scenarios"
        ON financial_scenarios FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;
