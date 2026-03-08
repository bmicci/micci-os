-- ============================================================
-- Micci OS — Migration: Fix Goals + Budget Schema
-- Run this in Supabase SQL Editor BEFORE running seed.sql
-- ============================================================

-- 1. Add missing columns to goals table (for Goals page)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS timeframe TEXT DEFAULT 'weekly';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- 2. Clear all existing data (safe since tables are empty / never seeded)
TRUNCATE financial_modules CASCADE;
TRUNCATE subscriptions CASCADE;
TRUNCATE debt_accounts CASCADE;
TRUNCATE budget_categories CASCADE;
TRUNCATE goal_categories CASCADE;
TRUNCATE goals CASCADE;
TRUNCATE supplements CASCADE;
TRUNCATE hormone_protocols CASCADE;
TRUNCATE daily_schedule CASCADE;

-- 3. Now run seed.sql in the Supabase SQL Editor to populate all tables.
-- ============================================================
-- After running this migration, paste and run seed.sql next.
-- ============================================================
