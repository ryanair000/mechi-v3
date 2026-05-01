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
  country text,
  region text NOT NULL DEFAULT 'Other',
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'elite')),
  plan_since timestamptz,
  plan_expires_at timestamptz,
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
  rating_ludo integer NOT NULL DEFAULT 1000,
  wins_efootball integer NOT NULL DEFAULT 0,
  wins_efootball_mobile integer NOT NULL DEFAULT 0,
  wins_fc26 integer NOT NULL DEFAULT 0,
  wins_mk11 integer NOT NULL DEFAULT 0,
  wins_nba2k26 integer NOT NULL DEFAULT 0,
  wins_tekken8 integer NOT NULL DEFAULT 0,
  wins_sf6 integer NOT NULL DEFAULT 0,
  wins_ludo integer NOT NULL DEFAULT 0,
  losses_efootball integer NOT NULL DEFAULT 0,
  losses_efootball_mobile integer NOT NULL DEFAULT 0,
  losses_fc26 integer NOT NULL DEFAULT 0,
  losses_mk11 integer NOT NULL DEFAULT 0,
  losses_nba2k26 integer NOT NULL DEFAULT 0,
  losses_tekken8 integer NOT NULL DEFAULT 0,
  losses_sf6 integer NOT NULL DEFAULT 0,
  losses_ludo integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game text NOT NULL,
  platform text,
  region text NOT NULL DEFAULT 'Unspecified',
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
  region text NOT NULL DEFAULT 'Unspecified',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'disputed', 'cancelled')),
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  player1_reported_winner uuid REFERENCES profiles(id) ON DELETE SET NULL,
  player2_reported_winner uuid REFERENCES profiles(id) ON DELETE SET NULL,
  player1_reported_player1_score integer,
  player1_reported_player2_score integer,
  player2_reported_player1_score integer,
  player2_reported_player2_score integer,
  player1_score integer,
  player2_score integer,
  rating_change_p1 integer,
  rating_change_p2 integer,
  dispute_screenshot_url text,
  dispute_requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz
);

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

CREATE TABLE IF NOT EXISTS support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'instagram')),
  phone text,
  wa_id text NOT NULL,
  contact_name text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'waiting_on_ai', 'waiting_on_human', 'resolved', 'blocked')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  escalation_reason text,
  last_message_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_ai_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  direction text NOT NULL
    CHECK (direction IN ('inbound', 'outbound')),
  sender_type text NOT NULL
    CHECK (sender_type IN ('user', 'ai', 'admin', 'system')),
  body text,
  message_type text NOT NULL DEFAULT 'text',
  provider_message_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_confidence real,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS match_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sender_type text NOT NULL
    CHECK (sender_type IN ('player', 'system', 'admin')),
  message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'system', 'quick_reply')),
  body text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS match_message_reads (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS match_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL
    CHECK (reason IN ('setup_issue', 'stalling', 'wrong_result', 'abuse', 'other')),
  details text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS lobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game text NOT NULL,
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),
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
CREATE INDEX IF NOT EXISTS idx_match_challenges_challenger_status
  ON match_challenges(challenger_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_challenges_opponent_status
  ON match_challenges(opponent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobbies_visibility_status_created_at
  ON lobbies(visibility, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_challenges_expires_at
  ON match_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_match_challenges_match_id
  ON match_challenges(match_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
  ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_status_last_message_at
  ON support_threads(status, last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_threads_channel_wa_id
  ON support_threads(channel, wa_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_assigned_status_last_message_at
  ON support_threads(assigned_to, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_user_id
  ON support_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_phone
  ON support_threads(phone);
CREATE INDEX IF NOT EXISTS idx_support_threads_wa_id
  ON support_threads(wa_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_thread_created_at
  ON support_messages(thread_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_messages_provider_message_id
  ON support_messages(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_messages_match_created_at
  ON match_messages(match_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_match_message_reads_user_id
  ON match_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_match_escalations_match_status_created
  ON match_escalations(match_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_escalations_requested_by
  ON match_escalations(requested_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobbies_status_created_at ON lobbies(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobby_members_lobby_id ON lobby_members(lobby_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_votes ON suggestions(votes DESC);
CREATE INDEX IF NOT EXISTS idx_suggestion_votes_user_id ON suggestion_votes(user_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY notifications_update_own
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY match_challenges_select_party
  ON match_challenges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

REVOKE ALL ON TABLE notifications FROM anon, authenticated;
REVOKE ALL ON TABLE match_challenges FROM anon, authenticated;
REVOKE ALL ON TABLE support_threads FROM anon, authenticated;
REVOKE ALL ON TABLE support_messages FROM anon, authenticated;
REVOKE ALL ON TABLE match_messages FROM anon, authenticated;
REVOKE ALL ON TABLE match_message_reads FROM anon, authenticated;
REVOKE ALL ON TABLE match_escalations FROM anon, authenticated;

-- Tournaments + Paystack-backed entry payments.
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  game text NOT NULL,
  platform text,
  region text NOT NULL DEFAULT 'Other',
  size integer NOT NULL CHECK (size IN (4, 8, 16)),
  entry_fee integer NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  prize_pool_mode text NOT NULL DEFAULT 'auto'
    CHECK (prize_pool_mode IN ('auto', 'specified')),
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
  scheduled_for timestamptz,
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
CREATE INDEX IF NOT EXISTS idx_tournaments_status_scheduled_for ON tournaments(status, scheduled_for ASC);
CREATE INDEX IF NOT EXISTS idx_tournaments_game_status ON tournaments(game, status);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer_id ON tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_user_id ON tournament_players(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_payment_status ON tournament_players(payment_status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_round_slot ON tournament_matches(tournament_id, round, slot);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_match_id ON tournament_matches(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);

GRANT ALL ON tournaments, tournament_players, tournament_matches TO service_role;

-- Mechi-owned online event registrations for large lobby tournaments.
CREATE TABLE IF NOT EXISTS online_tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm', 'efootball')),
  in_game_username text NOT NULL,
  phone text,
  whatsapp_number text,
  email text,
  instagram_username text,
  youtube_name text,
  followed_instagram boolean NOT NULL DEFAULT false,
  subscribed_youtube boolean NOT NULL DEFAULT false,
  available_at_8pm boolean NOT NULL DEFAULT false,
  accepted_rules boolean NOT NULL DEFAULT false,
  reward_eligible boolean NOT NULL DEFAULT false,
  eligibility_status text NOT NULL DEFAULT 'pending'
    CHECK (eligibility_status IN ('pending', 'verified', 'ineligible', 'disqualified')),
  check_in_status text NOT NULL DEFAULT 'registered'
    CHECK (check_in_status IN ('registered', 'checked_in', 'no_show')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_slug, user_id, game)
);

CREATE INDEX IF NOT EXISTS idx_online_tournament_registrations_event_game
  ON online_tournament_registrations(event_slug, game, created_at);
CREATE INDEX IF NOT EXISTS idx_online_tournament_registrations_user_event
  ON online_tournament_registrations(user_id, event_slug);
CREATE INDEX IF NOT EXISTS idx_online_tournament_registrations_eligibility
  ON online_tournament_registrations(event_slug, eligibility_status);

ALTER TABLE online_tournament_registrations ENABLE ROW LEVEL SECURITY;

GRANT ALL ON online_tournament_registrations TO service_role;
REVOKE ALL ON online_tournament_registrations FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES TO service_role;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'elite')),
  ADD COLUMN IF NOT EXISTS plan_since timestamptz,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('pro', 'elite')),
  billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_kes integer NOT NULL CHECK (amount_kes >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'failed')),
  paystack_ref text UNIQUE,
  started_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS match_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  match_count integer NOT NULL DEFAULT 0 CHECK (match_count >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires_at ON profiles(plan_expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paystack_ref ON subscriptions(paystack_ref);
CREATE INDEX IF NOT EXISTS idx_match_usage_user_date ON match_usage(user_id, date DESC);

CREATE OR REPLACE FUNCTION increment_match_usage(p_user_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO match_usage (user_id, date, match_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET match_count = match_usage.match_count + 1;
END;
$$;

REVOKE ALL ON TABLE subscriptions, match_usage FROM anon, authenticated;
GRANT ALL ON subscriptions, match_usage TO service_role;
GRANT EXECUTE ON FUNCTION increment_match_usage(uuid, date) TO service_role;

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

REVOKE EXECUTE ON FUNCTION finalize_match_with_gamification(
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
) FROM anon, authenticated;

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
) TO service_role;

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
  target_type text NOT NULL CHECK (target_type IN ('user', 'match', 'tournament', 'queue', 'lobby', 'support', 'system')),
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

REVOKE ALL ON TABLE admin_audit_logs FROM anon, authenticated;
GRANT ALL ON admin_audit_logs, rate_limit_attempts TO service_role;

CREATE TABLE IF NOT EXISTS auth_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('magic_link_signin', 'password_reset')),
  token_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  next_path text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_user_purpose_created
  ON auth_action_tokens(user_id, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_expires_at
  ON auth_action_tokens(expires_at);

REVOKE ALL ON TABLE auth_action_tokens FROM anon, authenticated;
GRANT ALL ON auth_action_tokens TO service_role;
