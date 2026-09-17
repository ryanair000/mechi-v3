ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_session_version integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_auth_session_version_positive'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_auth_session_version_positive
      CHECK (auth_session_version >= 1);
  END IF;
END
$$;

COMMENT ON COLUMN public.profiles.auth_session_version IS
  'Increment to revoke every previously issued Mechi account JWT for this profile.';
