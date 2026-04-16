-- Run this file once on a brand-new Supabase project.
-- It combines the base app schema and the gamification rollout.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  phone text NOT NULL UNIQUE,
  email text,
  invite_code text NOT NULL UNIQUE,
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url text,
  cover_url text,
  password_hash text NOT NULL,
  region text NOT NULL DEFAULT 'Nairobi',
  platforms text[] NOT NULL DEFAULT '{}',
  game_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_games text[] NOT NULL DEFAULT '{}',
  rating_efootball integer NOT NULL DEFAULT 1000,
  rating_efootball_mobile integer NOT NULL DEFAULT 1000,
  rating_fc26 integer NOT NULL DEFAULT 1000,
  rating_mk11 integer NOT NULL DEFAULT 1000,
  rating_nba2k26 integer NOT NULL DEFAULT 1000,
  rating_tekken8 integer NOT NULL DEFAULT 1000,
  rating_sf6 integer NOT NULL DEFAULT 1000,
  wins_efootball integer NOT NULL DEFAULT 0,
  wins_efootball_mobile integer NOT NULL DEFAULT 0,
  wins_fc26 integer NOT NULL DEFAULT 0,
  wins_mk11 integer NOT NULL DEFAULT 0,
  wins_nba2k26 integer NOT NULL DEFAULT 0,
  wins_tekken8 integer NOT NULL DEFAULT 0,
  wins_sf6 integer NOT NULL DEFAULT 0,
  losses_efootball integer NOT NULL DEFAULT 0,
  losses_efootball_mobile integer NOT NULL DEFAULT 0,
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
  platform text,
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
  platform text,
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
  map_name text,
  scheduled_for timestamptz,
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
CREATE INDEX IF NOT EXISTS idx_queue_game_platform_status ON queue(game, platform, status);
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

-- Tournaments + Paystack-backed entry payments.
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

GRANT SELECT ON tournaments, tournament_players, tournament_matches TO anon, authenticated;
GRANT ALL ON tournaments, tournament_players, tournament_matches TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES TO service_role;

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

WITH normalized_profiles AS (
  SELECT
    id,
    created_at,
    trim(both '-' from regexp_replace(lower(coalesce(username, '')), '[^a-z0-9]+', '-', 'g')) AS slug_source
  FROM profiles
), ranked_profiles AS (
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
  FROM normalized_profiles
), resolved_profiles AS (
  SELECT
    id,
    CASE
      WHEN seq = 1 THEN base_code
      ELSE left(base_code, GREATEST(1, 24 - length(seq::text) - 1)) || '-' || seq::text
    END AS next_invite_code
  FROM ranked_profiles
)
UPDATE profiles AS profile
SET invite_code = resolved_profiles.next_invite_code
FROM resolved_profiles
WHERE profile.id = resolved_profiles.id
  AND coalesce(profile.invite_code, '') = '';

ALTER TABLE profiles
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code);
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON profiles(invited_by);

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

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'moderator', 'admin')),
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('user', 'match', 'tournament', 'system')),
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_attempt timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(is_banned);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_key ON rate_limit_attempts(key);

GRANT SELECT ON admin_audit_logs TO authenticated;
GRANT ALL ON admin_audit_logs, rate_limit_attempts TO service_role;
