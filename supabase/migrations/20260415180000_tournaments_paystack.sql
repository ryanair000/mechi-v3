CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  game text NOT NULL,
  platform text,
  region text NOT NULL DEFAULT 'Nairobi',
  size integer NOT NULL CHECK (size IN (4, 8, 16)),
  entry_fee integer NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  prize_pool integer NOT NULL DEFAULT 0 CHECK (prize_pool >= 0),
  platform_fee integer NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  platform_fee_rate integer NOT NULL DEFAULT 5 CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 100),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'active', 'completed', 'cancelled')),
  bracket jsonb,
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rules text,
  payout_status text NOT NULL DEFAULT 'none' CHECK (payout_status IN ('none', 'pending', 'paid', 'failed')),
  payout_ref text,
  payout_error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  started_at timestamptz,
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS tournament_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seed integer,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'free', 'failed', 'refunded')),
  payment_ref text,
  payment_access_code text,
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  round integer NOT NULL,
  slot integer NOT NULL,
  player1_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  player2_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'active', 'completed', 'bye')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (tournament_id, round, slot)
);

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tournaments_status_created_at ON tournaments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_game_status ON tournaments(game, status);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer_id ON tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_user_id ON tournament_players(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_payment_status ON tournament_players(payment_status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_round_slot ON tournament_matches(tournament_id, round, slot);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_match_id ON tournament_matches(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);

GRANT ALL ON tournaments, tournament_players, tournament_matches TO service_role;
