-- ============================================================
-- Micci OS — Planner: Schedule Completions Table
-- Run in Supabase Dashboard > SQL Editor > Run
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_completions (
  key TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS so anon key can read/write without authentication.
-- This is intentional — single-user personal app, no sensitive data.
ALTER TABLE schedule_completions DISABLE ROW LEVEL SECURITY;
