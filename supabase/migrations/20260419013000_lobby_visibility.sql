ALTER TABLE lobbies
  ADD COLUMN IF NOT EXISTS visibility text;

UPDATE lobbies
SET visibility = 'public'
WHERE visibility IS NULL;

ALTER TABLE lobbies
  ALTER COLUMN visibility SET DEFAULT 'public';

ALTER TABLE lobbies
  ALTER COLUMN visibility SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lobbies_visibility_check'
  ) THEN
    ALTER TABLE lobbies
      ADD CONSTRAINT lobbies_visibility_check
      CHECK (visibility IN ('public', 'private'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lobbies_visibility_status_created_at
  ON lobbies(visibility, status, created_at DESC);
