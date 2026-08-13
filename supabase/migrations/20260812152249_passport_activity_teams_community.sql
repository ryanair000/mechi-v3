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
