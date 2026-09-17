-- Version every public-safe Passport projection. Anonymous cache entries are
-- keyed by this monotonic value, while authorization is still checked live.

ALTER TABLE public.passport_profiles
  ADD COLUMN IF NOT EXISTS public_version bigint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'passport_profiles_public_version_positive'
      AND conrelid = 'public.passport_profiles'::regclass
  ) THEN
    ALTER TABLE public.passport_profiles
      ADD CONSTRAINT passport_profiles_public_version_positive
      CHECK (public_version > 0);
  END IF;
END;
$$;

ALTER TABLE public.passport_dimension_snapshots
  ADD COLUMN IF NOT EXISTS source_cursor jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION private.version_passport_public_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF ROW(
    NEW.public_handle,
    NEW.publication_status,
    NEW.published_at,
    NEW.publication_consent_version,
    NEW.display_name,
    NEW.bio,
    NEW.gamer_since,
    NEW.archetypes,
    NEW.current_status,
    NEW.default_visibility,
    NEW.field_visibility,
    NEW.is_discoverable,
    NEW.card_accent
  ) IS DISTINCT FROM ROW(
    OLD.public_handle,
    OLD.publication_status,
    OLD.published_at,
    OLD.publication_consent_version,
    OLD.display_name,
    OLD.bio,
    OLD.gamer_since,
    OLD.archetypes,
    OLD.current_status,
    OLD.default_visibility,
    OLD.field_visibility,
    OLD.is_discoverable,
    OLD.card_accent
  ) THEN
    NEW.public_version := greatest(OLD.public_version + 1, NEW.public_version);
  ELSIF NEW.public_version < OLD.public_version THEN
    NEW.public_version := OLD.public_version;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS passport_profiles_version_public_identity ON public.passport_profiles;
CREATE TRIGGER passport_profiles_version_public_identity
BEFORE UPDATE ON public.passport_profiles
FOR EACH ROW EXECUTE FUNCTION private.version_passport_public_identity();

CREATE OR REPLACE FUNCTION private.bump_passport_public_version(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.passport_profiles
  SET public_version = public_version + 1
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.bump_passport_version_from_user_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM private.bump_passport_public_version(OLD.user_id);
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    PERFORM private.bump_passport_public_version(OLD.user_id);
  END IF;
  PERFORM private.bump_passport_public_version(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bump_passport_version_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  PERFORM private.bump_passport_public_version(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bump_passport_version_from_tournament_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.passport_profiles passport
  SET public_version = passport.public_version + 1
  WHERE passport.user_id IN (
    SELECT player.user_id
    FROM public.tournament_players player
    WHERE player.tournament_id = NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bump_passport_version_from_team_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.passport_profiles passport
  SET public_version = passport.public_version + 1
  WHERE passport.user_id IN (
    SELECT membership.user_id
    FROM public.team_members membership
    WHERE membership.team_id = NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bump_passport_version_from_friendship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM private.bump_passport_public_version(OLD.user_a_id);
    PERFORM private.bump_passport_public_version(OLD.user_b_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM private.bump_passport_public_version(NEW.user_a_id);
    PERFORM private.bump_passport_public_version(NEW.user_b_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bump_passport_version_from_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM private.bump_passport_public_version(OLD.follower_id);
    PERFORM private.bump_passport_public_version(OLD.followed_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM private.bump_passport_public_version(NEW.follower_id);
    PERFORM private.bump_passport_public_version(NEW.followed_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bump_passport_version_from_shelf_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected_user_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT shelf.user_id INTO affected_user_id
    FROM public.passport_custom_shelves shelf
    WHERE shelf.id = OLD.shelf_id;
    PERFORM private.bump_passport_public_version(affected_user_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT shelf.user_id INTO affected_user_id
    FROM public.passport_custom_shelves shelf
    WHERE shelf.id = NEW.shelf_id;
    PERFORM private.bump_passport_public_version(affected_user_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_bump_passport_public_version ON public.profiles;
CREATE TRIGGER profiles_bump_passport_public_version
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.bump_passport_version_from_profile();

DO $$
DECLARE
  source_table regclass;
  trigger_name text;
BEGIN
  FOR source_table, trigger_name IN VALUES
    ('public.passport_profile_summaries'::regclass, 'passport_summaries_bump_public_version'),
    ('public.passport_game_entries'::regclass, 'passport_games_bump_public_version'),
    ('public.passport_verification_records'::regclass, 'passport_verifications_bump_public_version'),
    ('public.passport_highlights'::regclass, 'passport_highlights_bump_public_version'),
    ('public.passport_dimension_snapshots'::regclass, 'passport_dimensions_bump_public_version'),
    ('public.passport_customizations'::regclass, 'passport_customizations_bump_public_version'),
    ('public.passport_showcase_items'::regclass, 'passport_showcase_bump_public_version'),
    ('public.passport_custom_shelves'::regclass, 'passport_shelves_bump_public_version')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_name, source_table);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION private.bump_passport_version_from_user_source()',
      trigger_name,
      source_table
    );
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS passport_friendships_bump_public_version ON public.passport_friendships;
CREATE TRIGGER passport_friendships_bump_public_version
AFTER INSERT OR UPDATE OR DELETE ON public.passport_friendships
FOR EACH ROW EXECUTE FUNCTION private.bump_passport_version_from_friendship();

DROP TRIGGER IF EXISTS passport_follows_bump_public_version ON public.passport_follows;
CREATE TRIGGER passport_follows_bump_public_version
AFTER INSERT OR UPDATE OR DELETE ON public.passport_follows
FOR EACH ROW EXECUTE FUNCTION private.bump_passport_version_from_follow();

DROP TRIGGER IF EXISTS passport_shelf_items_bump_public_version ON public.passport_custom_shelf_items;
CREATE TRIGGER passport_shelf_items_bump_public_version
AFTER INSERT OR UPDATE OR DELETE ON public.passport_custom_shelf_items
FOR EACH ROW EXECUTE FUNCTION private.bump_passport_version_from_shelf_item();

DROP TRIGGER IF EXISTS tournaments_bump_passport_public_version ON public.tournaments;
CREATE TRIGGER tournaments_bump_passport_public_version
AFTER UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION private.bump_passport_version_from_tournament_content();

DROP TRIGGER IF EXISTS teams_bump_passport_public_version ON public.teams;
CREATE TRIGGER teams_bump_passport_public_version
AFTER UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION private.bump_passport_version_from_team_content();

REVOKE ALL ON FUNCTION private.version_passport_public_identity()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bump_passport_public_version(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bump_passport_version_from_user_source()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bump_passport_version_from_profile()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bump_passport_version_from_tournament_content()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bump_passport_version_from_team_content()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bump_passport_version_from_friendship()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bump_passport_version_from_follow()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bump_passport_version_from_shelf_item()
  FROM PUBLIC, anon, authenticated;
