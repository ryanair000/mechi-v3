ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS snapshot_efootball_url text,
  ADD COLUMN IF NOT EXISTS snapshot_codm_url text,
  ADD COLUMN IF NOT EXISTS snapshot_pubgm_url text;
