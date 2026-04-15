ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS rating_efootball_mobile integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS wins_efootball_mobile integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses_efootball_mobile integer NOT NULL DEFAULT 0;

ALTER TABLE queue
  ADD COLUMN IF NOT EXISTS platform text;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS platform text;

CREATE INDEX IF NOT EXISTS idx_queue_game_platform_status
  ON queue(game, platform, status);
