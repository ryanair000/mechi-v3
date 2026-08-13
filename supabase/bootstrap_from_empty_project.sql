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
  participant_mode text NOT NULL DEFAULT 'solo'
    CHECK (participant_mode IN ('solo', 'team')),
  team_size integer,
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
  ended_at timestamptz,
  CONSTRAINT tournaments_participant_team_size_check CHECK (
    (participant_mode = 'solo' AND team_size IS NULL)
    OR
    (participant_mode = 'team' AND team_size BETWEEN 2 AND 12)
  )
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
  payment_access_code text,
  payment_authorization_url text,
  check_in_status text NOT NULL DEFAULT 'registered' CHECK (check_in_status IN ('registered', 'checked_in', 'no_show')),
  checked_in_at timestamptz,
  roster_locked_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  roster_version integer NOT NULL DEFAULT 1,
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

-- Play 1v1 lifecycle integrity.
WITH ranked_pending AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        least(challenger_id, opponent_id),
        greatest(challenger_id, opponent_id),
        game,
        platform
      ORDER BY created_at, id
    ) AS pending_rank
  FROM public.match_challenges
  WHERE status = 'pending'
)
UPDATE public.match_challenges AS challenge
SET
  status = 'expired',
  responded_at = coalesce(challenge.responded_at, timezone('utc', now()))
FROM ranked_pending
WHERE challenge.id = ranked_pending.id
  AND ranked_pending.pending_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_challenges_one_pending_pair
  ON public.match_challenges (
    least(challenger_id, opponent_id),
    greatest(challenger_id, opponent_id),
    game,
    platform
  )
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.accept_match_challenge(
  p_challenge_id uuid,
  p_actor_id uuid,
  p_region text
)
RETURNS TABLE (
  challenge_id uuid,
  challenge_status text,
  match_id uuid,
  replayed boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_challenge public.match_challenges%ROWTYPE;
  v_match_id uuid;
BEGIN
  SELECT challenge.*
  INTO v_challenge
  FROM public.match_challenges AS challenge
  WHERE challenge.id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_challenge.opponent_id <> p_actor_id THEN
    RAISE EXCEPTION 'CHALLENGE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_challenge.status = 'accepted' AND v_challenge.match_id IS NOT NULL THEN
    RETURN QUERY
    SELECT v_challenge.id, v_challenge.status, v_challenge.match_id, true;
    RETURN;
  END IF;

  IF v_challenge.status <> 'pending' THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_PENDING:%', v_challenge.status USING ERRCODE = 'P0001';
  END IF;

  IF v_challenge.expires_at <= timezone('utc', now()) THEN
    UPDATE public.match_challenges AS challenge
    SET
      status = 'expired',
      responded_at = timezone('utc', now())
    WHERE challenge.id = v_challenge.id
      AND challenge.status = 'pending';

    RETURN QUERY
    SELECT v_challenge.id, 'expired'::text, NULL::uuid, false;
    RETURN;
  END IF;

  PERFORM profile.id
  FROM public.profiles AS profile
  WHERE profile.id IN (v_challenge.challenger_id, v_challenge.opponent_id)
  ORDER BY profile.id
  FOR UPDATE;

  IF (
    SELECT count(*)
    FROM public.profiles AS profile
    WHERE profile.id IN (v_challenge.challenger_id, v_challenge.opponent_id)
  ) <> 2 THEN
    RAISE EXCEPTION 'CHALLENGE_PLAYER_MISSING' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.queue AS queue_entry
    WHERE queue_entry.user_id IN (v_challenge.challenger_id, v_challenge.opponent_id)
      AND queue_entry.status = 'waiting'
  ) THEN
    RAISE EXCEPTION 'CHALLENGE_QUEUE_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.matches AS live_match
    WHERE live_match.status = 'pending'
      AND (
        live_match.player1_id IN (v_challenge.challenger_id, v_challenge.opponent_id)
        OR live_match.player2_id IN (v_challenge.challenger_id, v_challenge.opponent_id)
      )
  ) THEN
    RAISE EXCEPTION 'CHALLENGE_MATCH_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.matches (
    player1_id,
    player2_id,
    game,
    platform,
    region,
    status
  )
  VALUES (
    v_challenge.challenger_id,
    v_challenge.opponent_id,
    v_challenge.game,
    v_challenge.platform,
    coalesce(nullif(btrim(p_region), ''), 'Unspecified'),
    'pending'
  )
  RETURNING id INTO v_match_id;

  UPDATE public.match_challenges AS challenge
  SET
    status = 'accepted',
    match_id = v_match_id,
    responded_at = timezone('utc', now())
  WHERE challenge.id = v_challenge.id;

  RETURN QUERY
  SELECT v_challenge.id, 'accepted'::text, v_match_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_match_challenge(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_match_challenge(uuid, uuid, text)
  TO service_role;

-- Mechi V5 / PlayMechi Gamer Passport - Phase 1 foundation.
CREATE TABLE IF NOT EXISTS public.passport_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text,
  bio text NOT NULL DEFAULT '',
  gamer_since smallint,
  archetypes text[] NOT NULL DEFAULT '{}',
  current_status text NOT NULL DEFAULT 'offline',
  default_visibility text NOT NULL DEFAULT 'public',
  field_visibility jsonb NOT NULL DEFAULT '{
    "bio":"public",
    "gamer_since":"public",
    "archetypes":"public",
    "current_status":"public",
    "location":"public",
    "platforms":"public",
    "games":"public",
    "game_ids":"private",
    "competitive":"public",
    "events":"public",
    "achievements":"public",
    "teams":"public"
  }'::jsonb,
  is_discoverable boolean NOT NULL DEFAULT true,
  card_accent text NOT NULL DEFAULT '#32E0C4',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_profiles_display_name_length
    CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 2 AND 40),
  CONSTRAINT passport_profiles_bio_length CHECK (char_length(bio) <= 280),
  CONSTRAINT passport_profiles_gamer_since_range
    CHECK (gamer_since IS NULL OR gamer_since BETWEEN 1970 AND 2100),
  CONSTRAINT passport_profiles_archetypes_count CHECK (cardinality(archetypes) <= 3),
  CONSTRAINT passport_profiles_archetypes_allowed CHECK (
    archetypes <@ ARRAY[
      'competitive', 'story_explorer', 'completionist', 'casual',
      'trophy_hunter', 'speedrunner', 'mobile_gamer', 'console_gamer',
      'pc_gamer', 'sports_specialist', 'fighting_specialist',
      'battle_royale_player', 'retro_gamer', 'tournament_organizer',
      'content_creator', 'community_builder'
    ]::text[]
  ),
  CONSTRAINT passport_profiles_status_allowed CHECK (
    current_status IN ('offline', 'online', 'looking_to_play', 'competing', 'story_mode')
  ),
  CONSTRAINT passport_profiles_default_visibility_allowed CHECK (
    default_visibility IN ('public', 'friends', 'private')
  ),
  CONSTRAINT passport_profiles_field_visibility_object CHECK (
    jsonb_typeof(field_visibility) = 'object'
  ),
  CONSTRAINT passport_profiles_card_accent_hex CHECK (
    card_accent ~ '^#[0-9A-Fa-f]{6}$'
  )
);

CREATE TABLE IF NOT EXISTS public.passport_profile_summaries (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  games_count integer NOT NULL DEFAULT 0,
  total_matches integer NOT NULL DEFAULT 0,
  total_wins integer NOT NULL DEFAULT 0,
  total_losses integer NOT NULL DEFAULT 0,
  best_rating integer NOT NULL DEFAULT 1000,
  tournaments_registered integer NOT NULL DEFAULT 0,
  events_attended integer NOT NULL DEFAULT 0,
  completed_events integer NOT NULL DEFAULT 0,
  achievements_count integer NOT NULL DEFAULT 0,
  badges_count integer NOT NULL DEFAULT 0,
  teams_count integer NOT NULL DEFAULT 0,
  verified_records_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_profile_summaries_non_negative CHECK (
    games_count >= 0
    AND total_matches >= 0
    AND total_wins >= 0
    AND total_losses >= 0
    AND tournaments_registered >= 0
    AND events_attended >= 0
    AND completed_events >= 0
    AND achievements_count >= 0
    AND badges_count >= 0
    AND teams_count >= 0
    AND verified_records_count >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.passport_verification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (
    subject_type IN ('profile', 'game_account', 'match', 'tournament', 'event', 'team', 'achievement')
  ),
  subject_id text NOT NULL,
  verification_state text NOT NULL CHECK (
    verification_state IN (
      'self_reported', 'evidence_attached', 'community_confirmed',
      'organizer_verified', 'mechi_verified', 'platform_synced'
    )
  ),
  label text NOT NULL CHECK (char_length(label) BETWEEN 2 AND 120),
  source_type text NOT NULL,
  source_key text NOT NULL,
  public_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(public_details) = 'object'
  ),
  issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_verification_source_length CHECK (
    char_length(source_type) BETWEEN 2 AND 60 AND char_length(source_key) BETWEEN 1 AND 200
  ),
  CONSTRAINT passport_verification_revocation_complete CHECK (
    revoked_at IS NULL OR revocation_reason IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.passport_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(action) BETWEEN 2 AND 100),
  changed_fields text[] NOT NULL DEFAULT '{}',
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  request_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS passport_verification_active_source_idx
  ON public.passport_verification_records(user_id, subject_type, subject_id, source_type, source_key)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_profiles_discoverable_idx
  ON public.passport_profiles(is_discoverable, updated_at DESC)
  WHERE is_discoverable = true;
CREATE INDEX IF NOT EXISTS passport_verification_user_active_idx
  ON public.passport_verification_records(user_id, issued_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_audit_user_created_idx
  ON public.passport_audit_logs(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_passport_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_passport_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_passport_updated_at() TO service_role;

DROP TRIGGER IF EXISTS passport_profiles_set_updated_at ON public.passport_profiles;
CREATE TRIGGER passport_profiles_set_updated_at
  BEFORE UPDATE ON public.passport_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_verification_set_updated_at ON public.passport_verification_records;
CREATE TRIGGER passport_verification_set_updated_at
  BEFORE UPDATE ON public.passport_verification_records
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_profile_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.passport_profiles,
  public.passport_profile_summaries,
  public.passport_verification_records,
  public.passport_audit_logs
FROM anon, authenticated;
GRANT ALL ON TABLE
  public.passport_profiles,
  public.passport_profile_summaries,
  public.passport_verification_records,
  public.passport_audit_logs
TO service_role;

-- -----------------------------------------------------------------------------
-- Mechi V5 Gamer Passport Phase 2: catalogue, personal libraries, and requests.
-- Keep this append-only bootstrap section aligned with the versioned migration.
-- -----------------------------------------------------------------------------
-- Mechi V5 / PlayMechi Gamer Passport - Phase 2 game-library MVP.
--
-- Mechi authenticates with its own signed JWT and performs all database work
-- through server-side service-role clients. These tables are intentionally
-- unavailable to anon/authenticated Data API roles. Public reads are projected
-- and privacy-filtered by the application.

CREATE TABLE IF NOT EXISTS public.passport_game_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  canonical_game_id uuid REFERENCES public.passport_game_catalog(id) ON DELETE SET NULL,
  title text NOT NULL,
  edition_title text,
  release_year smallint,
  cover_url text,
  platforms text[] NOT NULL DEFAULT '{}',
  genres text[] NOT NULL DEFAULT '{}',
  modes text[] NOT NULL DEFAULT '{}',
  game_kind text NOT NULL DEFAULT 'base_game',
  search_aliases text[] NOT NULL DEFAULT '{}',
  provider text NOT NULL DEFAULT 'mechi',
  provider_id text,
  provider_url text,
  provider_attribution text,
  resolution_status text NOT NULL DEFAULT 'approved',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_game_catalog_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT passport_game_catalog_title_length
    CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT passport_game_catalog_release_year_range
    CHECK (release_year IS NULL OR release_year BETWEEN 1970 AND 2100),
  CONSTRAINT passport_game_catalog_platforms_allowed CHECK (
    platforms <@ ARRAY['ps', 'xbox', 'nintendo', 'mobile', 'pc']::text[]
  ),
  CONSTRAINT passport_game_catalog_kind_allowed CHECK (
    game_kind IN ('base_game', 'edition', 'remaster', 'remake', 'dlc')
  ),
  CONSTRAINT passport_game_catalog_resolution_allowed CHECK (
    resolution_status IN ('approved', 'pending_review', 'merged', 'hidden')
  ),
  CONSTRAINT passport_game_catalog_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT passport_game_catalog_not_self_canonical CHECK (canonical_game_id IS NULL OR canonical_game_id <> id)
);

CREATE TABLE IF NOT EXISTS public.passport_game_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  catalog_game_id uuid NOT NULL REFERENCES public.passport_game_catalog(id) ON DELETE RESTRICT,
  platform text NOT NULL DEFAULT 'unspecified',
  play_status text NOT NULL DEFAULT 'backlog',
  started_on date,
  completed_on date,
  rating smallint,
  hours_played numeric(8,1),
  short_review text NOT NULL DEFAULT '',
  contains_spoilers boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'public',
  screenshot_url text,
  screenshot_public_id text,
  source_type text NOT NULL DEFAULT 'manual',
  source_key text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_game_entries_platform_allowed CHECK (
    platform IN ('unspecified', 'ps', 'xbox', 'nintendo', 'mobile', 'pc')
  ),
  CONSTRAINT passport_game_entries_status_allowed CHECK (
    play_status IN ('playing', 'completed', 'backlog', 'paused', 'dropped', 'replaying')
  ),
  CONSTRAINT passport_game_entries_rating_range CHECK (rating IS NULL OR rating BETWEEN 1 AND 10),
  CONSTRAINT passport_game_entries_hours_range CHECK (
    hours_played IS NULL OR hours_played BETWEEN 0 AND 100000
  ),
  CONSTRAINT passport_game_entries_review_length CHECK (char_length(short_review) <= 500),
  CONSTRAINT passport_game_entries_visibility_allowed CHECK (
    visibility IN ('public', 'friends', 'private')
  ),
  CONSTRAINT passport_game_entries_source_allowed CHECK (
    source_type IN ('manual', 'mechi_projected', 'platform_synced', 'admin')
  ),
  CONSTRAINT passport_game_entries_dates_ordered CHECK (
    completed_on IS NULL OR started_on IS NULL OR completed_on >= started_on
  ),
  CONSTRAINT passport_game_entries_unique_platform UNIQUE (user_id, catalog_game_id, platform)
);

CREATE TABLE IF NOT EXISTS public.passport_game_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_title text NOT NULL,
  requested_platform text,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  resolved_catalog_game_id uuid REFERENCES public.passport_game_catalog(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_game_requests_title_length CHECK (char_length(requested_title) BETWEEN 2 AND 120),
  CONSTRAINT passport_game_requests_notes_length CHECK (char_length(notes) <= 500),
  CONSTRAINT passport_game_requests_platform_allowed CHECK (
    requested_platform IS NULL OR requested_platform IN ('ps', 'xbox', 'nintendo', 'mobile', 'pc')
  ),
  CONSTRAINT passport_game_requests_status_allowed CHECK (
    status IN ('open', 'reviewing', 'resolved', 'duplicate', 'rejected')
  ),
  CONSTRAINT passport_game_requests_resolution_complete CHECK (
    status NOT IN ('resolved', 'duplicate') OR resolved_catalog_game_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS passport_game_catalog_title_idx
  ON public.passport_game_catalog(lower(title));
CREATE INDEX IF NOT EXISTS passport_game_catalog_aliases_idx
  ON public.passport_game_catalog USING gin(search_aliases);
CREATE INDEX IF NOT EXISTS passport_game_catalog_platforms_idx
  ON public.passport_game_catalog USING gin(platforms);
CREATE INDEX IF NOT EXISTS passport_game_catalog_genres_idx
  ON public.passport_game_catalog USING gin(genres);
CREATE INDEX IF NOT EXISTS passport_game_entries_user_status_idx
  ON public.passport_game_entries(user_id, play_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS passport_game_entries_public_idx
  ON public.passport_game_entries(user_id, updated_at DESC)
  WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS passport_game_entries_featured_idx
  ON public.passport_game_entries(user_id, updated_at DESC)
  WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS passport_game_requests_open_idx
  ON public.passport_game_requests(created_at ASC)
  WHERE status IN ('open', 'reviewing');

CREATE OR REPLACE FUNCTION public.enforce_passport_featured_game_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_featured AND (TG_OP = 'INSERT' OR OLD.is_featured IS DISTINCT FROM true) THEN
    IF (
      SELECT count(*)
      FROM public.passport_game_entries entry
      WHERE entry.user_id = NEW.user_id
        AND entry.is_featured = true
        AND entry.id <> NEW.id
    ) >= 5 THEN
      RAISE EXCEPTION 'A Passport can feature at most five games'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_passport_featured_game_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_passport_featured_game_limit() TO service_role;

DROP TRIGGER IF EXISTS passport_game_entries_featured_limit ON public.passport_game_entries;
CREATE TRIGGER passport_game_entries_featured_limit
  BEFORE INSERT OR UPDATE OF is_featured ON public.passport_game_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_passport_featured_game_limit();

DROP TRIGGER IF EXISTS passport_game_catalog_set_updated_at ON public.passport_game_catalog;
CREATE TRIGGER passport_game_catalog_set_updated_at
  BEFORE UPDATE ON public.passport_game_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

DROP TRIGGER IF EXISTS passport_game_entries_set_updated_at ON public.passport_game_entries;
CREATE TRIGGER passport_game_entries_set_updated_at
  BEFORE UPDATE ON public.passport_game_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

DROP TRIGGER IF EXISTS passport_game_requests_set_updated_at ON public.passport_game_requests;
CREATE TRIGGER passport_game_requests_set_updated_at
  BEFORE UPDATE ON public.passport_game_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_game_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_game_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_game_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.passport_game_catalog,
  public.passport_game_entries,
  public.passport_game_requests
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.passport_game_catalog,
  public.passport_game_entries,
  public.passport_game_requests
TO service_role;

ALTER TABLE public.passport_profile_summaries
  ADD COLUMN IF NOT EXISTS playing_games_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_games_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorite_games_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_library_hours numeric(10,1) NOT NULL DEFAULT 0;

ALTER TABLE public.passport_profile_summaries
  DROP CONSTRAINT IF EXISTS passport_profile_summaries_library_non_negative;
ALTER TABLE public.passport_profile_summaries
  ADD CONSTRAINT passport_profile_summaries_library_non_negative CHECK (
    playing_games_count >= 0
    AND completed_games_count >= 0
    AND favorite_games_count >= 0
    AND total_library_hours >= 0
  );

-- Curated launch catalogue. Local artwork is used where Mechi already has
-- licensed/source-documented assets; the remaining records intentionally keep
-- cover_url null until the provider cache or an admin supplies approved art.
INSERT INTO public.passport_game_catalog
  (slug, title, edition_title, release_year, cover_url, platforms, genres, modes, game_kind, search_aliases, provider, provider_id)
VALUES
  ('efootball', 'eFootball 2026', NULL, 2025, '/game-artwork/efootball-capsule.webp', ARRAY['ps','xbox','pc','mobile'], ARRAY['sports'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['pes','pro evolution soccer','efootball mobile'], 'mechi', 'efootball'),
  ('efootball-mobile', 'eFootball 2026', 'Mobile', 2025, '/game-artwork/efootball_mobile-capsule.webp', ARRAY['mobile'], ARRAY['sports'], ARRAY['single-player','multiplayer','competitive'], 'edition', ARRAY['pes mobile','efootball mobile'], 'mechi', 'efootball_mobile'),
  ('ea-fc-26', 'EA Sports FC 26', NULL, 2025, '/game-artwork/fc26-capsule.webp', ARRAY['ps','xbox','pc','nintendo'], ARRAY['sports'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['fc26','fifa','ea fc'], 'mechi', 'fc26'),
  ('mortal-kombat-11', 'Mortal Kombat 11', NULL, 2019, '/game-artwork/mk11-capsule.webp', ARRAY['ps','xbox','pc','nintendo'], ARRAY['fighting'], ARRAY['story','multiplayer','competitive'], 'base_game', ARRAY['mk11','mortal kombat'], 'mechi', 'mk11'),
  ('nba-2k26', 'NBA 2K26', NULL, 2025, '/game-artwork/nba2k26-capsule.webp', ARRAY['ps','xbox','pc','nintendo'], ARRAY['sports'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['2k26','nba'], 'mechi', 'nba2k26'),
  ('tekken-8', 'Tekken 8', NULL, 2024, '/game-artwork/tekken8-capsule.webp', ARRAY['ps','xbox','pc'], ARRAY['fighting'], ARRAY['story','multiplayer','competitive'], 'base_game', ARRAY['tekken8'], 'mechi', 'tekken8'),
  ('street-fighter-6', 'Street Fighter 6', NULL, 2023, '/game-artwork/sf6-capsule.webp', ARRAY['ps','xbox','pc'], ARRAY['fighting'], ARRAY['story','multiplayer','competitive'], 'base_game', ARRAY['sf6','street fighter'], 'mechi', 'sf6'),
  ('call-of-duty-mobile', 'Call of Duty: Mobile', NULL, 2019, '/game-artwork/codm-capsule.webp', ARRAY['mobile'], ARRAY['shooter','battle-royale'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['codm','call of duty mobile'], 'mechi', 'codm'),
  ('pubg-mobile', 'PUBG Mobile', NULL, 2018, '/game-artwork/pubgm-capsule.webp', ARRAY['mobile'], ARRAY['shooter','battle-royale'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['pubgm','playerunknown battlegrounds mobile'], 'mechi', 'pubgm'),
  ('counter-strike-2', 'Counter-Strike 2', NULL, 2023, '/game-artwork/cs2-capsule.webp', ARRAY['pc'], ARRAY['shooter'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['cs2','counter strike'], 'mechi', 'cs2'),
  ('valorant', 'Valorant', NULL, 2020, '/game-artwork/valorant-capsule.webp', ARRAY['pc','ps','xbox'], ARRAY['shooter'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['val'], 'mechi', 'valorant'),
  ('mario-kart-8-deluxe', 'Mario Kart 8 Deluxe', NULL, 2017, '/game-artwork/mariokart-capsule.webp', ARRAY['nintendo'], ARRAY['racing'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['mario kart','mk8'], 'mechi', 'mariokart'),
  ('super-smash-bros-ultimate', 'Super Smash Bros. Ultimate', NULL, 2018, '/game-artwork/smashbros-capsule.webp', ARRAY['nintendo'], ARRAY['fighting','party'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['smash bros','ssbu'], 'mechi', 'smashbros'),
  ('free-fire', 'Free Fire', NULL, 2017, '/game-artwork/freefire-capsule.webp', ARRAY['mobile'], ARRAY['shooter','battle-royale'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['garena free fire','freefire'], 'mechi', 'freefire'),
  ('ludo', 'Ludo', NULL, NULL, '/game-artwork/ludo-capsule.webp', ARRAY['mobile','pc'], ARRAY['board','party'], ARRAY['single-player','multiplayer'], 'base_game', ARRAY['ludo king'], 'mechi', 'ludo'),
  ('rocket-league', 'Rocket League', NULL, 2015, '/game-artwork/rocketleague-capsule.webp', ARRAY['ps','xbox','pc','nintendo'], ARRAY['sports','racing'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['rocketleague'], 'mechi', 'rocketleague'),
  ('fortnite', 'Fortnite', NULL, 2017, NULL, ARRAY['ps','xbox','pc','nintendo','mobile'], ARRAY['shooter','battle-royale'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['fortnight'], 'mechi', 'fortnite'),
  ('the-witcher-3-wild-hunt', 'The Witcher 3: Wild Hunt', NULL, 2015, NULL, ARRAY['ps','xbox','pc','nintendo'], ARRAY['action-rpg','story'], ARRAY['single-player','story'], 'base_game', ARRAY['witcher 3','wild hunt'], 'mechi', NULL),
  ('cyberpunk-2077', 'Cyberpunk 2077', NULL, 2020, NULL, ARRAY['ps','xbox','pc'], ARRAY['action-rpg','story'], ARRAY['single-player','story'], 'base_game', ARRAY['cyberpunk'], 'mechi', NULL),
  ('red-dead-redemption-2', 'Red Dead Redemption 2', NULL, 2018, NULL, ARRAY['ps','xbox','pc'], ARRAY['action-adventure','story','open-world'], ARRAY['single-player','story','multiplayer'], 'base_game', ARRAY['rdr2','red dead 2'], 'mechi', NULL),
  ('grand-theft-auto-v', 'Grand Theft Auto V', NULL, 2013, NULL, ARRAY['ps','xbox','pc'], ARRAY['action-adventure','open-world'], ARRAY['single-player','story','multiplayer'], 'base_game', ARRAY['gta 5','gta v'], 'mechi', NULL),
  ('elden-ring', 'Elden Ring', NULL, 2022, NULL, ARRAY['ps','xbox','pc'], ARRAY['action-rpg','story'], ARRAY['single-player','story','multiplayer'], 'base_game', ARRAY['eldenring'], 'mechi', NULL),
  ('god-of-war', 'God of War', NULL, 2018, NULL, ARRAY['ps','pc'], ARRAY['action-adventure','story'], ARRAY['single-player','story'], 'base_game', ARRAY['god of war 2018','gow'], 'mechi', NULL),
  ('marvels-spider-man', 'Marvel''s Spider-Man', NULL, 2018, NULL, ARRAY['ps','pc'], ARRAY['action-adventure','story','open-world'], ARRAY['single-player','story'], 'base_game', ARRAY['spiderman','spider-man'], 'mechi', NULL),
  ('horizon-zero-dawn', 'Horizon Zero Dawn', NULL, 2017, NULL, ARRAY['ps','pc'], ARRAY['action-rpg','story','open-world'], ARRAY['single-player','story'], 'base_game', ARRAY['hzd','horizon'], 'mechi', NULL),
  ('hades', 'Hades', NULL, 2020, NULL, ARRAY['ps','xbox','pc','nintendo'], ARRAY['action','roguelike','story'], ARRAY['single-player','story'], 'base_game', ARRAY['hades game'], 'mechi', NULL),
  ('hollow-knight', 'Hollow Knight', NULL, 2017, NULL, ARRAY['ps','xbox','pc','nintendo'], ARRAY['metroidvania','story'], ARRAY['single-player','story'], 'base_game', ARRAY['hollowknight'], 'mechi', NULL),
  ('stardew-valley', 'Stardew Valley', NULL, 2016, NULL, ARRAY['ps','xbox','pc','nintendo','mobile'], ARRAY['simulation','role-playing'], ARRAY['single-player','multiplayer'], 'base_game', ARRAY['stardew'], 'mechi', NULL),
  ('minecraft', 'Minecraft', NULL, 2011, NULL, ARRAY['ps','xbox','pc','nintendo','mobile'], ARRAY['sandbox','survival'], ARRAY['single-player','multiplayer'], 'base_game', ARRAY['minecraft bedrock','minecraft java'], 'mechi', NULL),
  ('the-last-of-us-part-i', 'The Last of Us Part I', NULL, 2022, NULL, ARRAY['ps','pc'], ARRAY['action-adventure','story'], ARRAY['single-player','story'], 'remake', ARRAY['last of us','tlou'], 'mechi', NULL),
  ('ghost-of-tsushima', 'Ghost of Tsushima', NULL, 2020, NULL, ARRAY['ps','pc'], ARRAY['action-adventure','story','open-world'], ARRAY['single-player','story','multiplayer'], 'base_game', ARRAY['ghost tsushima'], 'mechi', NULL),
  ('life-is-strange', 'Life is Strange', NULL, 2015, NULL, ARRAY['ps','xbox','pc','mobile'], ARRAY['adventure','story'], ARRAY['single-player','story'], 'base_game', ARRAY['life is strange 1'], 'mechi', NULL),
  ('detroit-become-human', 'Detroit: Become Human', NULL, 2018, NULL, ARRAY['ps','pc'], ARRAY['adventure','story'], ARRAY['single-player','story'], 'base_game', ARRAY['detroit'], 'mechi', NULL)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  edition_title = EXCLUDED.edition_title,
  release_year = EXCLUDED.release_year,
  cover_url = coalesce(EXCLUDED.cover_url, public.passport_game_catalog.cover_url),
  platforms = EXCLUDED.platforms,
  genres = EXCLUDED.genres,
  modes = EXCLUDED.modes,
  game_kind = EXCLUDED.game_kind,
  search_aliases = EXCLUDED.search_aliases,
  provider = EXCLUDED.provider,
  provider_id = EXCLUDED.provider_id,
  resolution_status = 'approved';

UPDATE public.passport_game_catalog mobile
SET canonical_game_id = base.id
FROM public.passport_game_catalog base
WHERE mobile.slug = 'efootball-mobile'
  AND base.slug = 'efootball'
  AND mobile.canonical_game_id IS DISTINCT FROM base.id;

-- Existing selected Mechi games become self-reported library records so current
-- competitive users see their history immediately after migration.
INSERT INTO public.passport_game_entries
  (user_id, catalog_game_id, platform, play_status, is_favorite, source_type, source_key)
SELECT
  p.id,
  catalog.id,
  'unspecified',
  'playing',
  true,
  'mechi_projected',
  selected.game_key
FROM public.profiles p
CROSS JOIN LATERAL unnest(coalesce(p.selected_games, '{}'::text[])) AS selected(game_key)
JOIN public.passport_game_catalog catalog ON catalog.provider_id = selected.game_key
ON CONFLICT (user_id, catalog_game_id, platform) DO NOTHING;

UPDATE public.passport_profile_summaries summary
SET
  games_count = library.games_count,
  playing_games_count = library.playing_games_count,
  completed_games_count = library.completed_games_count,
  favorite_games_count = library.favorite_games_count,
  total_library_hours = library.total_library_hours,
  computed_at = timezone('utc', now())
FROM (
  SELECT
    user_id,
    count(*)::integer AS games_count,
    count(*) FILTER (WHERE play_status IN ('playing', 'replaying'))::integer AS playing_games_count,
    count(*) FILTER (WHERE play_status = 'completed')::integer AS completed_games_count,
    count(*) FILTER (WHERE is_favorite)::integer AS favorite_games_count,
    coalesce(sum(hours_played), 0)::numeric(10,1) AS total_library_hours
  FROM public.passport_game_entries
  GROUP BY user_id
) library
WHERE summary.user_id = library.user_id;

+-- Mechi V5 / PlayMechi Gamer Passport - Phase 3 social comparison layer.
--
-- Mechi uses its own signed JWT and server-side service-role access. All public
-- and authenticated projections are produced by application routes, with block
-- and visibility checks applied before any social or comparison data is read.

CREATE TABLE IF NOT EXISTS public.passport_friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_friendships_canonical_pair CHECK (user_a_id < user_b_id),
  CONSTRAINT passport_friendships_requester_in_pair CHECK (requested_by IN (user_a_id, user_b_id)),
  CONSTRAINT passport_friendships_status_allowed CHECK (
    status IN ('pending', 'accepted', 'declined')
  ),
  CONSTRAINT passport_friendships_unique_pair UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS public.passport_follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_follows_no_self CHECK (follower_id <> followed_id),
  PRIMARY KEY (follower_id, followed_id)
);

CREATE TABLE IF NOT EXISTS public.passport_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason_category text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_blocks_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT passport_blocks_reason_allowed CHECK (
    reason_category IS NULL OR reason_category IN ('privacy', 'harassment', 'spam', 'cheating_concern', 'other')
  ),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.passport_game_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  catalog_game_id uuid NOT NULL REFERENCES public.passport_game_catalog(id) ON DELETE RESTRICT,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent',
  source_comparison_key text,
  seen_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_game_recommendations_no_self CHECK (sender_id <> recipient_id),
  CONSTRAINT passport_game_recommendations_message_length CHECK (char_length(message) <= 240),
  CONSTRAINT passport_game_recommendations_status_allowed CHECK (
    status IN ('sent', 'seen', 'saved', 'dismissed')
  ),
  CONSTRAINT passport_game_recommendations_key_format CHECK (
    source_comparison_key IS NULL OR source_comparison_key ~ '^[0-9a-f-]{36}:[0-9a-f-]{36}$'
  )
);

CREATE TABLE IF NOT EXISTS public.passport_comparison_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_username text,
  attribution_source text NOT NULL DEFAULT 'passport_compare',
  campaign text,
  visit_count integer NOT NULL DEFAULT 0,
  first_visited_at timestamptz,
  last_visited_at timestamptz,
  claimed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_comparison_invitations_target CHECK (
    target_user_id IS NOT NULL OR char_length(coalesce(target_username, '')) BETWEEN 2 AND 40
  ),
  CONSTRAINT passport_comparison_invitations_source_length CHECK (
    char_length(attribution_source) BETWEEN 2 AND 80
  ),
  CONSTRAINT passport_comparison_invitations_campaign_length CHECK (
    campaign IS NULL OR char_length(campaign) <= 100
  ),
  CONSTRAINT passport_comparison_invitations_visits_non_negative CHECK (visit_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.passport_comparison_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  left_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  right_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comparison_key text NOT NULL,
  event_type text NOT NULL,
  invitation_id uuid REFERENCES public.passport_comparison_invitations(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_comparison_events_distinct_players CHECK (left_user_id <> right_user_id),
  CONSTRAINT passport_comparison_events_key_format CHECK (
    comparison_key ~ '^[0-9a-f-]{36}:[0-9a-f-]{36}$'
  ),
  CONSTRAINT passport_comparison_events_type_allowed CHECK (
    event_type IN (
      'viewed', 'shared', 'friend_requested', 'followed', 'recommendation_sent',
      'challenge_started', 'invitation_visited', 'invitation_claimed'
    )
  ),
  CONSTRAINT passport_comparison_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS passport_friendships_user_a_status_idx
  ON public.passport_friendships(user_a_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS passport_friendships_user_b_status_idx
  ON public.passport_friendships(user_b_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS passport_friendships_requested_by_idx
  ON public.passport_friendships(requested_by, status, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_follows_followed_idx
  ON public.passport_follows(followed_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_blocks_blocked_idx
  ON public.passport_blocks(blocked_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_game_recommendations_recipient_idx
  ON public.passport_game_recommendations(recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_game_recommendations_sender_idx
  ON public.passport_game_recommendations(sender_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS passport_game_recommendations_active_unique_idx
  ON public.passport_game_recommendations(sender_id, recipient_id, catalog_game_id)
  WHERE status IN ('sent', 'seen');
CREATE INDEX IF NOT EXISTS passport_comparison_invitations_creator_idx
  ON public.passport_comparison_invitations(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_comparison_invitations_target_idx
  ON public.passport_comparison_invitations(target_user_id, created_at DESC)
  WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_comparison_events_pair_idx
  ON public.passport_comparison_events(comparison_key, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_comparison_events_actor_idx
  ON public.passport_comparison_events(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_comparison_events_invitation_idx
  ON public.passport_comparison_events(invitation_id, created_at DESC)
  WHERE invitation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_passport_comparison_invitation_visit(
  p_token uuid,
  p_left_user_id uuid,
  p_right_user_id uuid
)
RETURNS TABLE (invitation_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.passport_comparison_invitations invitation
  SET
    visit_count = invitation.visit_count + 1,
    first_visited_at = coalesce(invitation.first_visited_at, timezone('utc', now())),
    last_visited_at = timezone('utc', now())
  WHERE invitation.token = p_token
    AND invitation.expires_at > timezone('utc', now())
    AND p_left_user_id <> p_right_user_id
    AND invitation.creator_id IN (p_left_user_id, p_right_user_id)
    AND invitation.target_user_id IN (p_left_user_id, p_right_user_id)
  RETURNING invitation.id;
$$;

REVOKE ALL ON FUNCTION public.record_passport_comparison_invitation_visit(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_passport_comparison_invitation_visit(uuid, uuid, uuid)
  TO service_role;

DROP TRIGGER IF EXISTS passport_friendships_set_updated_at ON public.passport_friendships;
CREATE TRIGGER passport_friendships_set_updated_at
  BEFORE UPDATE ON public.passport_friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

DROP TRIGGER IF EXISTS passport_game_recommendations_set_updated_at ON public.passport_game_recommendations;
CREATE TRIGGER passport_game_recommendations_set_updated_at
  BEFORE UPDATE ON public.passport_game_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_game_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_comparison_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_comparison_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.passport_friendships,
  public.passport_follows,
  public.passport_blocks,
  public.passport_game_recommendations,
  public.passport_comparison_invitations,
  public.passport_comparison_events
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.passport_friendships,
  public.passport_follows,
  public.passport_blocks,
  public.passport_game_recommendations,
  public.passport_comparison_invitations,
  public.passport_comparison_events
TO service_role;

ALTER TABLE public.passport_profile_summaries
  ADD COLUMN IF NOT EXISTS friends_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.passport_profile_summaries
  DROP CONSTRAINT IF EXISTS passport_profile_summaries_social_non_negative;
ALTER TABLE public.passport_profile_summaries
  ADD CONSTRAINT passport_profile_summaries_social_non_negative CHECK (
    friends_count >= 0 AND followers_count >= 0 AND following_count >= 0
  );

UPDATE public.passport_profiles
SET field_visibility = field_visibility || '{"social":"public"}'::jsonb
WHERE NOT (field_visibility ? 'social');

ALTER TABLE public.passport_profiles
  ALTER COLUMN field_visibility SET DEFAULT '{
    "bio":"public",
    "gamer_since":"public",
    "archetypes":"public",
    "current_status":"public",
    "location":"public",
    "platforms":"public",
    "games":"public",
    "game_ids":"private",
    "competitive":"public",
    "events":"public",
    "achievements":"public",
    "teams":"public",
    "social":"public"
  }'::jsonb;

-- Mechi V5 / PlayMechi Gamer Passport - Phase 4 competitive resume and event trust.
-- All reads and mutations are mediated by Mechi server routes using service_role.

CREATE TABLE IF NOT EXISTS public.passport_competitive_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_key text NOT NULL UNIQUE,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_competitive_seasons_key_format CHECK (season_key ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  CONSTRAINT passport_competitive_seasons_dates CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.passport_competitive_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game text NOT NULL,
  season_id uuid REFERENCES public.passport_competitive_seasons(id) ON DELETE CASCADE,
  current_rating integer NOT NULL DEFAULT 1000,
  peak_rating integer NOT NULL DEFAULT 1000,
  matches_played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  tournament_entries integer NOT NULL DEFAULT 0,
  tournament_wins integer NOT NULL DEFAULT 0,
  podiums integer NOT NULL DEFAULT 0,
  source_cursor timestamptz,
  computed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_competitive_snapshot_scope_unique UNIQUE NULLS NOT DISTINCT (user_id, game, season_id),
  CONSTRAINT passport_competitive_snapshot_counts CHECK (
    current_rating >= 0 AND peak_rating >= current_rating AND matches_played >= 0
    AND wins >= 0 AND losses >= 0 AND draws >= 0
    AND wins + losses + draws <= matches_played
    AND tournament_entries >= 0 AND tournament_wins >= 0 AND podiums >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.passport_event_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  event_title text NOT NULL,
  stamp_type text NOT NULL,
  credential_state text NOT NULL DEFAULT 'active',
  game text,
  role_label text,
  placement integer,
  source_type text NOT NULL,
  source_key text NOT NULL,
  source_subject_id text NOT NULL,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  tournament_player_id uuid REFERENCES public.tournament_players(id) ON DELETE SET NULL,
  verification_record_id uuid REFERENCES public.passport_verification_records(id) ON DELETE SET NULL,
  issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  occurred_at timestamptz NOT NULL,
  public_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_url text,
  media_consent boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_event_credentials_stamp_allowed CHECK (
    stamp_type IN ('registered', 'checked_in', 'attended', 'competed', 'placement', 'staff', 'organizer', 'streamer')
  ),
  CONSTRAINT passport_event_credentials_state_allowed CHECK (credential_state IN ('active', 'revoked')),
  CONSTRAINT passport_event_credentials_placement CHECK (
    (stamp_type = 'placement' AND placement IS NOT NULL AND placement > 0)
    OR (stamp_type <> 'placement' AND placement IS NULL)
  ),
  CONSTRAINT passport_event_credentials_role CHECK (
    (stamp_type IN ('staff', 'organizer', 'streamer') AND char_length(coalesce(role_label, '')) BETWEEN 2 AND 80)
    OR stamp_type NOT IN ('staff', 'organizer', 'streamer')
  ),
  CONSTRAINT passport_event_credentials_public_details CHECK (jsonb_typeof(public_details) = 'object'),
  CONSTRAINT passport_event_credentials_revocation CHECK (
    (credential_state = 'active' AND revoked_at IS NULL AND revocation_reason IS NULL)
    OR (credential_state = 'revoked' AND revoked_at IS NOT NULL AND char_length(coalesce(revocation_reason, '')) BETWEEN 3 AND 300)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_event_checkin_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  event_title text NOT NULL,
  game text,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tournament_player_id uuid REFERENCES public.tournament_players(id) ON DELETE CASCADE,
  issued_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  credential_id uuid REFERENCES public.passport_event_credentials(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_event_checkin_passes_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT passport_event_checkin_passes_expiry CHECK (expires_at > created_at),
  CONSTRAINT passport_event_checkin_passes_usage CHECK (
    (used_at IS NULL AND used_by IS NULL AND credential_id IS NULL)
    OR (used_at IS NOT NULL AND used_by = user_id AND credential_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_event_checkin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id uuid REFERENCES public.passport_event_checkin_passes(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  outcome text NOT NULL CHECK (outcome IN ('accepted', 'invalid', 'expired', 'replayed', 'transferred', 'revoked')),
  request_fingerprint text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_event_checkin_attempts_details CHECK (jsonb_typeof(details) = 'object')
);

CREATE TABLE IF NOT EXISTS public.passport_cv_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_games text[] NOT NULL DEFAULT '{}',
  include_events boolean NOT NULL DEFAULT true,
  include_teams boolean NOT NULL DEFAULT true,
  include_achievements boolean NOT NULL DEFAULT true,
  inquiry_enabled boolean NOT NULL DEFAULT false,
  inquiry_url text,
  headline text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_cv_settings_games_limit CHECK (cardinality(selected_games) <= 8),
  CONSTRAINT passport_cv_settings_headline_length CHECK (char_length(headline) <= 120),
  CONSTRAINT passport_cv_settings_inquiry CHECK (
    (NOT inquiry_enabled AND inquiry_url IS NULL)
    OR (inquiry_enabled AND inquiry_url ~ '^https://')
  )
);

CREATE INDEX IF NOT EXISTS passport_competitive_snapshots_user_game_idx
  ON public.passport_competitive_snapshots(user_id, game, computed_at DESC);
CREATE INDEX IF NOT EXISTS passport_competitive_snapshots_season_idx
  ON public.passport_competitive_snapshots(season_id, game, peak_rating DESC)
  WHERE season_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS passport_event_credentials_active_source_idx
  ON public.passport_event_credentials(user_id, stamp_type, source_type, source_key)
  WHERE credential_state = 'active';
CREATE INDEX IF NOT EXISTS passport_event_credentials_user_timeline_idx
  ON public.passport_event_credentials(user_id, occurred_at DESC)
  WHERE credential_state = 'active';
CREATE INDEX IF NOT EXISTS passport_event_credentials_event_idx
  ON public.passport_event_credentials(event_key, stamp_type, occurred_at DESC)
  WHERE credential_state = 'active';
CREATE INDEX IF NOT EXISTS passport_event_credentials_tournament_idx
  ON public.passport_event_credentials(tournament_id, user_id)
  WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_event_credentials_verification_idx
  ON public.passport_event_credentials(verification_record_id)
  WHERE verification_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_checkin_passes_user_event_idx
  ON public.passport_event_checkin_passes(user_id, event_key, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_checkin_passes_tournament_player_idx
  ON public.passport_event_checkin_passes(tournament_player_id)
  WHERE tournament_player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_checkin_attempts_pass_created_idx
  ON public.passport_event_checkin_attempts(pass_id, created_at DESC)
  WHERE pass_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_checkin_attempts_actor_created_idx
  ON public.passport_event_checkin_attempts(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

DROP TRIGGER IF EXISTS passport_competitive_snapshots_set_updated_at ON public.passport_competitive_snapshots;
CREATE TRIGGER passport_competitive_snapshots_set_updated_at
  BEFORE UPDATE ON public.passport_competitive_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

DROP TRIGGER IF EXISTS passport_event_credentials_set_updated_at ON public.passport_event_credentials;
CREATE TRIGGER passport_event_credentials_set_updated_at
  BEFORE UPDATE ON public.passport_event_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

DROP TRIGGER IF EXISTS passport_cv_settings_set_updated_at ON public.passport_cv_settings;
CREATE TRIGGER passport_cv_settings_set_updated_at
  BEFORE UPDATE ON public.passport_cv_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_competitive_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_competitive_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_event_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_event_checkin_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_event_checkin_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_cv_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.passport_competitive_seasons,
  public.passport_competitive_snapshots,
  public.passport_event_credentials,
  public.passport_event_checkin_passes,
  public.passport_event_checkin_attempts,
  public.passport_cv_settings
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.passport_competitive_seasons,
  public.passport_competitive_snapshots,
  public.passport_event_credentials,
  public.passport_event_checkin_passes,
  public.passport_event_checkin_attempts,
  public.passport_cv_settings
TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_passport_event_checkin(
  p_token_hash text,
  p_actor_id uuid,
  p_request_fingerprint text DEFAULT NULL
)
RETURNS TABLE (credential_id uuid, outcome text)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pass public.passport_event_checkin_passes%ROWTYPE;
  v_verification_id uuid;
  v_credential_id uuid;
  v_outcome text;
BEGIN
  SELECT * INTO v_pass
  FROM public.passport_event_checkin_passes
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.passport_event_checkin_attempts(actor_id, outcome, request_fingerprint)
    VALUES (p_actor_id, 'invalid', p_request_fingerprint);
    RETURN QUERY SELECT NULL::uuid, 'invalid'::text;
    RETURN;
  END IF;

  v_outcome := CASE
    WHEN v_pass.revoked_at IS NOT NULL THEN 'revoked'
    WHEN v_pass.used_at IS NOT NULL THEN 'replayed'
    WHEN v_pass.expires_at <= timezone('utc', now()) THEN 'expired'
    WHEN v_pass.user_id <> p_actor_id THEN 'transferred'
    ELSE 'accepted'
  END;

  IF v_outcome <> 'accepted' THEN
    INSERT INTO public.passport_event_checkin_attempts(pass_id, actor_id, outcome, request_fingerprint)
    VALUES (v_pass.id, p_actor_id, v_outcome, p_request_fingerprint);
    RETURN QUERY SELECT NULL::uuid, v_outcome;
    RETURN;
  END IF;

  INSERT INTO public.passport_verification_records(
    user_id, subject_type, subject_id, verification_state, label,
    source_type, source_key, public_details, issued_by
  ) VALUES (
    v_pass.user_id, 'event', v_pass.event_key, 'mechi_verified',
    v_pass.event_title || ' check-in', 'passport_qr_checkin', v_pass.id::text,
    jsonb_build_object('event_key', v_pass.event_key, 'stamp_type', 'checked_in', 'game', v_pass.game),
    v_pass.issued_by
  ) RETURNING id INTO v_verification_id;

  INSERT INTO public.passport_event_credentials(
    user_id, event_key, event_title, stamp_type, game, source_type, source_key,
    source_subject_id, tournament_id, tournament_player_id, verification_record_id,
    issued_by, occurred_at, public_details
  ) VALUES (
    v_pass.user_id, v_pass.event_key, v_pass.event_title, 'checked_in', v_pass.game,
    'passport_qr_checkin', v_pass.id::text, v_pass.event_key,
    v_pass.tournament_id, v_pass.tournament_player_id, v_verification_id,
    v_pass.issued_by, timezone('utc', now()),
    jsonb_build_object('event_key', v_pass.event_key, 'check_in_method', 'qr')
  ) RETURNING id INTO v_credential_id;

  -- The credential timeline and authoritative tournament registration must agree.
  -- A QR scan is not merely a badge mint; it is the actual check-in transition.
  IF v_pass.tournament_player_id IS NOT NULL THEN
    UPDATE public.tournament_players
    SET check_in_status = 'checked_in', checked_in_at = timezone('utc', now())
    WHERE id = v_pass.tournament_player_id
      AND tournament_id = v_pass.tournament_id
      AND user_id = v_pass.user_id
      AND payment_status IN ('paid', 'free');
  END IF;

  UPDATE public.passport_event_checkin_passes
  SET used_at = timezone('utc', now()), used_by = p_actor_id, credential_id = v_credential_id
  WHERE id = v_pass.id;

  INSERT INTO public.passport_event_checkin_attempts(pass_id, actor_id, outcome, request_fingerprint)
  VALUES (v_pass.id, p_actor_id, 'accepted', p_request_fingerprint);

  RETURN QUERY SELECT v_credential_id, 'accepted'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_passport_event_checkin(text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_passport_event_checkin(text, uuid, text)
  TO service_role;

-- Backfill generic Mechi tournament registration and attendance as distinct facts.
INSERT INTO public.passport_verification_records(
  user_id, subject_type, subject_id, verification_state, label,
  source_type, source_key, public_details, issued_by, issued_at
)
SELECT
  tp.user_id, 'tournament', tournament.id::text, 'mechi_verified',
  tournament.title || ' registration', 'tournament_player', tp.id::text || ':registered',
  jsonb_build_object('event_key', tournament.slug, 'stamp_type', 'registered', 'game', tournament.game),
  tournament.organizer_id, tp.joined_at
FROM public.tournament_players tp
JOIN public.tournaments tournament ON tournament.id = tp.tournament_id
WHERE tp.payment_status IN ('paid', 'free')
ON CONFLICT DO NOTHING;

INSERT INTO public.passport_event_credentials(
  user_id, event_key, event_title, stamp_type, game, source_type, source_key,
  source_subject_id, tournament_id, tournament_player_id, verification_record_id,
  issued_by, issued_at, occurred_at, public_details
)
SELECT
  tp.user_id, tournament.slug, tournament.title, 'registered', tournament.game,
  'tournament_player', tp.id::text || ':registered', tournament.id::text,
  tournament.id, tp.id, verification.id, tournament.organizer_id,
  tp.joined_at, tp.joined_at,
  jsonb_build_object('tournament_slug', tournament.slug, 'registration_state', 'confirmed')
FROM public.tournament_players tp
JOIN public.tournaments tournament ON tournament.id = tp.tournament_id
JOIN public.passport_verification_records verification
  ON verification.user_id = tp.user_id
  AND verification.source_type = 'tournament_player'
  AND verification.source_key = tp.id::text || ':registered'
  AND verification.revoked_at IS NULL
WHERE tp.payment_status IN ('paid', 'free')
ON CONFLICT DO NOTHING;

INSERT INTO public.passport_verification_records(
  user_id, subject_type, subject_id, verification_state, label,
  source_type, source_key, public_details, issued_by, issued_at
)
SELECT
  tp.user_id, 'event', tournament.id::text, 'mechi_verified',
  tournament.title || ' attendance', 'tournament_player', tp.id::text || ':checked_in',
  jsonb_build_object('event_key', tournament.slug, 'stamp_type', 'checked_in', 'game', tournament.game),
  tournament.organizer_id, tp.checked_in_at
FROM public.tournament_players tp
JOIN public.tournaments tournament ON tournament.id = tp.tournament_id
WHERE tp.check_in_status = 'checked_in' AND tp.checked_in_at IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.passport_event_credentials(
  user_id, event_key, event_title, stamp_type, game, source_type, source_key,
  source_subject_id, tournament_id, tournament_player_id, verification_record_id,
  issued_by, issued_at, occurred_at, public_details
)
SELECT
  tp.user_id, tournament.slug, tournament.title, 'checked_in', tournament.game,
  'tournament_player', tp.id::text || ':checked_in', tournament.id::text,
  tournament.id, tp.id, verification.id, tournament.organizer_id,
  tp.checked_in_at, tp.checked_in_at,
  jsonb_build_object('tournament_slug', tournament.slug, 'check_in_method', 'legacy_mechi')
FROM public.tournament_players tp
JOIN public.tournaments tournament ON tournament.id = tp.tournament_id
JOIN public.passport_verification_records verification
  ON verification.user_id = tp.user_id
  AND verification.source_type = 'tournament_player'
  AND verification.source_key = tp.id::text || ':checked_in'
  AND verification.revoked_at IS NULL
WHERE tp.check_in_status = 'checked_in' AND tp.checked_in_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill PlayMechi online-event registrations and checked-in attendance without exposing reward or payout state.
INSERT INTO public.passport_verification_records(
  user_id, subject_type, subject_id, verification_state, label,
  source_type, source_key, public_details, issued_at
)
SELECT
  registration.user_id, 'event', registration.event_slug, 'mechi_verified',
  replace(initcap(replace(registration.event_slug, '-', ' ')), '_', ' ') || ' registration',
  'online_tournament_registration', registration.id::text || ':registered',
  jsonb_build_object('event_key', registration.event_slug, 'stamp_type', 'registered', 'game', registration.game),
  registration.created_at
FROM public.online_tournament_registrations registration
ON CONFLICT DO NOTHING;

INSERT INTO public.passport_event_credentials(
  user_id, event_key, event_title, stamp_type, game, source_type, source_key,
  source_subject_id, verification_record_id, issued_at, occurred_at, public_details
)
SELECT
  registration.user_id, registration.event_slug,
  replace(initcap(replace(registration.event_slug, '-', ' ')), '_', ' '),
  'registered', registration.game, 'online_tournament_registration',
  registration.id::text || ':registered', registration.event_slug,
  verification.id, registration.created_at, registration.created_at,
  jsonb_build_object('event_slug', registration.event_slug)
FROM public.online_tournament_registrations registration
JOIN public.passport_verification_records verification
  ON verification.user_id = registration.user_id
  AND verification.source_type = 'online_tournament_registration'
  AND verification.source_key = registration.id::text || ':registered'
  AND verification.revoked_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.passport_verification_records(
  user_id, subject_type, subject_id, verification_state, label,
  source_type, source_key, public_details, issued_at
)
SELECT
  registration.user_id, 'event', registration.event_slug, 'mechi_verified',
  replace(initcap(replace(registration.event_slug, '-', ' ')), '_', ' ') || ' attendance',
  'online_tournament_registration', registration.id::text || ':checked_in',
  jsonb_build_object('event_key', registration.event_slug, 'stamp_type', 'checked_in', 'game', registration.game),
  registration.updated_at
FROM public.online_tournament_registrations registration
WHERE registration.check_in_status = 'checked_in'
ON CONFLICT DO NOTHING;

INSERT INTO public.passport_event_credentials(
  user_id, event_key, event_title, stamp_type, game, source_type, source_key,
  source_subject_id, verification_record_id, issued_at, occurred_at, public_details
)
SELECT
  registration.user_id, registration.event_slug,
  replace(initcap(replace(registration.event_slug, '-', ' ')), '_', ' '),
  'checked_in', registration.game, 'online_tournament_registration',
  registration.id::text || ':checked_in', registration.event_slug,
  verification.id, registration.updated_at, registration.updated_at,
  jsonb_build_object('event_slug', registration.event_slug, 'check_in_method', 'legacy_playmechi')
FROM public.online_tournament_registrations registration
JOIN public.passport_verification_records verification
  ON verification.user_id = registration.user_id
  AND verification.source_type = 'online_tournament_registration'
  AND verification.source_key = registration.id::text || ':checked_in'
  AND verification.revoked_at IS NULL
WHERE registration.check_in_status = 'checked_in'
ON CONFLICT DO NOTHING;

-- Authoritative placement backfill comes from finalized PlayMechi placement rows only.
INSERT INTO public.passport_verification_records(
  user_id, subject_type, subject_id, verification_state, label,
  source_type, source_key, public_details, issued_by, issued_at
)
SELECT
  registration.user_id, 'event', payout.event_slug, 'organizer_verified',
  replace(initcap(replace(payout.event_slug, '-', ' ')), '_', ' ') || ' placement ' || payout.placement,
  'online_tournament_placement', payout.id::text,
  jsonb_build_object('event_key', payout.event_slug, 'stamp_type', 'placement', 'game', payout.game, 'placement', payout.placement),
  payout.updated_by, payout.updated_at
FROM public.online_tournament_payouts payout
JOIN public.online_tournament_registrations registration ON registration.id = payout.registration_id
WHERE payout.registration_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.passport_event_credentials(
  user_id, event_key, event_title, stamp_type, game, placement, source_type, source_key,
  source_subject_id, verification_record_id, issued_by, issued_at, occurred_at, public_details
)
SELECT
  registration.user_id, payout.event_slug,
  replace(initcap(replace(payout.event_slug, '-', ' ')), '_', ' '),
  'placement', payout.game, payout.placement, 'online_tournament_placement', payout.id::text,
  payout.event_slug, verification.id, payout.updated_by, payout.updated_at, payout.updated_at,
  jsonb_build_object('event_slug', payout.event_slug, 'placement', payout.placement)
FROM public.online_tournament_payouts payout
JOIN public.online_tournament_registrations registration ON registration.id = payout.registration_id
JOIN public.passport_verification_records verification
  ON verification.user_id = registration.user_id
  AND verification.source_type = 'online_tournament_placement'
  AND verification.source_key = payout.id::text
  AND verification.revoked_at IS NULL
WHERE payout.registration_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.passport_cv_settings(user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Mechi V5 Gamer Passport Phase 5: activity, teams, and community identity.
-- Source tables remain authoritative. These are rebuildable, server-mediated projections.

CREATE TABLE IF NOT EXISTS public.passport_activity_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_game_completions boolean NOT NULL DEFAULT true,
  share_achievements boolean NOT NULL DEFAULT true,
  share_matches boolean NOT NULL DEFAULT true,
  share_events boolean NOT NULL DEFAULT true,
  share_teams boolean NOT NULL DEFAULT true,
  notify_reactions boolean NOT NULL DEFAULT true,
  notify_circle_updates boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.passport_activity_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  audience text NOT NULL DEFAULT 'public',
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  game text,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  verification_token uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL,
  hidden_by_actor boolean NOT NULL DEFAULT false,
  retracted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_activity_type_allowed CHECK (activity_type IN (
    'game_completed', 'achievement_unlocked', 'match_completed', 'event_credential',
    'team_joined', 'team_achievement', 'personal_highlight'
  )),
  CONSTRAINT passport_activity_source_allowed CHECK (source_type IN (
    'game_entry', 'achievement', 'match', 'event_credential', 'team_membership',
    'team_achievement', 'highlight'
  )),
  CONSTRAINT passport_activity_audience_allowed CHECK (audience IN ('public', 'friends', 'private')),
  CONSTRAINT passport_activity_title_length CHECK (char_length(title) BETWEEN 2 AND 160),
  CONSTRAINT passport_activity_summary_length CHECK (char_length(summary) <= 280),
  CONSTRAINT passport_activity_payload_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT passport_activity_source_unique UNIQUE (actor_id, activity_type, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.passport_activity_reactions (
  activity_id uuid NOT NULL REFERENCES public.passport_activity_objects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('gg', 'fire', 'clap', 'trophy')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (activity_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.passport_activity_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.passport_activity_objects(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('privacy', 'harassment', 'spam', 'misleading', 'other')),
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_activity_reports_details_length CHECK (char_length(details) <= 500),
  CONSTRAINT passport_activity_reports_unique UNIQUE (activity_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS public.passport_activity_reaction_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.passport_activity_objects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.passport_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('game_entry', 'achievement', 'match', 'event_credential', 'team')),
  source_id text NOT NULL,
  title text NOT NULL,
  caption text NOT NULL DEFAULT '',
  media_url text,
  media_consent boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  display_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_highlights_title_length CHECK (char_length(title) BETWEEN 2 AND 120),
  CONSTRAINT passport_highlights_caption_length CHECK (char_length(caption) <= 280),
  CONSTRAINT passport_highlights_media_consent CHECK (
    (media_url IS NULL) OR (media_consent AND media_url ~ '^https://')
  ),
  CONSTRAINT passport_highlights_unique_source UNIQUE (user_id, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.passport_gaming_circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_gaming_circles_name_length CHECK (char_length(name) BETWEEN 2 AND 60),
  CONSTRAINT passport_gaming_circles_description_length CHECK (char_length(description) <= 240)
);

CREATE TABLE IF NOT EXISTS public.passport_gaming_circle_members (
  circle_id uuid NOT NULL REFERENCES public.passport_gaming_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_passport_settings (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  supported_games text[] NOT NULL DEFAULT '{}',
  recruitment_status text NOT NULL DEFAULT 'closed' CHECK (recruitment_status IN ('open', 'selective', 'closed')),
  recruitment_headline text NOT NULL DEFAULT '',
  contact_url text,
  card_accent text NOT NULL DEFAULT '#32E0C4',
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT team_passport_games_limit CHECK (cardinality(supported_games) <= 12),
  CONSTRAINT team_passport_headline_length CHECK (char_length(recruitment_headline) <= 140),
  CONSTRAINT team_passport_contact_url CHECK (contact_url IS NULL OR contact_url ~ '^https://'),
  CONSTRAINT team_passport_accent CHECK (card_accent ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE IF NOT EXISTS public.team_passport_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  game text,
  source_type text NOT NULL CHECK (source_type IN ('tournament', 'match_series', 'organizer_manual', 'mechi_admin')),
  source_key text NOT NULL,
  issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'revoked')),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT team_passport_achievement_title_length CHECK (char_length(title) BETWEEN 2 AND 120),
  CONSTRAINT team_passport_achievement_description_length CHECK (char_length(description) <= 500),
  CONSTRAINT team_passport_achievement_source_unique UNIQUE (team_id, source_type, source_key),
  CONSTRAINT team_passport_achievement_revocation CHECK (
    (state = 'active' AND revoked_at IS NULL AND revocation_reason IS NULL)
    OR (state = 'revoked' AND revoked_at IS NOT NULL AND char_length(coalesce(revocation_reason, '')) BETWEEN 3 AND 300)
  )
);

CREATE INDEX IF NOT EXISTS passport_activity_actor_timeline_idx
  ON public.passport_activity_objects(actor_id, occurred_at DESC) WHERE retracted_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_activity_public_timeline_idx
  ON public.passport_activity_objects(occurred_at DESC) WHERE audience = 'public' AND hidden_by_actor = false AND retracted_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_activity_team_timeline_idx
  ON public.passport_activity_objects(team_id, occurred_at DESC) WHERE team_id IS NOT NULL AND retracted_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_activity_reactions_user_idx ON public.passport_activity_reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_activity_reports_status_idx ON public.passport_activity_reports(status, created_at ASC);
CREATE INDEX IF NOT EXISTS passport_activity_reports_reporter_idx ON public.passport_activity_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_activity_reaction_events_rate_idx ON public.passport_activity_reaction_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_activity_reaction_events_activity_idx ON public.passport_activity_reaction_events(activity_id);
CREATE INDEX IF NOT EXISTS passport_highlights_user_active_idx ON public.passport_highlights(user_id, display_order, created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS passport_gaming_circles_owner_idx ON public.passport_gaming_circles(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_circle_members_user_idx ON public.passport_gaming_circle_members(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS team_passport_achievements_team_idx ON public.team_passport_achievements(team_id, occurred_at DESC) WHERE state = 'active';
CREATE INDEX IF NOT EXISTS team_passport_achievements_issuer_idx ON public.team_passport_achievements(issued_by) WHERE issued_by IS NOT NULL;

DROP TRIGGER IF EXISTS passport_activity_preferences_set_updated_at ON public.passport_activity_preferences;
CREATE TRIGGER passport_activity_preferences_set_updated_at BEFORE UPDATE ON public.passport_activity_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_activity_objects_set_updated_at ON public.passport_activity_objects;
CREATE TRIGGER passport_activity_objects_set_updated_at BEFORE UPDATE ON public.passport_activity_objects
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_highlights_set_updated_at ON public.passport_highlights;
CREATE TRIGGER passport_highlights_set_updated_at BEFORE UPDATE ON public.passport_highlights
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_gaming_circles_set_updated_at ON public.passport_gaming_circles;
CREATE TRIGGER passport_gaming_circles_set_updated_at BEFORE UPDATE ON public.passport_gaming_circles
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS team_passport_settings_set_updated_at ON public.team_passport_settings;
CREATE TRIGGER team_passport_settings_set_updated_at BEFORE UPDATE ON public.team_passport_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS team_passport_achievements_set_updated_at ON public.team_passport_achievements;
CREATE TRIGGER team_passport_achievements_set_updated_at BEFORE UPDATE ON public.team_passport_achievements
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_activity_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_activity_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_activity_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_activity_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_activity_reaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_gaming_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_gaming_circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_passport_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_passport_achievements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.passport_activity_preferences, public.passport_activity_objects,
  public.passport_activity_reactions, public.passport_activity_reports, public.passport_activity_reaction_events,
  public.passport_highlights, public.passport_gaming_circles,
  public.passport_gaming_circle_members, public.team_passport_settings,
  public.team_passport_achievements
FROM anon, authenticated;
GRANT ALL ON TABLE
  public.passport_activity_preferences, public.passport_activity_objects,
  public.passport_activity_reactions, public.passport_activity_reports, public.passport_activity_reaction_events,
  public.passport_highlights, public.passport_gaming_circles,
  public.passport_gaming_circle_members, public.team_passport_settings,
  public.team_passport_achievements
TO service_role;
REVOKE ALL ON SEQUENCE public.passport_activity_reaction_events_id_seq FROM anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.passport_activity_reaction_events_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.set_passport_activity_reaction(
  p_activity_id uuid,
  p_user_id uuid,
  p_reaction text
)
RETURNS TABLE (reaction text, removed boolean)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_existing text;
  v_recent_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || ':passport-reaction'));
  IF p_reaction NOT IN ('gg', 'fire', 'clap', 'trophy') THEN RAISE EXCEPTION 'INVALID_REACTION'; END IF;
  SELECT count(*) INTO v_recent_count FROM public.passport_activity_reaction_events
    WHERE user_id = p_user_id AND created_at > timezone('utc', now()) - interval '60 seconds';
  IF v_recent_count >= 20 THEN RAISE EXCEPTION 'REACTION_RATE_LIMIT'; END IF;
  INSERT INTO public.passport_activity_reaction_events(activity_id, user_id) VALUES (p_activity_id, p_user_id);
  SELECT r.reaction INTO v_existing FROM public.passport_activity_reactions r
    WHERE r.activity_id = p_activity_id AND r.user_id = p_user_id FOR UPDATE;
  IF v_existing = p_reaction THEN
    DELETE FROM public.passport_activity_reactions WHERE activity_id = p_activity_id AND user_id = p_user_id;
    RETURN QUERY SELECT p_reaction, true;
  ELSE
    INSERT INTO public.passport_activity_reactions(activity_id, user_id, reaction)
    VALUES (p_activity_id, p_user_id, p_reaction)
    ON CONFLICT (activity_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction, created_at = timezone('utc', now());
    RETURN QUERY SELECT p_reaction, false;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_passport_activity_reaction(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_passport_activity_reaction(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.replace_passport_gaming_circle_members(
  p_circle_id uuid,
  p_owner_id uuid,
  p_member_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_count integer;
  v_friend_count integer;
BEGIN
  PERFORM 1 FROM public.passport_gaming_circles
    WHERE id = p_circle_id AND owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CIRCLE_NOT_FOUND'; END IF;
  SELECT count(DISTINCT ids.member_id) INTO v_count FROM unnest(p_member_ids) AS ids(member_id);
  IF v_count NOT BETWEEN 3 AND 8 OR NOT (p_owner_id = ANY(p_member_ids)) THEN
    RAISE EXCEPTION 'CIRCLE_SIZE_INVALID';
  END IF;
  SELECT count(*) INTO v_friend_count
  FROM (SELECT DISTINCT ids.member_id FROM unnest(p_member_ids) AS ids(member_id) WHERE ids.member_id <> p_owner_id) members
  WHERE EXISTS (
    SELECT 1 FROM public.passport_friendships friendship
    WHERE friendship.status = 'accepted'
      AND friendship.user_a_id = LEAST(p_owner_id, members.member_id)
      AND friendship.user_b_id = GREATEST(p_owner_id, members.member_id)
  );
  IF v_friend_count <> v_count - 1 THEN RAISE EXCEPTION 'CIRCLE_MEMBERS_MUST_BE_FRIENDS'; END IF;
  DELETE FROM public.passport_gaming_circle_members WHERE circle_id = p_circle_id;
  INSERT INTO public.passport_gaming_circle_members(circle_id, user_id, added_by, role)
  SELECT p_circle_id, member_id, p_owner_id, CASE WHEN member_id = p_owner_id THEN 'owner' ELSE 'member' END
  FROM (SELECT DISTINCT ids.member_id FROM unnest(p_member_ids) AS ids(member_id)) members;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_passport_gaming_circle_members(uuid, uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_passport_gaming_circle_members(uuid, uuid, uuid[]) TO service_role;

-- Seed settings and team Passport defaults. Activity objects are projected by
-- the application so current visibility rules are applied before publication.
INSERT INTO public.passport_activity_preferences(user_id)
SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.team_passport_settings(team_id, supported_games, recruitment_status)
SELECT team.id, coalesce((
  SELECT array_agg(DISTINCT roster.game ORDER BY roster.game)
  FROM public.team_roster_entries roster WHERE roster.team_id = team.id
), '{}'::text[]), CASE WHEN team.recruiting THEN 'open' ELSE 'closed' END
FROM public.teams team ON CONFLICT (team_id) DO NOTHING;

-- Safely project completed team-tournament champions as verified team achievements.
INSERT INTO public.team_passport_achievements(
  team_id, title, description, game, source_type, source_key, issued_by, occurred_at
)
SELECT entry.team_id, tournament.title || ' champions',
  'Verified Mechi tournament championship', tournament.game, 'tournament',
  tournament.id::text || ':champion', tournament.organizer_id,
  coalesce(tournament.ended_at, entry.joined_at)
FROM public.tournament_team_entries entry
JOIN public.tournaments tournament ON tournament.id = entry.tournament_id
WHERE tournament.status = 'completed'
  AND tournament.winner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.team_members member
    WHERE member.team_id = entry.team_id AND member.user_id = tournament.winner_id
  )
ON CONFLICT (team_id, source_type, source_key) DO NOTHING;

-- Mechi V5 Gamer Passport Phase 6: progression, customization, Replay, and growth products.
-- Source tables remain authoritative. Projections are server-mediated and rebuildable.

CREATE TABLE IF NOT EXISTS public.passport_dimension_snapshots (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  formula_version text NOT NULL DEFAULT 'v1',
  passport_level integer NOT NULL DEFAULT 1 CHECK (passport_level BETWEEN 1 AND 100),
  total_points integer NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  projected_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_dimensions_object CHECK (jsonb_typeof(dimensions) = 'object'),
  CONSTRAINT passport_dimension_sources_object CHECK (jsonb_typeof(source_counts) = 'object')
);

CREATE TABLE IF NOT EXISTS public.passport_achievement_definitions (
  achievement_key text PRIMARY KEY,
  family text NOT NULL CHECK (family IN ('competitive', 'library', 'completion', 'community', 'events', 'teams', 'annual', 'founder')),
  title text NOT NULL,
  description text NOT NULL,
  requirement_text text NOT NULL,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'limited')),
  trust_tier text NOT NULL DEFAULT 'personal' CHECK (trust_tier IN ('personal', 'mechi_verified', 'organizer_verified')),
  issuer_label text NOT NULL DEFAULT 'PlayMechi',
  source_types text[] NOT NULL DEFAULT '{}',
  limited_from timestamptz,
  limited_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_achievement_text_lengths CHECK (
    char_length(title) BETWEEN 2 AND 80
    AND char_length(description) BETWEEN 2 AND 240
    AND char_length(requirement_text) BETWEEN 2 AND 240
  ),
  CONSTRAINT passport_achievement_limited_window CHECK (
    rarity <> 'limited' OR (limited_from IS NOT NULL AND limited_until IS NOT NULL AND limited_until > limited_from)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_achievement_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL REFERENCES public.passport_achievement_definitions(achievement_key) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_key text NOT NULL,
  issuer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  revoked_at timestamptz,
  revocation_reason text,
  last_evaluated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_achievement_award_unique UNIQUE (user_id, achievement_key),
  CONSTRAINT passport_achievement_award_revocation CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL)
    OR (revoked_at IS NOT NULL AND char_length(coalesce(revocation_reason, '')) BETWEEN 3 AND 300)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_cosmetic_catalog (
  cosmetic_key text PRIMARY KEY,
  cosmetic_type text NOT NULL CHECK (cosmetic_type IN ('theme', 'avatar_frame', 'card_style')),
  label text NOT NULL,
  description text NOT NULL,
  required_plan text NOT NULL DEFAULT 'free' CHECK (required_plan IN ('free', 'pro', 'elite')),
  style_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_animated boolean NOT NULL DEFAULT false,
  performance_tier text NOT NULL DEFAULT 'light' CHECK (performance_tier IN ('light', 'moderate')),
  is_cosmetic boolean NOT NULL DEFAULT true CHECK (is_cosmetic = true),
  resembles_verification boolean NOT NULL DEFAULT false CHECK (resembles_verification = false),
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_cosmetic_tokens_object CHECK (jsonb_typeof(style_tokens) = 'object'),
  CONSTRAINT passport_cosmetic_text_lengths CHECK (char_length(label) BETWEEN 2 AND 60 AND char_length(description) BETWEEN 2 AND 180)
);

CREATE TABLE IF NOT EXISTS public.passport_customizations (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme_key text NOT NULL DEFAULT 'mechi_core' REFERENCES public.passport_cosmetic_catalog(cosmetic_key) ON DELETE RESTRICT,
  avatar_frame_key text NOT NULL DEFAULT 'frame_none' REFERENCES public.passport_cosmetic_catalog(cosmetic_key) ON DELETE RESTRICT,
  card_style_key text NOT NULL DEFAULT 'card_core' REFERENCES public.passport_cosmetic_catalog(cosmetic_key) ON DELETE RESTRICT,
  show_dimensions boolean NOT NULL DEFAULT true,
  show_level boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.passport_showcase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 9),
  source_type text NOT NULL CHECK (source_type IN ('highlight', 'achievement_award', 'event_credential', 'team_achievement', 'game_entry')),
  source_id text NOT NULL,
  label text NOT NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_showcase_user_slot_unique UNIQUE (user_id, slot),
  CONSTRAINT passport_showcase_user_source_unique UNIQUE (user_id, source_type, source_id),
  CONSTRAINT passport_showcase_label_length CHECK (char_length(label) BETWEEN 2 AND 100)
);

CREATE TABLE IF NOT EXISTS public.passport_custom_shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'friends', 'private')),
  display_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_shelf_title_length CHECK (char_length(title) BETWEEN 2 AND 60),
  CONSTRAINT passport_shelf_description_length CHECK (char_length(description) <= 180)
);

CREATE TABLE IF NOT EXISTS public.passport_custom_shelf_items (
  shelf_id uuid NOT NULL REFERENCES public.passport_custom_shelves(id) ON DELETE CASCADE,
  game_entry_id uuid NOT NULL REFERENCES public.passport_game_entries(id) ON DELETE CASCADE,
  display_order smallint NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (shelf_id, game_entry_id)
);

CREATE TABLE IF NOT EXISTS public.passport_replay_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  replay_year integer NOT NULL CHECK (replay_year BETWEEN 2020 AND 2200),
  formula_version text NOT NULL DEFAULT 'v1',
  period_state text NOT NULL CHECK (period_state IN ('year_to_date', 'final')),
  payload jsonb NOT NULL,
  source_cutoff_at timestamptz NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_replay_user_year_unique UNIQUE (user_id, replay_year),
  CONSTRAINT passport_replay_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE TABLE IF NOT EXISTS public.passport_media_kit_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  headline text NOT NULL DEFAULT '',
  creator_roles text[] NOT NULL DEFAULT '{}',
  inquiry_url text,
  include_dimensions boolean NOT NULL DEFAULT true,
  include_events boolean NOT NULL DEFAULT true,
  include_teams boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_media_kit_headline_length CHECK (char_length(headline) <= 140),
  CONSTRAINT passport_media_kit_roles_limit CHECK (cardinality(creator_roles) <= 8),
  CONSTRAINT passport_media_kit_url_https CHECK (inquiry_url IS NULL OR inquiry_url ~ '^https://')
);

CREATE INDEX IF NOT EXISTS passport_achievement_awards_user_active_idx ON public.passport_achievement_awards(user_id, issued_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_achievement_awards_definition_idx ON public.passport_achievement_awards(achievement_key, issued_at DESC);
CREATE INDEX IF NOT EXISTS passport_achievement_awards_issuer_idx ON public.passport_achievement_awards(issuer_id) WHERE issuer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_cosmetic_catalog_active_idx ON public.passport_cosmetic_catalog(cosmetic_type, required_plan, sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS passport_showcase_user_visibility_idx ON public.passport_showcase_items(user_id, visibility, slot);
CREATE INDEX IF NOT EXISTS passport_shelves_user_order_idx ON public.passport_custom_shelves(user_id, display_order, created_at);
CREATE INDEX IF NOT EXISTS passport_shelf_items_game_entry_idx ON public.passport_custom_shelf_items(game_entry_id);
CREATE INDEX IF NOT EXISTS passport_replay_user_year_idx ON public.passport_replay_snapshots(user_id, replay_year DESC);
CREATE INDEX IF NOT EXISTS passport_replay_public_idx ON public.passport_replay_snapshots(share_token) WHERE is_public = true;

DROP TRIGGER IF EXISTS passport_customizations_set_updated_at ON public.passport_customizations;
CREATE TRIGGER passport_customizations_set_updated_at BEFORE UPDATE ON public.passport_customizations FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_showcase_items_set_updated_at ON public.passport_showcase_items;
CREATE TRIGGER passport_showcase_items_set_updated_at BEFORE UPDATE ON public.passport_showcase_items FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_custom_shelves_set_updated_at ON public.passport_custom_shelves;
CREATE TRIGGER passport_custom_shelves_set_updated_at BEFORE UPDATE ON public.passport_custom_shelves FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_replay_snapshots_set_updated_at ON public.passport_replay_snapshots;
CREATE TRIGGER passport_replay_snapshots_set_updated_at BEFORE UPDATE ON public.passport_replay_snapshots FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_media_kit_settings_set_updated_at ON public.passport_media_kit_settings;
CREATE TRIGGER passport_media_kit_settings_set_updated_at BEFORE UPDATE ON public.passport_media_kit_settings FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_dimension_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_achievement_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_cosmetic_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_showcase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_custom_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_custom_shelf_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_replay_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_media_kit_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.passport_dimension_snapshots, public.passport_achievement_definitions,
  public.passport_achievement_awards, public.passport_cosmetic_catalog, public.passport_customizations,
  public.passport_showcase_items, public.passport_custom_shelves, public.passport_custom_shelf_items,
  public.passport_replay_snapshots, public.passport_media_kit_settings FROM anon, authenticated;
GRANT ALL ON TABLE public.passport_dimension_snapshots, public.passport_achievement_definitions,
  public.passport_achievement_awards, public.passport_cosmetic_catalog, public.passport_customizations,
  public.passport_showcase_items, public.passport_custom_shelves, public.passport_custom_shelf_items,
  public.passport_replay_snapshots, public.passport_media_kit_settings TO service_role;

INSERT INTO public.passport_cosmetic_catalog(cosmetic_key, cosmetic_type, label, description, required_plan, style_tokens, is_animated, performance_tier, sort_order) VALUES
  ('mechi_core', 'theme', 'Mechi Core', 'The free PlayMechi identity theme.', 'free', '{"background":"#071018","surface":"#0e1927","accent":"#32E0C4"}', false, 'light', 10),
  ('midnight_grid', 'theme', 'Midnight Grid', 'A free deep-blue grid-inspired theme.', 'free', '{"background":"#07111F","surface":"#101D31","accent":"#5EA4FF"}', false, 'light', 20),
  ('neon_arena', 'theme', 'Neon Arena', 'A Pro neon arena cosmetic theme.', 'pro', '{"background":"#080712","surface":"#17102B","accent":"#D35CFF"}', true, 'moderate', 30),
  ('golden_hour', 'theme', 'Golden Hour', 'An Elite warm-gold cosmetic theme.', 'elite', '{"background":"#151006","surface":"#251B0A","accent":"#F6C453"}', true, 'moderate', 40),
  ('frame_none', 'avatar_frame', 'No Frame', 'Clean avatar presentation.', 'free', '{"ring":"transparent","width":0}', false, 'light', 10),
  ('frame_teal', 'avatar_frame', 'Teal Circuit', 'A cosmetic teal circuit frame.', 'pro', '{"ring":"#32E0C4","width":4}', false, 'light', 20),
  ('frame_gold', 'avatar_frame', 'Gold Orbit', 'A cosmetic Elite gold orbit frame.', 'elite', '{"ring":"#F6C453","width":5}', true, 'moderate', 30),
  ('card_core', 'card_style', 'Core Card', 'The standard free Gamer Card.', 'free', '{"pattern":"core","accent":"inherit"}', false, 'light', 10),
  ('card_signal', 'card_style', 'Signal Card', 'A Pro signal-line Gamer Card.', 'pro', '{"pattern":"signal","accent":"inherit"}', false, 'light', 20),
  ('card_aurora', 'card_style', 'Aurora Card', 'An Elite animated-preview card style.', 'elite', '{"pattern":"aurora","accent":"inherit"}', true, 'moderate', 30)
ON CONFLICT (cosmetic_key) DO NOTHING;

INSERT INTO public.passport_achievement_definitions(achievement_key, family, title, description, requirement_text, rarity, trust_tier, source_types) VALUES
  ('passport_library_started', 'library', 'Library Started', 'The first title entered into a Gamer Passport.', 'Add at least one game to your Passport library.', 'common', 'personal', ARRAY['game_entry']),
  ('passport_library_five', 'library', 'Five Worlds', 'A library spanning at least five games.', 'Add five distinct games to your Passport library.', 'uncommon', 'personal', ARRAY['game_entry']),
  ('passport_first_completion', 'completion', 'Credits Rolled', 'The first completed game recorded on the Passport.', 'Mark one game completed.', 'common', 'personal', ARRAY['game_entry']),
  ('passport_completion_five', 'completion', 'Completion Shelf', 'Five completed games in one gaming identity.', 'Complete five distinct games.', 'rare', 'personal', ARRAY['game_entry']),
  ('passport_first_verified_match', 'competitive', 'Verified Challenger', 'A completed Mechi match backed by platform records.', 'Complete one verified Mechi match.', 'common', 'mechi_verified', ARRAY['match']),
  ('passport_ten_verified_matches', 'competitive', 'Arena Regular', 'Ten completed Mechi matches backed by platform records.', 'Complete ten verified Mechi matches.', 'uncommon', 'mechi_verified', ARRAY['match']),
  ('passport_first_event', 'events', 'Checked In', 'A verified physical or online event presence record.', 'Receive one active checked-in, attended, competed, placement, staff, organizer, or streamer credential.', 'uncommon', 'organizer_verified', ARRAY['event_credential']),
  ('passport_event_regular', 'events', 'Event Regular', 'Three verified event-presence credentials.', 'Receive active presence credentials for three distinct events.', 'rare', 'organizer_verified', ARRAY['event_credential']),
  ('passport_team_player', 'teams', 'Squad Identity', 'An active role on a Mechi team.', 'Join an active Mechi team.', 'common', 'mechi_verified', ARRAY['team_membership']),
  ('passport_connector', 'community', 'Connector', 'A trusted circle of accepted gaming friends.', 'Build five accepted Mechi friendships.', 'uncommon', 'mechi_verified', ARRAY['friendship']),
  ('passport_2026_replay', 'annual', '2026 Replay', 'A generated 2026 PlayMechi Replay snapshot.', 'Generate a 2026 Replay from eligible source history.', 'rare', 'mechi_verified', ARRAY['replay'])
ON CONFLICT (achievement_key) DO NOTHING;

UPDATE public.passport_achievement_definitions SET rarity = 'limited', limited_from = '2026-01-01T00:00:00Z', limited_until = '2027-01-31T23:59:59Z'
WHERE achievement_key = 'passport_2026_replay';

INSERT INTO public.passport_customizations(user_id)
SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.passport_media_kit_settings(user_id)
SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;

-- Mechi V5 Gamer Passport Phase 7: platform connections and ecosystem scale.
-- All provider calls, token operations, imports, and scoped API reads are server-mediated.

CREATE TABLE IF NOT EXISTS public.passport_provider_catalog (
  provider_key text PRIMARY KEY,
  label text NOT NULL,
  connection_method text NOT NULL CHECK (connection_method IN ('openid', 'oauth2', 'api_key', 'manual_verification')),
  capability_scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('available', 'planned', 'paused', 'retired')),
  attribution_label text NOT NULL,
  terms_url text,
  privacy_url text,
  cache_ttl_seconds integer NOT NULL DEFAULT 3600 CHECK (cache_ttl_seconds BETWEEN 60 AND 604800),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_provider_key_format CHECK (provider_key ~ '^[a-z][a-z0-9_]{1,31}$'),
  CONSTRAINT passport_provider_urls_https CHECK (
    (terms_url IS NULL OR terms_url ~ '^https://') AND (privacy_url IS NULL OR privacy_url ~ '^https://')
  )
);

CREATE TABLE IF NOT EXISTS public.passport_provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_key text NOT NULL REFERENCES public.passport_provider_catalog(provider_key) ON DELETE RESTRICT,
  provider_account_id text NOT NULL,
  account_label text NOT NULL DEFAULT '',
  account_url text,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'syncing', 'error', 'reauthorization_required', 'revoked')),
  granted_scopes text[] NOT NULL DEFAULT '{}',
  encrypted_access_token text,
  encrypted_refresh_token text,
  secret_version smallint NOT NULL DEFAULT 1 CHECK (secret_version BETWEEN 1 AND 100),
  token_expires_at timestamptz,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_sync_started_at timestamptz,
  last_synced_at timestamptz,
  last_sync_status text NOT NULL DEFAULT 'never' CHECK (last_sync_status IN ('never', 'running', 'success', 'partial', 'error')),
  last_error_code text,
  last_error_message text,
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_provider_connection_user_unique UNIQUE (user_id, provider_key),
  CONSTRAINT passport_provider_account_unique UNIQUE (provider_key, provider_account_id),
  CONSTRAINT passport_provider_account_url_https CHECK (account_url IS NULL OR account_url ~ '^https://'),
  CONSTRAINT passport_provider_connection_metadata_object CHECK (jsonb_typeof(provider_metadata) = 'object'),
  CONSTRAINT passport_provider_connection_encrypted_tokens CHECK (
    (encrypted_access_token IS NULL OR encrypted_access_token ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$')
    AND (encrypted_refresh_token IS NULL OR encrypted_refresh_token ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$')
  ),
  CONSTRAINT passport_provider_connection_revocation CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL AND encrypted_access_token IS NULL AND encrypted_refresh_token IS NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_connection_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_key text NOT NULL REFERENCES public.passport_provider_catalog(provider_key) ON DELETE CASCADE,
  state_hash text NOT NULL UNIQUE,
  requested_scopes text[] NOT NULL DEFAULT '{}',
  return_path text NOT NULL DEFAULT '/passport/connections',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_connection_state_hash_format CHECK (state_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT passport_connection_return_path CHECK (return_path ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  CONSTRAINT passport_connection_intent_expiry CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.passport_provider_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.passport_provider_connections(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'error', 'cancelled')),
  provider_cursor text,
  fetched_count integer NOT NULL DEFAULT 0 CHECK (fetched_count >= 0),
  staged_count integer NOT NULL DEFAULT 0 CHECK (staged_count >= 0),
  changed_count integer NOT NULL DEFAULT 0 CHECK (changed_count >= 0),
  removed_count integer NOT NULL DEFAULT 0 CHECK (removed_count >= 0),
  error_code text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  CONSTRAINT passport_provider_sync_idempotent UNIQUE (connection_id, idempotency_key),
  CONSTRAINT passport_provider_sync_completion CHECK ((status = 'running' AND completed_at IS NULL) OR (status <> 'running' AND completed_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.passport_external_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.passport_provider_connections(id) ON DELETE CASCADE,
  provider_item_type text NOT NULL CHECK (provider_item_type IN ('game', 'achievement', 'play_history', 'creator_channel', 'event')),
  provider_item_id text NOT NULL,
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text NOT NULL,
  remote_updated_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  import_state text NOT NULL DEFAULT 'staged' CHECK (import_state IN ('staged', 'imported', 'hidden', 'conflict', 'remote_removed')),
  matched_catalog_game_id uuid REFERENCES public.passport_game_catalog(id) ON DELETE SET NULL,
  passport_game_entry_id uuid REFERENCES public.passport_game_entries(id) ON DELETE SET NULL,
  conflict_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_external_item_unique UNIQUE (connection_id, provider_item_type, provider_item_id),
  CONSTRAINT passport_external_item_payload_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT passport_external_item_conflict_object CHECK (jsonb_typeof(conflict_details) = 'object'),
  CONSTRAINT passport_external_item_payload_hash_format CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT passport_external_item_state_dates CHECK (
    (import_state <> 'imported' OR imported_at IS NOT NULL)
    AND (import_state <> 'hidden' OR hidden_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_import_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_item_id uuid NOT NULL REFERENCES public.passport_external_items(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('staged', 'accepted', 'merged', 'hidden', 'restored', 'remote_removed', 'connection_erased')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_import_event_details_object CHECK (jsonb_typeof(details) = 'object')
);

CREATE TABLE IF NOT EXISTS public.passport_developer_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  rate_limit_per_hour integer NOT NULL DEFAULT 120 CHECK (rate_limit_per_hour BETWEEN 10 AND 1000),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_developer_token_label_length CHECK (char_length(label) BETWEEN 2 AND 60),
  CONSTRAINT passport_developer_token_prefix_format CHECK (token_prefix ~ '^mcp_[A-Za-z0-9_-]{8}$'),
  CONSTRAINT passport_developer_token_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT passport_developer_token_scopes CHECK (scopes <@ ARRAY['passport.summary:read', 'passport.games:read', 'passport.competition:read', 'passport.events:read', 'passport.achievements:read', 'webhooks:manage']::text[])
);

CREATE TABLE IF NOT EXISTS public.passport_developer_api_events (
  id bigserial PRIMARY KEY,
  token_id uuid NOT NULL REFERENCES public.passport_developer_tokens(id) ON DELETE CASCADE,
  request_fingerprint text NOT NULL,
  route_key text NOT NULL,
  response_status smallint NOT NULL CHECK (response_status BETWEEN 100 AND 599),
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.passport_ecosystem_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('passport.updated', 'game.imported', 'achievement.issued', 'achievement.revoked', 'event.credential_issued', 'event.credential_revoked')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_ecosystem_event_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE TABLE IF NOT EXISTS public.passport_webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  developer_token_id uuid NOT NULL REFERENCES public.passport_developer_tokens(id) ON DELETE CASCADE,
  endpoint_url text NOT NULL,
  encrypted_signing_secret text NOT NULL,
  event_types text[] NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_webhook_endpoint_https CHECK (endpoint_url ~ '^https://'),
  CONSTRAINT passport_webhook_secret_encrypted CHECK (encrypted_signing_secret ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  CONSTRAINT passport_webhook_event_types CHECK (event_types <@ ARRAY['passport.updated', 'game.imported', 'achievement.issued', 'achievement.revoked', 'event.credential_issued', 'event.credential_revoked']::text[]),
  CONSTRAINT passport_webhook_user_endpoint_unique UNIQUE (user_id, endpoint_url)
);

CREATE TABLE IF NOT EXISTS public.passport_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.passport_webhook_subscriptions(id) ON DELETE CASCADE,
  ecosystem_event_id uuid NOT NULL REFERENCES public.passport_ecosystem_events(id) ON DELETE CASCADE,
  attempt smallint NOT NULL DEFAULT 1 CHECK (attempt BETWEEN 1 AND 10),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivering', 'delivered', 'retry', 'failed', 'cancelled')),
  response_status smallint CHECK (response_status BETWEEN 100 AND 599),
  response_excerpt text,
  next_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_webhook_delivery_attempt_unique UNIQUE (subscription_id, ecosystem_event_id, attempt),
  CONSTRAINT passport_webhook_response_excerpt_length CHECK (char_length(coalesce(response_excerpt, '')) <= 500)
);

CREATE TABLE IF NOT EXISTS public.passport_partner_issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  organization_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  allowed_scopes text[] NOT NULL DEFAULT '{}',
  allowed_event_keys text[] NOT NULL DEFAULT '{}',
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_partner_name_length CHECK (char_length(organization_name) BETWEEN 2 AND 100),
  CONSTRAINT passport_partner_scopes CHECK (allowed_scopes <@ ARRAY['event_credentials:issue', 'event_credentials:revoke', 'achievements:issue', 'webhooks:receive']::text[]),
  CONSTRAINT passport_partner_approval_state CHECK ((status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR status <> 'approved')
);

CREATE TABLE IF NOT EXISTS public.passport_partner_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_issuer_id uuid NOT NULL REFERENCES public.passport_partner_issuers(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_partner_key_prefix_format CHECK (key_prefix ~ '^mpk_[A-Za-z0-9_-]{8}$'),
  CONSTRAINT passport_partner_key_hash_format CHECK (key_hash ~ '^[0-9a-f]{64}$')
);

CREATE TABLE IF NOT EXISTS public.passport_partner_issuance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_issuer_id uuid NOT NULL REFERENCES public.passport_partner_issuers(id) ON DELETE CASCADE,
  partner_api_key_id uuid NOT NULL REFERENCES public.passport_partner_api_keys(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  subject_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issuance_type text NOT NULL CHECK (issuance_type IN ('event_credential', 'achievement')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'issued', 'revoked')),
  issued_credential_id uuid REFERENCES public.passport_event_credentials(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_partner_issuance_idempotent UNIQUE (partner_issuer_id, idempotency_key),
  CONSTRAINT passport_partner_issuance_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS passport_provider_connections_user_status_idx ON public.passport_provider_connections(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS passport_connection_intents_user_expiry_idx ON public.passport_connection_intents(user_id, expires_at DESC) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_provider_sync_runs_connection_started_idx ON public.passport_provider_sync_runs(connection_id, started_at DESC);
CREATE INDEX IF NOT EXISTS passport_external_items_connection_state_idx ON public.passport_external_items(connection_id, import_state, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS passport_external_items_catalog_idx ON public.passport_external_items(matched_catalog_game_id) WHERE matched_catalog_game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_external_items_entry_idx ON public.passport_external_items(passport_game_entry_id) WHERE passport_game_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_import_events_user_created_idx ON public.passport_import_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_import_events_external_item_idx ON public.passport_import_events(external_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_developer_tokens_user_active_idx ON public.passport_developer_tokens(user_id, created_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_developer_api_events_token_time_idx ON public.passport_developer_api_events(token_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS passport_ecosystem_events_user_time_idx ON public.passport_ecosystem_events(user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_ecosystem_events_type_time_idx ON public.passport_ecosystem_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS passport_webhook_subscriptions_token_idx ON public.passport_webhook_subscriptions(developer_token_id);
CREATE INDEX IF NOT EXISTS passport_webhook_subscriptions_active_events_idx ON public.passport_webhook_subscriptions USING gin(event_types) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS passport_webhook_deliveries_pending_idx ON public.passport_webhook_deliveries(next_attempt_at, created_at) WHERE status IN ('pending', 'retry');
CREATE INDEX IF NOT EXISTS passport_webhook_deliveries_event_idx ON public.passport_webhook_deliveries(ecosystem_event_id);
CREATE INDEX IF NOT EXISTS passport_partner_issuers_owner_idx ON public.passport_partner_issuers(owner_user_id, status);
CREATE INDEX IF NOT EXISTS passport_partner_issuers_approver_idx ON public.passport_partner_issuers(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_partner_api_keys_issuer_idx ON public.passport_partner_api_keys(partner_issuer_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_partner_issuance_subject_idx ON public.passport_partner_issuance_requests(subject_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_partner_issuance_key_idx ON public.passport_partner_issuance_requests(partner_api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_partner_issuance_review_idx ON public.passport_partner_issuance_requests(status, created_at) WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS passport_partner_issuance_credential_idx ON public.passport_partner_issuance_requests(issued_credential_id) WHERE issued_credential_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_partner_issuance_reviewer_idx ON public.passport_partner_issuance_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;

DROP TRIGGER IF EXISTS passport_provider_catalog_set_updated_at ON public.passport_provider_catalog;
CREATE TRIGGER passport_provider_catalog_set_updated_at BEFORE UPDATE ON public.passport_provider_catalog FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_provider_connections_set_updated_at ON public.passport_provider_connections;
CREATE TRIGGER passport_provider_connections_set_updated_at BEFORE UPDATE ON public.passport_provider_connections FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_external_items_set_updated_at ON public.passport_external_items;
CREATE TRIGGER passport_external_items_set_updated_at BEFORE UPDATE ON public.passport_external_items FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_webhook_subscriptions_set_updated_at ON public.passport_webhook_subscriptions;
CREATE TRIGGER passport_webhook_subscriptions_set_updated_at BEFORE UPDATE ON public.passport_webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_webhook_deliveries_set_updated_at ON public.passport_webhook_deliveries;
CREATE TRIGGER passport_webhook_deliveries_set_updated_at BEFORE UPDATE ON public.passport_webhook_deliveries FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_partner_issuers_set_updated_at ON public.passport_partner_issuers;
CREATE TRIGGER passport_partner_issuers_set_updated_at BEFORE UPDATE ON public.passport_partner_issuers FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_partner_issuance_requests_set_updated_at ON public.passport_partner_issuance_requests;
CREATE TRIGGER passport_partner_issuance_requests_set_updated_at BEFORE UPDATE ON public.passport_partner_issuance_requests FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_provider_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_connection_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_provider_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_external_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_import_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_developer_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_developer_api_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_ecosystem_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_partner_issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_partner_issuance_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.passport_provider_catalog, public.passport_provider_connections,
  public.passport_connection_intents, public.passport_provider_sync_runs, public.passport_external_items,
  public.passport_import_events, public.passport_developer_tokens, public.passport_developer_api_events,
  public.passport_ecosystem_events, public.passport_webhook_subscriptions, public.passport_webhook_deliveries,
  public.passport_partner_issuers, public.passport_partner_api_keys, public.passport_partner_issuance_requests
FROM anon, authenticated;
GRANT ALL ON TABLE public.passport_provider_catalog, public.passport_provider_connections,
  public.passport_connection_intents, public.passport_provider_sync_runs, public.passport_external_items,
  public.passport_import_events, public.passport_developer_tokens, public.passport_developer_api_events,
  public.passport_ecosystem_events, public.passport_webhook_subscriptions, public.passport_webhook_deliveries,
  public.passport_partner_issuers, public.passport_partner_api_keys, public.passport_partner_issuance_requests
TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.passport_developer_api_events_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.consume_passport_developer_api_request(
  p_token_hash text,
  p_route_key text,
  p_request_fingerprint text
) RETURNS TABLE (
  outcome text,
  token_id uuid,
  user_id uuid,
  granted_scopes text[],
  event_id bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_token public.passport_developer_tokens%ROWTYPE;
  v_recent integer;
BEGIN
  SELECT * INTO v_token
  FROM public.passport_developer_tokens token
  WHERE token.token_hash = p_token_hash
    AND token.revoked_at IS NULL
    AND (token.expires_at IS NULL OR token.expires_at > timezone('utc', now()))
  FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::uuid, '{}'::text[], NULL::bigint; RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_token.id::text, 0));
  SELECT count(*) INTO v_recent FROM public.passport_developer_api_events event
  WHERE event.token_id = v_token.id AND event.occurred_at >= timezone('utc', now()) - interval '1 hour';
  IF v_recent >= v_token.rate_limit_per_hour THEN RETURN QUERY SELECT 'rate_limited'::text, v_token.id, v_token.user_id, v_token.scopes, NULL::bigint; RETURN; END IF;
  INSERT INTO public.passport_developer_api_events(token_id, request_fingerprint, route_key, response_status)
  VALUES (v_token.id, left(p_request_fingerprint, 64), left(p_route_key, 100), 102)
  RETURNING id INTO event_id;
  UPDATE public.passport_developer_tokens SET last_used_at = timezone('utc', now()) WHERE id = v_token.id;
  RETURN QUERY SELECT 'allowed'::text, v_token.id, v_token.user_id, v_token.scopes, event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_passport_developer_api_request(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_passport_developer_api_request(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_passport_webhook_deliveries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.passport_webhook_deliveries(subscription_id, ecosystem_event_id, next_attempt_at)
  SELECT subscription.id, NEW.id, timezone('utc', now())
  FROM public.passport_webhook_subscriptions subscription
  WHERE subscription.user_id = NEW.user_id
    AND subscription.status = 'active'
    AND subscription.event_types @> ARRAY[NEW.event_type]::text[]
  ON CONFLICT (subscription_id, ecosystem_event_id, attempt) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_passport_webhook_deliveries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_passport_webhook_deliveries() TO service_role;
DROP TRIGGER IF EXISTS passport_ecosystem_events_queue_webhooks ON public.passport_ecosystem_events;
CREATE TRIGGER passport_ecosystem_events_queue_webhooks AFTER INSERT ON public.passport_ecosystem_events FOR EACH ROW EXECUTE FUNCTION public.queue_passport_webhook_deliveries();

CREATE OR REPLACE FUNCTION public.project_passport_profile_ecosystem_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.passport_ecosystem_events(event_key, user_id, event_type, payload, occurred_at)
  VALUES (
    'passport.updated:' || NEW.user_id::text || ':' || extract(epoch from NEW.updated_at)::bigint::text,
    NEW.user_id,
    'passport.updated',
    '{}'::jsonb,
    NEW.updated_at
  )
  ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.project_passport_profile_ecosystem_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_passport_profile_ecosystem_event() TO service_role;
DROP TRIGGER IF EXISTS passport_profiles_ecosystem_event ON public.passport_profiles;
CREATE TRIGGER passport_profiles_ecosystem_event AFTER UPDATE ON public.passport_profiles FOR EACH ROW EXECUTE FUNCTION public.project_passport_profile_ecosystem_event();

CREATE OR REPLACE FUNCTION public.project_passport_achievement_ecosystem_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_type text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.revoked_at IS NOT DISTINCT FROM NEW.revoked_at THEN RETURN NEW; END IF;
  v_type := CASE WHEN NEW.revoked_at IS NULL THEN 'achievement.issued' ELSE 'achievement.revoked' END;
  INSERT INTO public.passport_ecosystem_events(event_key, user_id, event_type, payload, occurred_at)
  VALUES (v_type || ':' || NEW.id::text || ':' || extract(epoch from coalesce(NEW.revoked_at, NEW.last_evaluated_at))::bigint::text,
    NEW.user_id, v_type, jsonb_build_object('achievement_key', NEW.achievement_key, 'award_id', NEW.id),
    coalesce(NEW.revoked_at, NEW.issued_at))
  ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.project_passport_achievement_ecosystem_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_passport_achievement_ecosystem_event() TO service_role;
DROP TRIGGER IF EXISTS passport_achievement_awards_ecosystem_event ON public.passport_achievement_awards;
CREATE TRIGGER passport_achievement_awards_ecosystem_event AFTER INSERT OR UPDATE OF revoked_at ON public.passport_achievement_awards FOR EACH ROW EXECUTE FUNCTION public.project_passport_achievement_ecosystem_event();

CREATE OR REPLACE FUNCTION public.project_passport_credential_ecosystem_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_type text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.credential_state IS NOT DISTINCT FROM NEW.credential_state THEN RETURN NEW; END IF;
  v_type := CASE WHEN NEW.credential_state = 'active' THEN 'event.credential_issued' ELSE 'event.credential_revoked' END;
  INSERT INTO public.passport_ecosystem_events(event_key, user_id, event_type, payload, occurred_at)
  VALUES (v_type || ':' || NEW.id::text || ':' || extract(epoch from coalesce(NEW.revoked_at, NEW.issued_at))::bigint::text,
    NEW.user_id, v_type, jsonb_build_object('credential_id', NEW.id, 'event_key', NEW.event_key, 'stamp_type', NEW.stamp_type),
    coalesce(NEW.revoked_at, NEW.issued_at))
  ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.project_passport_credential_ecosystem_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_passport_credential_ecosystem_event() TO service_role;
DROP TRIGGER IF EXISTS passport_event_credentials_ecosystem_event ON public.passport_event_credentials;
CREATE TRIGGER passport_event_credentials_ecosystem_event AFTER INSERT OR UPDATE OF credential_state ON public.passport_event_credentials FOR EACH ROW EXECUTE FUNCTION public.project_passport_credential_ecosystem_event();

INSERT INTO public.passport_provider_catalog(provider_key, label, connection_method, capability_scopes, status, attribution_label, terms_url, privacy_url, cache_ttl_seconds) VALUES
  ('steam', 'Steam', 'openid', ARRAY['identity:read', 'library:read', 'play_history:read'], 'available', 'Data provided by Steam', 'https://store.steampowered.com/subscriber_agreement/', 'https://store.steampowered.com/privacy_agreement/', 3600),
  ('twitch', 'Twitch', 'oauth2', ARRAY['identity:read', 'creator_channel:read'], 'planned', 'Data provided by Twitch', 'https://www.twitch.tv/p/en/legal/terms-of-service/', 'https://www.twitch.tv/p/en/legal/privacy-notice/', 3600),
  ('youtube', 'YouTube', 'oauth2', ARRAY['identity:read', 'creator_channel:read'], 'planned', 'Data provided by YouTube', 'https://www.youtube.com/t/terms', 'https://policies.google.com/privacy', 3600),
  ('xbox', 'Xbox', 'oauth2', ARRAY['identity:read', 'library:read', 'achievements:read'], 'planned', 'Data provided by Xbox', 'https://www.microsoft.com/servicesagreement', 'https://privacy.microsoft.com/privacystatement', 3600),
  ('psn', 'PlayStation Network', 'oauth2', ARRAY['identity:read', 'library:read', 'achievements:read'], 'planned', 'Data provided by PlayStation', 'https://www.playstation.com/legal/psn-terms-of-service/', 'https://www.playstation.com/legal/privacy-policy/', 3600),
  ('nintendo', 'Nintendo Account', 'oauth2', ARRAY['identity:read'], 'planned', 'Data provided by Nintendo', 'https://accounts.nintendo.com/term/eula/', 'https://www.nintendo.com/privacy-policy/', 3600)
ON CONFLICT (provider_key) DO UPDATE SET
  label = EXCLUDED.label,
  connection_method = EXCLUDED.connection_method,
  capability_scopes = EXCLUDED.capability_scopes,
  status = EXCLUDED.status,
  attribution_label = EXCLUDED.attribution_label,
  terms_url = EXCLUDED.terms_url,
  privacy_url = EXCLUDED.privacy_url,
  cache_ttl_seconds = EXCLUDED.cache_ttl_seconds;

-- Mechi V5 Gamer Passport Phase 8: launch readiness and controlled operations.
-- Queue claiming and finalization are transactional; external HTTP remains in the app worker.

ALTER TABLE public.passport_webhook_deliveries
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS error_code text;

ALTER TABLE public.passport_webhook_deliveries
  DROP CONSTRAINT IF EXISTS passport_webhook_delivery_duration_range;
ALTER TABLE public.passport_webhook_deliveries
  ADD CONSTRAINT passport_webhook_delivery_duration_range
  CHECK (duration_ms IS NULL OR duration_ms BETWEEN 0 AND 60000);

ALTER TABLE public.passport_webhook_deliveries
  DROP CONSTRAINT IF EXISTS passport_webhook_delivery_error_code_length;
ALTER TABLE public.passport_webhook_deliveries
  ADD CONSTRAINT passport_webhook_delivery_error_code_length
  CHECK (error_code IS NULL OR char_length(error_code) BETWEEN 2 AND 80);

ALTER TABLE public.passport_webhook_subscriptions
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_reason text;

ALTER TABLE public.passport_webhook_subscriptions
  DROP CONSTRAINT IF EXISTS passport_webhook_paused_reason_length;
ALTER TABLE public.passport_webhook_subscriptions
  ADD CONSTRAINT passport_webhook_paused_reason_length
  CHECK (paused_reason IS NULL OR char_length(paused_reason) BETWEEN 2 AND 200);

CREATE TABLE IF NOT EXISTS public.passport_operation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN ('webhook_delivery', 'retention_cleanup')),
  trigger_source text NOT NULL CHECK (trigger_source IN ('cron', 'admin', 'test')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  claimed_count integer NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
  succeeded_count integer NOT NULL DEFAULT 0 CHECK (succeeded_count >= 0),
  retried_count integer NOT NULL DEFAULT 0 CHECK (retried_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  finished_at timestamptz,
  CONSTRAINT passport_operation_details_object CHECK (jsonb_typeof(details) = 'object'),
  CONSTRAINT passport_operation_finished_state CHECK (
    (status = 'running' AND finished_at IS NULL)
    OR (status <> 'running' AND finished_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS passport_webhook_deliveries_stale_claim_idx
  ON public.passport_webhook_deliveries(claimed_at)
  WHERE status = 'delivering';
CREATE INDEX IF NOT EXISTS passport_operation_runs_type_started_idx
  ON public.passport_operation_runs(operation_type, started_at DESC);
CREATE INDEX IF NOT EXISTS passport_operation_runs_active_idx
  ON public.passport_operation_runs(started_at)
  WHERE status = 'running';

ALTER TABLE public.passport_operation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.passport_operation_runs FROM anon, authenticated;
GRANT ALL ON TABLE public.passport_operation_runs TO service_role;

CREATE OR REPLACE FUNCTION public.claim_passport_webhook_deliveries(p_batch_size integer DEFAULT 12)
RETURNS TABLE (
  delivery_id uuid,
  subscription_id uuid,
  ecosystem_event_id uuid,
  delivery_attempt smallint,
  owner_user_id uuid,
  endpoint_url text,
  encrypted_signing_secret text,
  event_type text,
  event_payload jsonb,
  event_occurred_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT delivery.id
    FROM public.passport_webhook_deliveries delivery
    JOIN public.passport_webhook_subscriptions subscription ON subscription.id = delivery.subscription_id
    WHERE subscription.status = 'active'
      AND (
        (delivery.status IN ('pending', 'retry') AND coalesce(delivery.next_attempt_at, delivery.created_at) <= timezone('utc', now()))
        OR (delivery.status = 'delivering' AND delivery.claimed_at < timezone('utc', now()) - interval '5 minutes')
      )
    ORDER BY coalesce(delivery.next_attempt_at, delivery.created_at), delivery.created_at
    LIMIT greatest(1, least(coalesce(p_batch_size, 12), 50))
    FOR UPDATE OF delivery SKIP LOCKED
  ), claimed AS (
    UPDATE public.passport_webhook_deliveries delivery
    SET status = 'delivering', claimed_at = timezone('utc', now()), updated_at = timezone('utc', now())
    FROM candidates
    WHERE delivery.id = candidates.id
    RETURNING delivery.*
  )
  SELECT claimed.id, claimed.subscription_id, claimed.ecosystem_event_id, claimed.attempt,
    subscription.user_id, subscription.endpoint_url, subscription.encrypted_signing_secret,
    event.event_type, event.payload, event.occurred_at
  FROM claimed
  JOIN public.passport_webhook_subscriptions subscription ON subscription.id = claimed.subscription_id
  JOIN public.passport_ecosystem_events event ON event.id = claimed.ecosystem_event_id;
$$;
REVOKE ALL ON FUNCTION public.claim_passport_webhook_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_passport_webhook_deliveries(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_passport_webhook_delivery(
  p_delivery_id uuid,
  p_outcome text,
  p_response_status integer DEFAULT NULL,
  p_response_excerpt text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_retry_at timestamptz DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_delivery public.passport_webhook_deliveries%ROWTYPE;
  v_subscription public.passport_webhook_subscriptions%ROWTYPE;
  v_failure_count integer;
BEGIN
  IF p_outcome NOT IN ('delivered', 'retry', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Unsupported webhook delivery outcome';
  END IF;

  SELECT * INTO v_delivery
  FROM public.passport_webhook_deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;
  IF NOT FOUND OR v_delivery.status <> 'delivering' THEN RETURN 'stale'; END IF;

  SELECT * INTO v_subscription
  FROM public.passport_webhook_subscriptions
  WHERE id = v_delivery.subscription_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN 'stale'; END IF;

  IF p_outcome = 'delivered' THEN
    UPDATE public.passport_webhook_deliveries
    SET status = 'delivered', response_status = p_response_status, response_excerpt = left(p_response_excerpt, 500),
      duration_ms = least(greatest(p_duration_ms, 0), 60000), error_code = NULL,
      delivered_at = timezone('utc', now()), next_attempt_at = NULL, updated_at = timezone('utc', now())
    WHERE id = v_delivery.id;
    UPDATE public.passport_webhook_subscriptions
    SET failure_count = 0, last_success_at = timezone('utc', now()), paused_at = NULL, paused_reason = NULL,
      updated_at = timezone('utc', now())
    WHERE id = v_subscription.id;
    RETURN 'delivered';
  END IF;

  v_failure_count := v_subscription.failure_count + 1;
  UPDATE public.passport_webhook_deliveries
  SET status = CASE WHEN p_outcome = 'cancelled' THEN 'cancelled' ELSE 'failed' END,
    response_status = p_response_status, response_excerpt = left(p_response_excerpt, 500),
    duration_ms = least(greatest(p_duration_ms, 0), 60000), error_code = left(p_error_code, 80),
    next_attempt_at = NULL, updated_at = timezone('utc', now())
  WHERE id = v_delivery.id;

  UPDATE public.passport_webhook_subscriptions
  SET failure_count = v_failure_count, last_failure_at = timezone('utc', now()),
    status = CASE WHEN v_failure_count >= 8 THEN 'paused' ELSE status END,
    paused_at = CASE WHEN v_failure_count >= 8 THEN timezone('utc', now()) ELSE paused_at END,
    paused_reason = CASE WHEN v_failure_count >= 8 THEN 'Automatically paused after eight consecutive delivery failures' ELSE paused_reason END,
    updated_at = timezone('utc', now())
  WHERE id = v_subscription.id;

  IF p_outcome = 'retry' AND v_delivery.attempt < 8 AND v_failure_count < 8 AND v_subscription.status = 'active' THEN
    INSERT INTO public.passport_webhook_deliveries(
      subscription_id, ecosystem_event_id, attempt, status, next_attempt_at
    ) VALUES (
      v_delivery.subscription_id, v_delivery.ecosystem_event_id, v_delivery.attempt + 1, 'retry',
      greatest(coalesce(p_retry_at, timezone('utc', now()) + interval '5 minutes'), timezone('utc', now()) + interval '5 seconds')
    )
    ON CONFLICT (subscription_id, ecosystem_event_id, attempt) DO NOTHING;
    RETURN 'retry_scheduled';
  END IF;

  RETURN CASE WHEN p_outcome = 'cancelled' THEN 'cancelled' ELSE 'failed' END;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_passport_webhook_delivery(uuid, text, integer, text, integer, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_passport_webhook_delivery(uuid, text, integer, text, integer, text, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_passport_operational_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_intents integer := 0;
  v_sync_runs integer := 0;
  v_api_events integer := 0;
  v_deliveries integer := 0;
  v_ecosystem_events integer := 0;
  v_operation_runs integer := 0;
BEGIN
  DELETE FROM public.passport_connection_intents
  WHERE expires_at < timezone('utc', now()) - interval '7 days';
  GET DIAGNOSTICS v_intents = ROW_COUNT;

  DELETE FROM public.passport_provider_sync_runs
  WHERE started_at < timezone('utc', now()) - interval '180 days';
  GET DIAGNOSTICS v_sync_runs = ROW_COUNT;

  DELETE FROM public.passport_developer_api_events
  WHERE occurred_at < timezone('utc', now()) - interval '90 days';
  GET DIAGNOSTICS v_api_events = ROW_COUNT;

  DELETE FROM public.passport_webhook_deliveries
  WHERE status IN ('delivered', 'failed', 'cancelled')
    AND updated_at < timezone('utc', now()) - interval '30 days';
  GET DIAGNOSTICS v_deliveries = ROW_COUNT;

  DELETE FROM public.passport_ecosystem_events event
  WHERE event.created_at < timezone('utc', now()) - interval '180 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.passport_webhook_deliveries delivery
      WHERE delivery.ecosystem_event_id = event.id
        AND delivery.status IN ('pending', 'retry', 'delivering')
    );
  GET DIAGNOSTICS v_ecosystem_events = ROW_COUNT;

  DELETE FROM public.passport_operation_runs
  WHERE started_at < timezone('utc', now()) - interval '180 days';
  GET DIAGNOSTICS v_operation_runs = ROW_COUNT;

  RETURN jsonb_build_object(
    'connection_intents', v_intents,
    'sync_runs', v_sync_runs,
    'developer_api_events', v_api_events,
    'webhook_deliveries', v_deliveries,
    'ecosystem_events', v_ecosystem_events,
    'operation_runs', v_operation_runs
  );
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_passport_operational_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_passport_operational_data() TO service_role;
