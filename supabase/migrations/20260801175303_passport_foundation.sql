-- Mechi V5 / PlayMechi Gamer Passport - Phase 1 foundation.
--
-- Mechi currently authenticates users with its own signed JWT and performs
-- database access through server-side service-role clients. These tables are
-- therefore intentionally unavailable to anon/authenticated Data API roles.
-- Privacy-filtered public and owner reads are served by the Mechi application.

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
      'competitive',
      'story_explorer',
      'completionist',
      'casual',
      'trophy_hunter',
      'speedrunner',
      'mobile_gamer',
      'console_gamer',
      'pc_gamer',
      'sports_specialist',
      'fighting_specialist',
      'battle_royale_player',
      'retro_gamer',
      'tournament_organizer',
      'content_creator',
      'community_builder'
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
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  verification_state text NOT NULL,
  label text NOT NULL,
  source_type text NOT NULL,
  source_key text NOT NULL,
  public_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_verification_subject_type_allowed CHECK (
    subject_type IN ('profile', 'game_account', 'match', 'tournament', 'event', 'team', 'achievement')
  ),
  CONSTRAINT passport_verification_state_allowed CHECK (
    verification_state IN (
      'self_reported',
      'evidence_attached',
      'community_confirmed',
      'organizer_verified',
      'mechi_verified',
      'platform_synced'
    )
  ),
  CONSTRAINT passport_verification_label_length CHECK (char_length(label) BETWEEN 2 AND 120),
  CONSTRAINT passport_verification_source_length CHECK (
    char_length(source_type) BETWEEN 2 AND 60 AND char_length(source_key) BETWEEN 1 AND 200
  ),
  CONSTRAINT passport_verification_public_details_object CHECK (
    jsonb_typeof(public_details) = 'object'
  ),
  CONSTRAINT passport_verification_revocation_complete CHECK (
    revoked_at IS NULL OR revocation_reason IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.passport_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  changed_fields text[] NOT NULL DEFAULT '{}',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_audit_action_length CHECK (char_length(action) BETWEEN 2 AND 100),
  CONSTRAINT passport_audit_details_object CHECK (jsonb_typeof(details) = 'object')
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

-- Every existing Mechi V5 account receives a Passport identity record.
INSERT INTO public.passport_profiles (user_id, display_name)
SELECT id, username
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Seed the rebuildable summary read model from existing authoritative data.
INSERT INTO public.passport_profile_summaries (
  user_id,
  games_count,
  total_matches,
  total_wins,
  total_losses,
  best_rating,
  tournaments_registered,
  events_attended,
  completed_events,
  achievements_count,
  badges_count,
  teams_count,
  last_activity_at,
  computed_at
)
SELECT
  p.id,
  coalesce(cardinality(p.selected_games), 0),
  (
    coalesce(p.wins_efootball, 0) + coalesce(p.wins_efootball_mobile, 0)
    + coalesce(p.wins_fc26, 0) + coalesce(p.wins_mk11, 0)
    + coalesce(p.wins_nba2k26, 0) + coalesce(p.wins_tekken8, 0)
    + coalesce(p.wins_sf6, 0) + coalesce(p.wins_ludo, 0)
    + coalesce(p.losses_efootball, 0) + coalesce(p.losses_efootball_mobile, 0)
    + coalesce(p.losses_fc26, 0) + coalesce(p.losses_mk11, 0)
    + coalesce(p.losses_nba2k26, 0) + coalesce(p.losses_tekken8, 0)
    + coalesce(p.losses_sf6, 0) + coalesce(p.losses_ludo, 0)
  ),
  (
    coalesce(p.wins_efootball, 0) + coalesce(p.wins_efootball_mobile, 0)
    + coalesce(p.wins_fc26, 0) + coalesce(p.wins_mk11, 0)
    + coalesce(p.wins_nba2k26, 0) + coalesce(p.wins_tekken8, 0)
    + coalesce(p.wins_sf6, 0) + coalesce(p.wins_ludo, 0)
  ),
  (
    coalesce(p.losses_efootball, 0) + coalesce(p.losses_efootball_mobile, 0)
    + coalesce(p.losses_fc26, 0) + coalesce(p.losses_mk11, 0)
    + coalesce(p.losses_nba2k26, 0) + coalesce(p.losses_tekken8, 0)
    + coalesce(p.losses_sf6, 0) + coalesce(p.losses_ludo, 0)
  ),
  greatest(
    coalesce(p.rating_efootball, 1000),
    coalesce(p.rating_efootball_mobile, 1000),
    coalesce(p.rating_fc26, 1000),
    coalesce(p.rating_mk11, 1000),
    coalesce(p.rating_nba2k26, 1000),
    coalesce(p.rating_tekken8, 1000),
    coalesce(p.rating_sf6, 1000),
    coalesce(p.rating_ludo, 1000)
  ),
  (SELECT count(*)::integer FROM public.tournament_players tp
    WHERE tp.user_id = p.id AND tp.payment_status IN ('paid', 'free')),
  (SELECT count(*)::integer FROM public.tournament_players tp
    WHERE tp.user_id = p.id AND tp.check_in_status = 'checked_in'),
  (SELECT count(*)::integer
    FROM public.tournament_players tp
    JOIN public.tournaments t ON t.id = tp.tournament_id
    WHERE tp.user_id = p.id
      AND tp.check_in_status = 'checked_in'
      AND t.status = 'completed'),
  (SELECT count(*)::integer FROM public.achievements a WHERE a.user_id = p.id),
  (SELECT count(*)::integer FROM public.profile_badges pb WHERE pb.user_id = p.id),
  (SELECT count(*)::integer FROM public.team_members tm
    WHERE tm.user_id = p.id AND tm.status = 'active'),
  p.last_match_date::timestamptz,
  timezone('utc', now())
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE SET
  games_count = EXCLUDED.games_count,
  total_matches = EXCLUDED.total_matches,
  total_wins = EXCLUDED.total_wins,
  total_losses = EXCLUDED.total_losses,
  best_rating = EXCLUDED.best_rating,
  tournaments_registered = EXCLUDED.tournaments_registered,
  events_attended = EXCLUDED.events_attended,
  completed_events = EXCLUDED.completed_events,
  achievements_count = EXCLUDED.achievements_count,
  badges_count = EXCLUDED.badges_count,
  teams_count = EXCLUDED.teams_count,
  last_activity_at = EXCLUDED.last_activity_at,
  computed_at = EXCLUDED.computed_at;
