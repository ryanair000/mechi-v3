ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS invited_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_invited_by_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_invited_by_fkey
      FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

WITH normalized AS (
  SELECT
    id,
    created_at,
    trim(both '-' from regexp_replace(lower(coalesce(username, '')), '[^a-z0-9]+', '-', 'g')) AS slug_source
  FROM profiles
), ranked AS (
  SELECT
    id,
    CASE
      WHEN slug_source = '' THEN 'player'
      ELSE left(slug_source, 24)
    END AS base_code,
    row_number() OVER (
      PARTITION BY CASE
        WHEN slug_source = '' THEN 'player'
        ELSE left(slug_source, 24)
      END
      ORDER BY created_at, id
    ) AS seq
  FROM normalized
), resolved AS (
  SELECT
    id,
    CASE
      WHEN seq = 1 THEN base_code
      ELSE left(base_code, GREATEST(1, 24 - length(seq::text) - 1)) || '-' || seq::text
    END AS next_invite_code
  FROM ranked
)
UPDATE profiles AS profile
SET invite_code = resolved.next_invite_code
FROM resolved
WHERE profile.id = resolved.id
  AND coalesce(profile.invite_code, '') = '';

ALTER TABLE profiles
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_invite_code
  ON profiles(invite_code);

CREATE INDEX IF NOT EXISTS idx_profiles_invited_by
  ON profiles(invited_by);
