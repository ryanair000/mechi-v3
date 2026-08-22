-- P1-7: keep already-projected community activity within the current Passport
-- access ceiling as soon as publication, visibility, or discovery changes.
-- This trigger only narrows access. The application projection may later rebuild
-- the exact field/source audience after an owner mutation.

CREATE OR REPLACE FUNCTION private.clamp_passport_activity_to_access_mode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.publication_status <> 'published'
    OR NEW.default_visibility = 'private'
    OR (NEW.default_visibility = 'public' AND NEW.is_discoverable = false) THEN
    UPDATE public.passport_activity_objects
      SET audience = 'private'
      WHERE actor_id = NEW.user_id
        AND audience <> 'private';
  ELSIF NEW.default_visibility = 'friends' THEN
    UPDATE public.passport_activity_objects
      SET audience = 'friends'
      WHERE actor_id = NEW.user_id
        AND audience = 'public';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.clamp_passport_activity_to_access_mode()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS passport_profiles_clamp_activity_access
  ON public.passport_profiles;
CREATE TRIGGER passport_profiles_clamp_activity_access
  AFTER UPDATE OF publication_status, default_visibility, is_discoverable, field_visibility
  ON public.passport_profiles
  FOR EACH ROW
  WHEN (
    OLD.publication_status IS DISTINCT FROM NEW.publication_status
    OR OLD.default_visibility IS DISTINCT FROM NEW.default_visibility
    OR OLD.is_discoverable IS DISTINCT FROM NEW.is_discoverable
    OR OLD.field_visibility IS DISTINCT FROM NEW.field_visibility
  )
  EXECUTE FUNCTION private.clamp_passport_activity_to_access_mode();
