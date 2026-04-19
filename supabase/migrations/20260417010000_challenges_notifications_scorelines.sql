CREATE TABLE IF NOT EXISTS match_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game text NOT NULL,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')
  ),
  message text,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '24 hours'),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS player1_reported_player1_score integer,
  ADD COLUMN IF NOT EXISTS player1_reported_player2_score integer,
  ADD COLUMN IF NOT EXISTS player2_reported_player1_score integer,
  ADD COLUMN IF NOT EXISTS player2_reported_player2_score integer,
  ADD COLUMN IF NOT EXISTS player1_score integer,
  ADD COLUMN IF NOT EXISTS player2_score integer;

CREATE INDEX IF NOT EXISTS idx_match_challenges_challenger_status
  ON match_challenges(challenger_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_challenges_opponent_status
  ON match_challenges(opponent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_challenges_expires_at
  ON match_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_match_challenges_match_id
  ON match_challenges(match_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
  ON notifications(user_id, read_at, created_at DESC);

GRANT SELECT ON match_challenges, notifications TO anon, authenticated;
GRANT ALL ON match_challenges, notifications TO service_role;
