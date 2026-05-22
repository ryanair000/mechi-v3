-- Weekend Cup Match Day Tables
-- Run this migration to add lobby, score, result, and bracket management

-- Lobbies for BR games (PUBG, CODM, Free Fire)
CREATE TABLE IF NOT EXISTS weekend_cup_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL DEFAULT 'playmechi-weekend-cup',
  game TEXT NOT NULL,
  lobby_number INTEGER NOT NULL,
  room_id TEXT,
  room_password TEXT,
  match_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_slug, game, lobby_number, match_number)
);

-- Scores per player per match
CREATE TABLE IF NOT EXISTS weekend_cup_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL DEFAULT 'playmechi-weekend-cup',
  registration_id UUID NOT NULL REFERENCES online_tournament_registrations(id) ON DELETE CASCADE,
  lobby_id UUID REFERENCES weekend_cup_lobbies(id) ON DELETE SET NULL,
  match_number INTEGER NOT NULL DEFAULT 1,
  kills INTEGER DEFAULT 0,
  placement INTEGER,
  placement_points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  screenshot_url TEXT,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(registration_id, match_number)
);

-- Final results per game
CREATE TABLE IF NOT EXISTS weekend_cup_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL DEFAULT 'playmechi-weekend-cup',
  game TEXT NOT NULL,
  registration_id UUID NOT NULL REFERENCES online_tournament_registrations(id) ON DELETE CASCADE,
  final_rank INTEGER NOT NULL,
  total_kills INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  prize_type TEXT CHECK (prize_type IN ('cash', 'credit', 'none')),
  prize_value_kes INTEGER DEFAULT 0,
  prize_status TEXT DEFAULT 'pending' CHECK (prize_status IN ('pending', 'processing', 'paid', 'failed')),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES profiles(id),
  payout_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_slug, game, registration_id)
);

-- Bracket for eFootball knockout (32 players)
CREATE TABLE IF NOT EXISTS weekend_cup_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL DEFAULT 'playmechi-weekend-cup',
  game TEXT NOT NULL DEFAULT 'efootball',
  round INTEGER NOT NULL, -- 1=R32, 2=R16, 3=QF, 4=SF, 5=Bronze, 6=Final
  match_number INTEGER NOT NULL,
  player1_registration_id UUID REFERENCES online_tournament_registrations(id) ON DELETE SET NULL,
  player2_registration_id UUID REFERENCES online_tournament_registrations(id) ON DELETE SET NULL,
  player1_score INTEGER,
  player2_score INTEGER,
  winner_registration_id UUID REFERENCES online_tournament_registrations(id) ON DELETE SET NULL,
  loser_registration_id UUID REFERENCES online_tournament_registrations(id) ON DELETE SET NULL,
  is_bronze_match BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'active', 'completed', 'walkover', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recording_url TEXT,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_slug, game, round, match_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekend_cup_lobbies_event_game ON weekend_cup_lobbies(event_slug, game);
CREATE INDEX IF NOT EXISTS idx_weekend_cup_scores_registration ON weekend_cup_scores(registration_id);
CREATE INDEX IF NOT EXISTS idx_weekend_cup_scores_lobby ON weekend_cup_scores(lobby_id);
CREATE INDEX IF NOT EXISTS idx_weekend_cup_results_event_game ON weekend_cup_results(event_slug, game);
CREATE INDEX IF NOT EXISTS idx_weekend_cup_brackets_event ON weekend_cup_brackets(event_slug, game, round);

-- RLS policies
ALTER TABLE weekend_cup_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekend_cup_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekend_cup_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekend_cup_brackets ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on weekend_cup_lobbies" ON weekend_cup_lobbies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on weekend_cup_scores" ON weekend_cup_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on weekend_cup_results" ON weekend_cup_results FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on weekend_cup_brackets" ON weekend_cup_brackets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read their own scores and results
CREATE POLICY "Users can read own scores" ON weekend_cup_scores FOR SELECT TO authenticated
  USING (registration_id IN (SELECT id FROM online_tournament_registrations WHERE user_id = auth.uid()));

CREATE POLICY "Users can read own results" ON weekend_cup_results FOR SELECT TO authenticated
  USING (registration_id IN (SELECT id FROM online_tournament_registrations WHERE user_id = auth.uid()));

-- Public can read brackets
CREATE POLICY "Public can read brackets" ON weekend_cup_brackets FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read brackets" ON weekend_cup_brackets FOR SELECT TO authenticated USING (true);
