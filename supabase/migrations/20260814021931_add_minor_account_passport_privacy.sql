-- Mechi V5 Gamer Passport: minimal, private age-policy state and fail-closed
-- minor-account publication controls. Exact dates of birth are intentionally
-- not collected by this migration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_policy_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS age_policy_source text,
  ADD COLUMN IF NOT EXISTS age_policy_updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_age_policy_status_allowed'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_age_policy_status_allowed
      CHECK (age_policy_status IN ('unknown', 'minor', 'adult'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_age_policy_source_allowed'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_age_policy_source_allowed
      CHECK (age_policy_source IS NULL OR age_policy_source IN ('self_declared', 'admin'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.age_policy_status IS
  'Private server-owned age policy state. Never serialize into public Gamer Passport payloads.';
COMMENT ON COLUMN public.profiles.age_policy_source IS
  'How the current age policy state was established; not an age-verification credential.';

CREATE TABLE IF NOT EXISTS public.profile_age_policy_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_status text NOT NULL CHECK (previous_status IN ('unknown', 'minor', 'adult')),
  new_status text NOT NULL CHECK (new_status IN ('unknown', 'minor', 'adult')),
  source text NOT NULL CHECK (source IN ('self_declared', 'admin')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT profile_age_policy_events_reason_length
    CHECK (reason IS NULL OR char_length(reason) <= 500)
);

CREATE INDEX IF NOT EXISTS profile_age_policy_events_user_created_idx
  ON public.profile_age_policy_events(user_id, created_at DESC);

ALTER TABLE public.profile_age_policy_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_age_policy_events FROM anon, authenticated;
GRANT ALL ON TABLE public.profile_age_policy_events TO service_role;

CREATE OR REPLACE FUNCTION private.is_minor_account(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND age_policy_status = 'minor'
  );
$$;

REVOKE ALL ON FUNCTION private.is_minor_account(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.enforce_minor_passport_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.is_minor_account(NEW.user_id) THEN
    NEW.publication_status := 'draft';
    NEW.published_at := NULL;
    NEW.publication_consent_version := NULL;
    NEW.publication_consent_at := NULL;
    NEW.default_visibility := 'private';
    NEW.field_visibility := jsonb_build_object(
      'bio', 'private',
      'gamer_since', 'private',
      'archetypes', 'private',
      'current_status', 'private',
      'location', 'private',
      'platforms', 'private',
      'games', 'private',
      'game_ids', 'private',
      'competitive', 'private',
      'events', 'private',
      'achievements', 'private',
      'teams', 'private',
      'social', 'private'
    );
    NEW.is_discoverable := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_minor_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.is_minor_account(NEW.user_id) THEN
    NEW.visibility := 'private';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_minor_activity_audience()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.is_minor_account(NEW.actor_id) THEN
    NEW.audience := 'private';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_minor_replay_privacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.is_minor_account(NEW.user_id) THEN
    NEW.is_public := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_minor_cv_privacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.is_minor_account(NEW.user_id) THEN
    NEW.inquiry_enabled := false;
    NEW.inquiry_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_minor_media_kit_privacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.is_minor_account(NEW.user_id) THEN
    NEW.enabled := false;
    NEW.inquiry_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS passport_profiles_enforce_minor_privacy ON public.passport_profiles;
CREATE TRIGGER passport_profiles_enforce_minor_privacy
  BEFORE INSERT OR UPDATE ON public.passport_profiles
  FOR EACH ROW EXECUTE FUNCTION private.enforce_minor_passport_profile();

DROP TRIGGER IF EXISTS passport_game_entries_enforce_minor_privacy ON public.passport_game_entries;
CREATE TRIGGER passport_game_entries_enforce_minor_privacy
  BEFORE INSERT OR UPDATE ON public.passport_game_entries
  FOR EACH ROW EXECUTE FUNCTION private.enforce_minor_visibility();

DROP TRIGGER IF EXISTS passport_highlights_enforce_minor_privacy ON public.passport_highlights;
CREATE TRIGGER passport_highlights_enforce_minor_privacy
  BEFORE INSERT OR UPDATE ON public.passport_highlights
  FOR EACH ROW EXECUTE FUNCTION private.enforce_minor_visibility();

DROP TRIGGER IF EXISTS passport_showcase_items_enforce_minor_privacy ON public.passport_showcase_items;
CREATE TRIGGER passport_showcase_items_enforce_minor_privacy
  BEFORE INSERT OR UPDATE ON public.passport_showcase_items
  FOR EACH ROW EXECUTE FUNCTION private.enforce_minor_visibility();

DROP TRIGGER IF EXISTS passport_custom_shelves_enforce_minor_privacy ON public.passport_custom_shelves;
CREATE TRIGGER passport_custom_shelves_enforce_minor_privacy
  BEFORE INSERT OR UPDATE ON public.passport_custom_shelves
  FOR EACH ROW EXECUTE FUNCTION private.enforce_minor_visibility();

DROP TRIGGER IF EXISTS passport_activity_objects_enforce_minor_privacy ON public.passport_activity_objects;
CREATE TRIGGER passport_activity_objects_enforce_minor_privacy
  BEFORE INSERT OR UPDATE ON public.passport_activity_objects
  FOR EACH ROW EXECUTE FUNCTION private.enforce_minor_activity_audience();

DROP TRIGGER IF EXISTS passport_replay_snapshots_enforce_minor_privacy ON public.passport_replay_snapshots;
CREATE TRIGGER passport_replay_snapshots_enforce_minor_privacy
  BEFORE INSERT OR UPDATE ON public.passport_replay_snapshots
  FOR EACH ROW EXECUTE FUNCTION private.enforce_minor_replay_privacy();

DROP TRIGGER IF EXISTS passport_cv_settings_enforce_minor_privacy ON public.passport_cv_settings;
CREATE TRIGGER passport_cv_settings_enforce_minor_privacy
  BEFORE INSERT OR UPDATE ON public.passport_cv_settings
  FOR EACH ROW EXECUTE FUNCTION private.enforce_minor_cv_privacy();

DROP TRIGGER IF EXISTS passport_media_kit_settings_enforce_minor_privacy ON public.passport_media_kit_settings;
CREATE TRIGGER passport_media_kit_settings_enforce_minor_privacy
  BEFORE INSERT OR UPDATE ON public.passport_media_kit_settings
  FOR EACH ROW EXECUTE FUNCTION private.enforce_minor_media_kit_privacy();

CREATE OR REPLACE FUNCTION private.quarantine_minor_passport_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF NEW.age_policy_status = 'minor'
    AND OLD.age_policy_status IS DISTINCT FROM NEW.age_policy_status THEN
    UPDATE public.passport_profiles
      SET publication_status = 'draft',
          published_at = NULL,
          publication_consent_version = NULL,
          publication_consent_at = NULL,
          default_visibility = 'private',
          field_visibility = jsonb_build_object(
            'bio', 'private', 'gamer_since', 'private', 'archetypes', 'private',
            'current_status', 'private', 'location', 'private', 'platforms', 'private',
            'games', 'private', 'game_ids', 'private', 'competitive', 'private',
            'events', 'private', 'achievements', 'private', 'teams', 'private',
            'social', 'private'
          ),
          is_discoverable = false
      WHERE user_id = NEW.id;

    UPDATE public.passport_game_entries SET visibility = 'private' WHERE user_id = NEW.id;
    UPDATE public.passport_highlights SET visibility = 'private' WHERE user_id = NEW.id;
    UPDATE public.passport_showcase_items SET visibility = 'private' WHERE user_id = NEW.id;
    UPDATE public.passport_custom_shelves SET visibility = 'private' WHERE user_id = NEW.id;
    UPDATE public.passport_activity_objects SET audience = 'private' WHERE actor_id = NEW.id;
    UPDATE public.passport_replay_snapshots SET is_public = false WHERE user_id = NEW.id;
    UPDATE public.passport_cv_settings
      SET inquiry_enabled = false, inquiry_url = NULL
      WHERE user_id = NEW.id;
    UPDATE public.passport_media_kit_settings
      SET enabled = false, inquiry_url = NULL
      WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_quarantine_minor_passport_content ON public.profiles;
CREATE TRIGGER profiles_quarantine_minor_passport_content
  AFTER UPDATE OF age_policy_status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.quarantine_minor_passport_content();

CREATE OR REPLACE FUNCTION public.set_profile_age_policy(
  p_user_id uuid,
  p_actor_id uuid,
  p_new_status text,
  p_source text,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  age_policy_status text,
  age_policy_source text,
  age_policy_updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_previous_status text;
BEGIN
  IF p_new_status NOT IN ('unknown', 'minor', 'adult') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid age policy status';
  END IF;
  IF p_source NOT IN ('self_declared', 'admin') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid age policy source';
  END IF;

  SELECT profiles.age_policy_status
    INTO v_previous_status
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Profile not found';
  END IF;

  IF p_source = 'self_declared' THEN
    IF p_actor_id IS DISTINCT FROM p_user_id OR p_new_status NOT IN ('minor', 'adult') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Invalid self-declared age policy transition';
    END IF;
    IF v_previous_status = 'minor' AND p_new_status <> 'minor' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Minor protections require administrator review to remove';
    END IF;
  ELSE
    IF p_actor_id IS NULL OR nullif(btrim(coalesce(p_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Administrator age policy changes require a reason';
    END IF;
  END IF;

  IF v_previous_status IS DISTINCT FROM p_new_status THEN
    UPDATE public.profiles
      SET age_policy_status = p_new_status,
          age_policy_source = p_source,
          age_policy_updated_at = timezone('utc', now())
      WHERE id = p_user_id;

    INSERT INTO public.profile_age_policy_events (
      user_id, actor_user_id, previous_status, new_status, source, reason
    ) VALUES (
      p_user_id,
      p_actor_id,
      v_previous_status,
      p_new_status,
      p_source,
      nullif(btrim(coalesce(p_reason, '')), '')
    );
  END IF;

  RETURN QUERY
    SELECT profiles.age_policy_status,
           profiles.age_policy_source,
           profiles.age_policy_updated_at
    FROM public.profiles
    WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_age_policy(uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_age_policy(uuid, uuid, text, text, text)
  TO service_role;
