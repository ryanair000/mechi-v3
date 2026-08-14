\set ON_ERROR_STOP on

DO $$
DECLARE
  table_name text;
  missing_trigger text;
  function_signature text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'passport_profiles',
    'passport_profile_summaries',
    'passport_game_entries',
    'passport_verification_records',
    'passport_highlights',
    'passport_dimension_snapshots',
    'passport_friendships',
    'passport_blocks'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Missing required Passport table public.%', table_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = table_name
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled on public.%', table_name;
    END IF;

    IF has_table_privilege('anon', format('public.%I', table_name), 'SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT,INSERT,UPDATE,DELETE')
    THEN
      RAISE EXCEPTION 'Browser roles have direct DML privileges on public.%', table_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'passport_profiles'
      AND column_name = 'public_version'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'passport_profiles.public_version is missing or nullable';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.passport_profiles
    WHERE public_version <= 0
  ) THEN
    RAISE EXCEPTION 'passport_profiles contains a non-positive public_version';
  END IF;

  SELECT required.name
  INTO missing_trigger
  FROM unnest(ARRAY[
    'passport_profiles_version_public_identity',
    'passport_games_bump_public_version',
    'passport_verifications_bump_public_version',
    'passport_highlights_bump_public_version',
    'passport_dimensions_bump_public_version',
    'passport_friendships_bump_public_version'
  ]) AS required(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgname = required.name
      AND NOT t.tgisinternal
  )
  LIMIT 1;

  IF missing_trigger IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Passport cache/version trigger %', missing_trigger;
  END IF;

  FOREACH function_signature IN ARRAY ARRAY[
    'private.refresh_passport_profile_summary_counts(uuid)',
    'private.bump_passport_public_version(uuid)'
  ]
  LOOP
    IF to_regprocedure(function_signature) IS NULL THEN
      RAISE EXCEPTION 'Missing required private function %', function_signature;
    END IF;

    IF has_function_privilege('anon', function_signature, 'EXECUTE')
      OR has_function_privilege('authenticated', function_signature, 'EXECUTE')
    THEN
      RAISE EXCEPTION 'Browser role can execute private function %', function_signature;
    END IF;
  END LOOP;
END
$$;
