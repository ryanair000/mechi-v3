-- Run this file once on a brand-new Supabase project.
-- It combines the base app schema and the gamification rollout.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  phone text NOT NULL UNIQUE,
  email text,
  password_hash text NOT NULL,
  region text NOT NULL DEFAULT 'Nairobi',
  platforms text[] NOT NULL DEFAULT '{}',
  game_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_games text[] NOT NULL DEFAULT '{}',
  rating_efootball integer NOT NULL DEFAULT 1000,
  rating_fc26 integer NOT NULL DEFAULT 1000,
  rating_mk11 integer NOT NULL DEFAULT 1000,
  rating_nba2k26 integer NOT NULL DEFAULT 1000,
  rating_tekken8 integer NOT NULL DEFAULT 1000,
  rating_sf6 integer NOT NULL DEFAULT 1000,
  wins_efootball integer NOT NULL DEFAULT 0,
  wins_fc26 integer NOT NULL DEFAULT 0,
  wins_mk11 integer NOT NULL DEFAULT 0,
  wins_nba2k26 integer NOT NULL DEFAULT 0,
  wins_tekken8 integer NOT NULL DEFAULT 0,
  wins_sf6 integer NOT NULL DEFAULT 0,
  losses_efootball integer NOT NULL DEFAULT 0,
  losses_fc26 integer NOT NULL DEFAULT 0,
  losses_mk11 integer NOT NULL DEFAULT 0,
  losses_nba2k26 integer NOT NULL DEFAULT 0,
  losses_tekken8 integer NOT NULL DEFAULT 0,
  losses_sf6 integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game text NOT NULL,
  region text NOT NULL DEFAULT 'kenya',
  rating integer NOT NULL DEFAULT 1000,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game text NOT NULL,
  region text NOT NULL DEFAULT 'kenya',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'disputed', 'cancelled')),
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  player1_reported_winner uuid REFERENCES profiles(id) ON DELETE SET NULL,
  player2_reported_winner uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rating_change_p1 integer,
  rating_change_p2 integer,
  dispute_screenshot_url text,
  dispute_requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS lobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game text NOT NULL,
  mode text NOT NULL,
  title text NOT NULL,
  max_players integer NOT NULL DEFAULT 2,
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'in_progress', 'closed')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS lobby_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (lobby_id, user_id)
);

CREATE TABLE IF NOT EXISTS suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_name text NOT NULL,
  description text NOT NULL,
  votes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS suggestion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (suggestion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_queue_status_joined_at ON queue(status, joined_at);
CREATE INDEX IF NOT EXISTS idx_queue_user_status ON queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_status_created_at ON matches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player1_status ON matches(player1_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_player2_status ON matches(player2_id, status);
CREATE INDEX IF NOT EXISTS idx_lobbies_status_created_at ON lobbies(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobby_members_lobby_id ON lobby_members(lobby_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_votes ON suggestions(votes DESC);
CREATE INDEX IF NOT EXISTS idx_suggestion_votes_user_id ON suggestion_votes(user_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES TO service_role;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_match_date date,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_notifications boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON achievements(user_id);

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS gamification_summary_p1 jsonb,
  ADD COLUMN IF NOT EXISTS gamification_summary_p2 jsonb;

CREATE OR REPLACE FUNCTION finalize_match_with_gamification(
  p_match_id uuid,
  p_winner_id uuid,
  p_winner_rating integer,
  p_loser_rating integer,
  p_rating_change_p1 integer,
  p_rating_change_p2 integer,
  p_rating_key text,
  p_wins_key text,
  p_losses_key text,
  p_winner_xp_gain integer,
  p_loser_xp_gain integer,
  p_winner_mp_gain integer,
  p_loser_mp_gain integer,
  p_winner_level integer,
  p_loser_level integer,
  p_winner_streak integer,
  p_loser_streak integer,
  p_winner_max_streak integer,
  p_loser_max_streak integer,
  p_match_date date,
  p_winner_achievement_keys text[],
  p_loser_achievement_keys text[],
  p_gamification_summary_p1 jsonb,
  p_gamification_summary_p2 jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match matches%ROWTYPE;
  v_winner_id uuid;
  v_loser_id uuid;
BEGIN
  SELECT *
  INTO v_match
  FROM matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status = 'completed' THEN
    RETURN jsonb_build_object(
      'status', 'completed',
      'winner_id', v_match.winner_id,
      'gamification_summary_p1', v_match.gamification_summary_p1,
      'gamification_summary_p2', v_match.gamification_summary_p2
    );
  END IF;

  IF v_match.status <> 'pending' THEN
    RAISE EXCEPTION 'Match is not active';
  END IF;

  IF v_match.player1_id = p_winner_id THEN
    v_winner_id := v_match.player1_id;
    v_loser_id := v_match.player2_id;
  ELSIF v_match.player2_id = p_winner_id THEN
    v_winner_id := v_match.player2_id;
    v_loser_id := v_match.player1_id;
  ELSE
    RAISE EXCEPTION 'Winner is not part of this match';
  END IF;

  EXECUTE format(
    'UPDATE profiles
       SET %I = $1,
           %I = %I + 1,
           xp = xp + $2,
           mp = mp + $3,
           level = $4,
           win_streak = $5,
           max_win_streak = $6,
           last_match_date = $7
     WHERE id = $8',
    p_rating_key,
    p_wins_key,
    p_wins_key
  )
  USING
    p_winner_rating,
    p_winner_xp_gain,
    p_winner_mp_gain,
    p_winner_level,
    p_winner_streak,
    p_winner_max_streak,
    p_match_date,
    v_winner_id;

  EXECUTE format(
    'UPDATE profiles
       SET %I = $1,
           %I = %I + 1,
           xp = xp + $2,
           mp = mp + $3,
           level = $4,
           win_streak = $5,
           max_win_streak = $6,
           last_match_date = $7
     WHERE id = $8',
    p_rating_key,
    p_losses_key,
    p_losses_key
  )
  USING
    p_loser_rating,
    p_loser_xp_gain,
    p_loser_mp_gain,
    p_loser_level,
    p_loser_streak,
    p_loser_max_streak,
    p_match_date,
    v_loser_id;

  IF array_length(p_winner_achievement_keys, 1) IS NOT NULL THEN
    INSERT INTO achievements (user_id, achievement_key)
    SELECT v_winner_id, key
    FROM unnest(p_winner_achievement_keys) AS key
    ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;

  IF array_length(p_loser_achievement_keys, 1) IS NOT NULL THEN
    INSERT INTO achievements (user_id, achievement_key)
    SELECT v_loser_id, key
    FROM unnest(p_loser_achievement_keys) AS key
    ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;

  UPDATE matches
  SET status = 'completed',
      winner_id = p_winner_id,
      rating_change_p1 = p_rating_change_p1,
      rating_change_p2 = p_rating_change_p2,
      gamification_summary_p1 = p_gamification_summary_p1,
      gamification_summary_p2 = p_gamification_summary_p2,
      completed_at = timezone('utc', now())
  WHERE id = p_match_id;

  SELECT *
  INTO v_match
  FROM matches
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'status', 'completed',
    'winner_id', v_match.winner_id,
    'gamification_summary_p1', v_match.gamification_summary_p1,
    'gamification_summary_p2', v_match.gamification_summary_p2
  );
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_match_with_gamification(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  date,
  text[],
  text[],
  jsonb,
  jsonb
) TO anon, authenticated, service_role;
