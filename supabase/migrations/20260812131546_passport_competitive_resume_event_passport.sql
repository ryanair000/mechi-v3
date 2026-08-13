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
