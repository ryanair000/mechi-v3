ALTER TABLE lobbies
ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
