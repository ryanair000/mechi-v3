ALTER TABLE support_threads
  DROP CONSTRAINT IF EXISTS support_threads_channel_check;
ALTER TABLE support_threads
  ADD CONSTRAINT support_threads_channel_check
  CHECK (channel IN ('whatsapp', 'instagram', 'in_app'));
ALTER TABLE support_threads
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS issue_category text,
  ADD COLUMN IF NOT EXISTS context_type text,
  ADD COLUMN IF NOT EXISTS context_id text,
  ADD COLUMN IF NOT EXISTS case_reference text,
  ADD COLUMN IF NOT EXISTS resolution_summary text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_threads_case_reference
  ON support_threads(case_reference)
  WHERE case_reference IS NOT NULL;
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  slug text NOT NULL UNIQUE,
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  region text NOT NULL DEFAULT 'Kenya',
  avatar_url text,
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),
  recruiting boolean NOT NULL DEFAULT false,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('captain', 'starter', 'substitute', 'member')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'left', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  left_at timestamptz,
  UNIQUE (team_id, user_id)
);
CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (invitee_id <> inviter_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_one_pending
  ON team_invitations(team_id, invitee_id)
  WHERE status = 'pending';
CREATE TABLE IF NOT EXISTS team_roster_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game text NOT NULL,
  member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  roster_role text NOT NULL DEFAULT 'starter'
    CHECK (roster_role IN ('starter', 'substitute')),
  game_account_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  eligibility_status text NOT NULL DEFAULT 'pending'
    CHECK (eligibility_status IN ('pending', 'eligible', 'blocked')),
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
-- Upgrade the earlier workspace-based team draft without deleting its tables.
-- Production has no rows in that draft, but keeping the columns nullable preserves
-- compatibility with its tournament-entry foreign keys and migration history.
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'Kenya',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS recruiting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE RESTRICT;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'workspace_id') THEN
    ALTER TABLE teams ALTER COLUMN workspace_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'game') THEN
    ALTER TABLE teams ALTER COLUMN game DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'captain_user_id') THEN
    ALTER TABLE teams ALTER COLUMN captain_user_id DROP NOT NULL;
  END IF;
END $$;
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS left_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_name_length_check') THEN
    ALTER TABLE teams ADD CONSTRAINT teams_name_length_check
      CHECK (name IS NULL OR char_length(name) BETWEEN 2 AND 60);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_description_length_check') THEN
    ALTER TABLE teams ADD CONSTRAINT teams_description_length_check
      CHECK (description IS NULL OR char_length(description) <= 500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_visibility_check') THEN
    ALTER TABLE teams ADD CONSTRAINT teams_visibility_check
      CHECK (visibility IN ('public', 'private'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_role_check') THEN
    ALTER TABLE team_members ADD CONSTRAINT team_members_role_check
      CHECK (role IN ('captain', 'starter', 'substitute', 'member'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_slug_unique
  ON teams(slug)
  WHERE slug IS NOT NULL;
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS participant_mode text NOT NULL DEFAULT 'solo'
    CHECK (participant_mode IN ('solo', 'team')),
  ADD COLUMN IF NOT EXISTS team_size integer
    CHECK (team_size IS NULL OR team_size BETWEEN 2 AND 12);
CREATE TABLE IF NOT EXISTS tournament_team_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  registered_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  roster_snapshot jsonb NOT NULL,
  roster_locked_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  payment_status text NOT NULL DEFAULT 'free'
    CHECK (payment_status IN ('pending', 'paid', 'free', 'failed', 'refunded')),
  payment_ref text,
  check_in_status text NOT NULL DEFAULT 'registered'
    CHECK (check_in_status IN ('registered', 'checked_in', 'no_show')),
  checked_in_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (tournament_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_user_status
  ON team_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_status
  ON team_members(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_status
  ON team_invitations(invitee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_roster_team_game
  ON team_roster_entries(team_id, game);
CREATE INDEX IF NOT EXISTS idx_team_audit_team_created
  ON team_audit_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_team_entries_tournament_status
  ON tournament_team_entries(tournament_id, payment_status);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_roster_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_team_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE teams FROM anon, authenticated;
REVOKE ALL ON TABLE team_members FROM anon, authenticated;
REVOKE ALL ON TABLE team_invitations FROM anon, authenticated;
REVOKE ALL ON TABLE team_roster_entries FROM anon, authenticated;
REVOKE ALL ON TABLE team_audit_logs FROM anon, authenticated;
REVOKE ALL ON TABLE tournament_team_entries FROM anon, authenticated;
GRANT ALL ON TABLE teams TO service_role;
GRANT ALL ON TABLE team_members TO service_role;
GRANT ALL ON TABLE team_invitations TO service_role;
GRANT ALL ON TABLE team_roster_entries TO service_role;
GRANT ALL ON TABLE team_audit_logs TO service_role;
GRANT ALL ON TABLE tournament_team_entries TO service_role;
