ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tournaments_approval_status_check'
  ) THEN
    ALTER TABLE tournaments
      ADD CONSTRAINT tournaments_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tournaments_is_featured_created_at
  ON tournaments(is_featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tournaments_approval_status
  ON tournaments(approval_status);
