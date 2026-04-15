-- Add UNIQUE constraint on ticker so upsert works correctly in CSV import
-- Safe to run even if already unique (use DO block to avoid error on re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolio_positions_ticker_key'
  ) THEN
    ALTER TABLE portfolio_positions ADD CONSTRAINT portfolio_positions_ticker_key UNIQUE (ticker);
  END IF;
END $$;
