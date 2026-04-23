ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS prize_pool_mode text NOT NULL DEFAULT 'auto';

UPDATE public.tournaments
SET prize_pool_mode = 'auto'
WHERE prize_pool_mode IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tournaments_prize_pool_mode_check'
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_prize_pool_mode_check
      CHECK (prize_pool_mode IN ('auto', 'specified'));
  END IF;
END $$;
