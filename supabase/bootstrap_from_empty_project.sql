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
  participant_mode text NOT NULL DEFAULT 'solo' CHECK (participant_mode IN ('solo', 'team')),
  team_size integer CHECK (team_size IS NULL OR team_size BETWEEN 2 AND 12),
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

CREATE TABLE IF NOT EXISTS email_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'instagram', 'in_app')),
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
  subject text,
  issue_category text,
  context_type text,
  context_id text,
  case_reference text,
  resolution_summary text,
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
CREATE INDEX IF NOT EXISTS idx_email_delivery_events_user_created_at
  ON email_delivery_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_delivery_events_type_created_at
  ON email_delivery_events(event_type, created_at DESC);
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
REVOKE ALL ON TABLE email_delivery_events FROM anon, authenticated;
GRANT ALL ON email_delivery_events TO service_role;
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
  approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_featured boolean NOT NULL DEFAULT false,
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
  check_in_status text NOT NULL DEFAULT 'registered'
    CHECK (check_in_status IN ('registered', 'checked_in', 'no_show')),
  checked_in_at timestamptz,
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  slug text NOT NULL UNIQUE,
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  region text NOT NULL DEFAULT 'Kenya',
  avatar_url text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  recruiting boolean NOT NULL DEFAULT false,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'starter', 'substitute', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  left_at timestamptz,
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (invitee_id <> inviter_id)
);

CREATE TABLE IF NOT EXISTS team_roster_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game text NOT NULL,
  member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  roster_role text NOT NULL DEFAULT 'starter' CHECK (roster_role IN ('starter', 'substitute')),
  game_account_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  eligibility_status text NOT NULL DEFAULT 'pending' CHECK (eligibility_status IN ('pending', 'eligible', 'blocked')),
  eligibility_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (team_id, game, member_id)
);

CREATE TABLE IF NOT EXISTS team_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  subject_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS tournament_team_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  registered_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  roster_snapshot jsonb NOT NULL,
  roster_locked_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  payment_status text NOT NULL DEFAULT 'free' CHECK (payment_status IN ('pending', 'paid', 'free', 'failed', 'refunded')),
  payment_ref text,
  check_in_status text NOT NULL DEFAULT 'registered' CHECK (check_in_status IN ('registered', 'checked_in', 'no_show')),
  checked_in_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (tournament_id, team_id)
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
CREATE INDEX IF NOT EXISTS idx_tournaments_approval_status ON tournaments(approval_status);
CREATE INDEX IF NOT EXISTS idx_tournaments_is_featured_created_at ON tournaments(is_featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_user_id ON tournament_players(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_payment_status ON tournament_players(payment_status);
CREATE INDEX IF NOT EXISTS idx_tournament_players_check_in_status ON tournament_players(tournament_id, check_in_status);
CREATE INDEX IF NOT EXISTS idx_team_members_user_status ON team_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_status ON team_members(team_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_one_pending ON team_invitations(team_id, invitee_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_status ON team_invitations(invitee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_roster_team_game ON team_roster_entries(team_id, game);
CREATE INDEX IF NOT EXISTS idx_team_audit_team_created ON team_audit_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_team_entries_tournament_status ON tournament_team_entries(tournament_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_round_slot ON tournament_matches(tournament_id, round, slot);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_match_id ON tournament_matches(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_roster_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_team_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE teams, team_members, team_invitations, team_roster_entries, team_audit_logs, tournament_team_entries FROM anon, authenticated;
GRANT ALL ON tournaments, tournament_players, tournament_matches, teams, team_members, team_invitations, team_roster_entries, team_audit_logs, tournament_team_entries TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_tournament_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.entry_fee = 0 THEN
    IF NEW.prize_pool_mode = 'specified' OR NEW.prize_pool > 0 THEN
      RAISE EXCEPTION 'FREE_TOURNAMENT_CANNOT_HAVE_REWARD';
    END IF;
    NEW.prize_pool_mode := 'auto';
    NEW.prize_pool := 0;
    NEW.platform_fee := 0;
    NEW.platform_fee_rate := 0;
    NEW.approval_status := 'approved';
    NEW.approved_at := COALESCE(NEW.approved_at, timezone('utc', now()));
    NEW.approved_by := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.approval_status := 'pending';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.is_featured := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_tournament_policy_trigger
  BEFORE INSERT OR UPDATE OF entry_fee, prize_pool_mode, prize_pool, approval_status
  ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_tournament_policy();

CREATE OR REPLACE FUNCTION public.enforce_paid_tournament_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_entry_fee integer;
  v_approval_status text;
BEGIN
  IF NEW.payment_status NOT IN ('pending', 'paid') THEN
    RETURN NEW;
  END IF;
  SELECT entry_fee, approval_status
    INTO v_entry_fee, v_approval_status
    FROM public.tournaments
   WHERE id = NEW.tournament_id;
  IF v_entry_fee > 0 AND v_approval_status <> 'approved' THEN
    RAISE EXCEPTION 'PAID_TOURNAMENT_NOT_APPROVED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_paid_tournament_approval_trigger
  BEFORE INSERT OR UPDATE OF payment_status, tournament_id
  ON public.tournament_players
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_paid_tournament_approval();

CREATE OR REPLACE FUNCTION public.claim_tournament_slot(
  p_tournament_id uuid,
  p_user_id uuid,
  p_payment_status text,
  p_payment_ref text DEFAULT NULL,
  p_payment_access_code text DEFAULT NULL
)
RETURNS TABLE (
  player_id uuid,
  player_payment_status text,
  player_joined_at timestamptz,
  player_inserted boolean,
  tournament_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_existing public.tournament_players%ROWTYPE;
  v_player public.tournament_players%ROWTYPE;
  v_reserved_count integer;
  v_joined_at timestamptz := timezone('utc', now());
BEGIN
  IF p_payment_status NOT IN ('pending', 'free') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS';
  END IF;

  SELECT *
    INTO v_tournament
    FROM public.tournaments
   WHERE id = p_tournament_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;

  IF v_tournament.status <> 'open' THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_OPEN';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.tournament_players
   WHERE tournament_id = p_tournament_id
     AND user_id = p_user_id
   FOR UPDATE;

  IF FOUND AND v_existing.payment_status IN ('paid', 'free') THEN
    RAISE EXCEPTION 'ALREADY_JOINED';
  END IF;

  IF FOUND AND v_existing.payment_status = 'pending' THEN
    RAISE EXCEPTION 'PAYMENT_PENDING';
  END IF;

  SELECT count(*)
    INTO v_reserved_count
    FROM public.tournament_players
   WHERE tournament_id = p_tournament_id
     AND payment_status IN ('pending', 'paid', 'free');

  IF v_reserved_count >= v_tournament.size THEN
    UPDATE public.tournaments
       SET status = 'full'
     WHERE id = p_tournament_id
       AND status = 'open';

    RAISE EXCEPTION 'TOURNAMENT_FULL';
  END IF;

  IF FOUND THEN
    UPDATE public.tournament_players
       SET payment_status = p_payment_status,
           payment_ref = p_payment_ref,
           payment_access_code = p_payment_access_code,
           check_in_status = 'registered',
           checked_in_at = NULL,
           joined_at = v_joined_at
     WHERE id = v_existing.id
     RETURNING *
      INTO v_player;

    player_inserted := false;
  ELSE
    INSERT INTO public.tournament_players (
      tournament_id,
      user_id,
      payment_status,
      payment_ref,
      payment_access_code,
      check_in_status,
      joined_at
    )
    VALUES (
      p_tournament_id,
      p_user_id,
      p_payment_status,
      p_payment_ref,
      p_payment_access_code,
      'registered',
      v_joined_at
    )
    RETURNING *
      INTO v_player;

    player_inserted := true;
  END IF;

  SELECT count(*)
    INTO v_reserved_count
    FROM public.tournament_players
   WHERE tournament_id = p_tournament_id
     AND payment_status IN ('pending', 'paid', 'free');

  IF v_reserved_count >= v_tournament.size THEN
    UPDATE public.tournaments
       SET status = 'full'
     WHERE id = p_tournament_id
       AND status = 'open';
    tournament_status := 'full';
  ELSE
    tournament_status := 'open';
  END IF;

  player_id := v_player.id;
  player_payment_status := v_player.payment_status;
  player_joined_at := v_player.joined_at;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_tournament_slot(uuid, uuid, text, text, text)
  TO service_role;

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

-- Standalone Android Play Store tester intake. This is intentionally separate
-- from player profiles and PlayMechi tournament registrations.
CREATE TABLE IF NOT EXISTS android_tester_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  play_email text NOT NULL,
  play_email_normalized text NOT NULL UNIQUE,
  whatsapp_number text NOT NULL,
  mechi_username text,
  device_model text NOT NULL,
  android_version text,
  country text NOT NULL DEFAULT 'Kenya',
  target_track text NOT NULL DEFAULT 'closed'
    CHECK (target_track IN ('internal', 'closed')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invited', 'opted_in', 'active', 'removed')),
  wants_updates boolean NOT NULL DEFAULT true,
  accepted_requirements boolean NOT NULL DEFAULT false,
  notes text,
  source text NOT NULL DEFAULT 'mechi.club/android-testers',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_android_tester_signups_status_created
  ON android_tester_signups(status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_android_tester_signups_target_track
  ON android_tester_signups(target_track, status, created_at ASC);

ALTER TABLE android_tester_signups ENABLE ROW LEVEL SECURITY;

GRANT ALL ON android_tester_signups TO service_role;
REVOKE ALL ON android_tester_signups FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS online_tournament_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm')),
  match_number integer NOT NULL CHECK (match_number BETWEEN 1 AND 3),
  title text,
  map_name text,
  room_id text,
  room_password text,
  instructions text,
  starts_at timestamptz,
  release_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'released', 'locked', 'completed', 'cancelled')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_slug, game, match_number)
);

CREATE TABLE IF NOT EXISTS online_tournament_fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL DEFAULT 'efootball' CHECK (game = 'efootball'),
  round text NOT NULL
    CHECK (round IN ('round_of_16', 'quarterfinal', 'semifinal', 'final', 'bronze')),
  round_label text NOT NULL,
  slot integer NOT NULL CHECK (slot >= 0),
  player1_registration_id uuid REFERENCES online_tournament_registrations(id) ON DELETE SET NULL,
  player2_registration_id uuid REFERENCES online_tournament_registrations(id) ON DELETE SET NULL,
  player1_score integer CHECK (player1_score IS NULL OR player1_score >= 0),
  player2_score integer CHECK (player2_score IS NULL OR player2_score >= 0),
  winner_registration_id uuid REFERENCES online_tournament_registrations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'completed', 'disputed', 'bye')),
  screenshot_url text,
  screenshot_public_id text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_slug, game, round, slot)
);

CREATE TABLE IF NOT EXISTS online_tournament_result_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm', 'efootball')),
  registration_id uuid REFERENCES online_tournament_registrations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  room_id uuid REFERENCES online_tournament_rooms(id) ON DELETE SET NULL,
  fixture_id uuid REFERENCES online_tournament_fixtures(id) ON DELETE SET NULL,
  match_number integer CHECK (match_number IS NULL OR match_number BETWEEN 1 AND 3),
  kills integer CHECK (kills IS NULL OR kills >= 0),
  placement integer CHECK (placement IS NULL OR placement > 0),
  player1_score integer CHECK (player1_score IS NULL OR player1_score >= 0),
  player2_score integer CHECK (player2_score IS NULL OR player2_score >= 0),
  reported_winner_registration_id uuid REFERENCES online_tournament_registrations(id) ON DELETE SET NULL,
  screenshot_url text,
  screenshot_public_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected', 'disputed')),
  admin_note text,
  submitted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS online_tournament_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm', 'efootball')),
  result_submission_id uuid REFERENCES online_tournament_result_submissions(id) ON DELETE SET NULL,
  fixture_id uuid REFERENCES online_tournament_fixtures(id) ON DELETE SET NULL,
  opened_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS online_tournament_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm', 'efootball')),
  placement integer NOT NULL CHECK (placement BETWEEN 1 AND 3),
  registration_id uuid REFERENCES online_tournament_registrations(id) ON DELETE SET NULL,
  prize_label text NOT NULL,
  prize_value_kes integer CHECK (prize_value_kes IS NULL OR prize_value_kes >= 0),
  reward_type text NOT NULL CHECK (reward_type IN ('cash', 'uc', 'cp', 'coins')),
  eligibility_status text NOT NULL DEFAULT 'pending'
    CHECK (eligibility_status IN ('pending', 'eligible', 'ineligible')),
  payout_status text NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'approved', 'paid', 'failed', 'ineligible')),
  payout_ref text,
  admin_note text,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_slug, game, placement)
);

CREATE INDEX IF NOT EXISTS idx_online_tournament_rooms_event_game
  ON online_tournament_rooms(event_slug, game, match_number);
CREATE INDEX IF NOT EXISTS idx_online_tournament_fixtures_event_game
  ON online_tournament_fixtures(event_slug, game, round, slot);
CREATE INDEX IF NOT EXISTS idx_online_tournament_fixtures_players
  ON online_tournament_fixtures(player1_registration_id, player2_registration_id);
CREATE INDEX IF NOT EXISTS idx_online_tournament_results_event_game
  ON online_tournament_result_submissions(event_slug, game, match_number, status);
CREATE INDEX IF NOT EXISTS idx_online_tournament_results_registration
  ON online_tournament_result_submissions(registration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_tournament_disputes_status
  ON online_tournament_disputes(event_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_tournament_payouts_event_game
  ON online_tournament_payouts(event_slug, game, placement);

ALTER TABLE online_tournament_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_tournament_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_tournament_result_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_tournament_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_tournament_payouts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON online_tournament_rooms TO service_role;
GRANT ALL ON online_tournament_fixtures TO service_role;
GRANT ALL ON online_tournament_result_submissions TO service_role;
GRANT ALL ON online_tournament_disputes TO service_role;
GRANT ALL ON online_tournament_payouts TO service_role;

REVOKE ALL ON online_tournament_rooms FROM anon, authenticated;
REVOKE ALL ON online_tournament_fixtures FROM anon, authenticated;
REVOKE ALL ON online_tournament_result_submissions FROM anon, authenticated;
REVOKE ALL ON online_tournament_disputes FROM anon, authenticated;
REVOKE ALL ON online_tournament_payouts FROM anon, authenticated;

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

CREATE OR REPLACE FUNCTION check_rate_limit_attempt(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer,
  attempts integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := timezone('utc', now());
  v_window interval := make_interval(secs => p_window_ms::double precision / 1000.0);
  v_window_start timestamptz;
  v_attempts integer;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'rate limit key is required';
  END IF;

  IF p_limit < 1 OR p_window_ms < 1000 THEN
    RAISE EXCEPTION 'invalid rate limit policy';
  END IF;

  INSERT INTO rate_limit_attempts (key, attempts, window_start, last_attempt)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
    SET attempts = CASE
        WHEN rate_limit_attempts.window_start <= v_now - v_window THEN 1
        ELSE rate_limit_attempts.attempts + 1
      END,
      window_start = CASE
        WHEN rate_limit_attempts.window_start <= v_now - v_window THEN v_now
        ELSE rate_limit_attempts.window_start
      END,
      last_attempt = v_now
  RETURNING rate_limit_attempts.attempts, rate_limit_attempts.window_start
  INTO v_attempts, v_window_start;

  RETURN QUERY
  SELECT
    v_attempts <= p_limit,
    greatest(p_limit - v_attempts, 0),
    CASE
      WHEN v_attempts <= p_limit THEN 0
      ELSE greatest(ceil(extract(epoch FROM ((v_window_start + v_window) - v_now)))::integer, 1)
    END,
    v_attempts;
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit_attempt(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION check_rate_limit_attempt(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit_attempt(text, integer, integer) TO service_role;

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
-- Creator Studio is an opt-in product capability. It intentionally remains
-- separate from the profiles.role security role (user/moderator/admin).
CREATE TABLE IF NOT EXISTS creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 60),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 400),
  creator_types text[] NOT NULL DEFAULT ARRAY['streamer']::text[],
  games text[] NOT NULL DEFAULT '{}'::text[],
  platform_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'pending_verification', 'verified', 'rejected', 'suspended')),
  availability text NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'limited', 'unavailable')),
  verification_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creator_profiles_types_check CHECK (
    cardinality(creator_types) > 0
    AND creator_types <@ ARRAY['streamer', 'commentator', 'video_creator', 'coach']::text[]
  ),
  CONSTRAINT creator_profiles_links_object_check CHECK (jsonb_typeof(platform_links) = 'object')
);

CREATE TABLE IF NOT EXISTS creator_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  content_type text NOT NULL CHECK (content_type IN ('clip', 'video', 'stream', 'post')),
  platform text NOT NULL DEFAULT 'other'
    CHECK (platform IN ('youtube', 'twitch', 'tiktok', 'instagram', 'facebook', 'x', 'other')),
  external_url text NOT NULL CHECK (external_url ~ '^https?://'),
  thumbnail_url text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  engagement integer NOT NULL DEFAULT 0 CHECK (engagement >= 0),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS creator_coverage_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  assignment_type text NOT NULL DEFAULT 'stream'
    CHECK (assignment_type IN ('stream', 'commentary', 'highlights', 'interview', 'social')),
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'accepted', 'declined', 'live', 'completed', 'cancelled')),
  scheduled_for timestamptz,
  sponsor_name text,
  brief text CHECK (char_length(brief) <= 1200),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creator_coverage_target_check CHECK (tournament_id IS NOT NULL OR match_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_status ON creator_profiles(status);
CREATE INDEX IF NOT EXISTS idx_creator_content_creator_created
  ON creator_content(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_content_status_published
  ON creator_content(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_coverage_creator_schedule
  ON creator_coverage_assignments(creator_id, scheduled_for ASC);
CREATE INDEX IF NOT EXISTS idx_creator_coverage_status
  ON creator_coverage_assignments(status, scheduled_for ASC);

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_coverage_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE creator_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE creator_content FROM anon, authenticated;
REVOKE ALL ON TABLE creator_coverage_assignments FROM anon, authenticated;
GRANT ALL ON creator_profiles, creator_content, creator_coverage_assignments TO service_role;
