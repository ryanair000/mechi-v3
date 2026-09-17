-- Fail closed for the legacy Gamer Passport rollout.
-- Account usernames remain private login identifiers. Public Passports now require
-- an independently validated public handle plus explicit publication consent.

CREATE TABLE IF NOT EXISTS public.passport_publication_migration_snapshots (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_state jsonb NOT NULL,
  migration_key text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.passport_handle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  public_handle text NOT NULL,
  redirect_allowed boolean NOT NULL DEFAULT false,
  retired_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_handle_history_format CHECK (
    public_handle = lower(public_handle)
    AND public_handle ~ '^[a-z][a-z0-9_]{2,19}$'
  )
);

ALTER TABLE public.passport_profiles
  ADD COLUMN IF NOT EXISTS public_handle text,
  ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS publication_consent_version text,
  ADD COLUMN IF NOT EXISTS publication_consent_at timestamptz;

-- Preserve the exact pre-remediation state before quarantining it. This makes the
-- data operation reversible without silently republishing anybody.
INSERT INTO public.passport_publication_migration_snapshots (
  user_id,
  previous_state,
  migration_key
)
SELECT
  pp.user_id,
  jsonb_build_object(
    'default_visibility', pp.default_visibility,
    'field_visibility', pp.field_visibility,
    'is_discoverable', pp.is_discoverable,
    'display_name', pp.display_name,
    'captured_public_handle', pp.public_handle,
    'captured_publication_status', pp.publication_status
  ),
  '20260813230653_passport_safe_publication_handles'
FROM public.passport_profiles pp
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.passport_profiles
  ALTER COLUMN default_visibility SET DEFAULT 'private',
  ALTER COLUMN is_discoverable SET DEFAULT false,
  ALTER COLUMN field_visibility SET DEFAULT '{
    "bio":"private",
    "gamer_since":"private",
    "archetypes":"private",
    "current_status":"private",
    "location":"private",
    "platforms":"private",
    "games":"private",
    "game_ids":"private",
    "competitive":"private",
    "events":"private",
    "achievements":"private",
    "teams":"private",
    "social":"private"
  }'::jsonb;

-- Existing users never consented to a public Gamer Passport. Preserve their
-- content but remove it from every public/discovery surface until they opt in.
UPDATE public.passport_profiles
SET
  public_handle = NULL,
  publication_status = 'draft',
  published_at = NULL,
  publication_consent_version = NULL,
  publication_consent_at = NULL,
  default_visibility = 'private',
  is_discoverable = false;

ALTER TABLE public.passport_profiles
  DROP CONSTRAINT IF EXISTS passport_profiles_publication_status_allowed,
  DROP CONSTRAINT IF EXISTS passport_profiles_public_handle_format,
  DROP CONSTRAINT IF EXISTS passport_profiles_publication_complete,
  DROP CONSTRAINT IF EXISTS passport_profiles_discoverability_requires_publication;

ALTER TABLE public.passport_profiles
  ADD CONSTRAINT passport_profiles_publication_status_allowed
    CHECK (publication_status IN ('draft', 'published')),
  ADD CONSTRAINT passport_profiles_public_handle_format CHECK (
    public_handle IS NULL OR (
      public_handle = lower(public_handle)
      AND public_handle ~ '^[a-z][a-z0-9_]{2,19}$'
      AND public_handle <> ALL (ARRAY[
        'about','account','admin','api','app','auth','billing','blog','careers',
        'compare','contact','dashboard','discover','events','games','help','home',
        'login','logout','me','mechi','moderation','news','notifications','ops',
        'passport','playmechi','privacy','profile','register','resume','root',
        'search','security','settings','signin','signup','support','system','teams',
        'terms','tournaments','verify','www'
      ]::text[])
    )
  ),
  ADD CONSTRAINT passport_profiles_publication_complete CHECK (
    publication_status = 'draft' OR (
      public_handle IS NOT NULL
      AND published_at IS NOT NULL
      AND publication_consent_at IS NOT NULL
      AND publication_consent_version IS NOT NULL
      AND char_length(publication_consent_version) BETWEEN 3 AND 100
      AND display_name IS NOT NULL
      AND display_name !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      AND display_name !~* '(https?://|www\.)'
      AND char_length(regexp_replace(display_name, '[^0-9]', '', 'g')) < 7
      AND default_visibility IN ('public', 'friends')
    )
  ),
  ADD CONSTRAINT passport_profiles_discoverability_requires_publication CHECK (
    is_discoverable = false OR (
      publication_status = 'published'
      AND default_visibility = 'public'
      AND public_handle IS NOT NULL
    )
  );

DROP INDEX IF EXISTS public.passport_profiles_discoverable_idx;
CREATE UNIQUE INDEX IF NOT EXISTS passport_profiles_public_handle_unique_idx
  ON public.passport_profiles (lower(public_handle))
  WHERE public_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_profiles_discoverable_idx
  ON public.passport_profiles (updated_at DESC)
  WHERE publication_status = 'published'
    AND default_visibility = 'public'
    AND is_discoverable = true
    AND public_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_handle_history_lookup_idx
  ON public.passport_handle_history (lower(public_handle))
  WHERE redirect_allowed = true;

INSERT INTO public.passport_audit_logs (
  user_id,
  actor_id,
  action,
  changed_fields,
  details
)
SELECT
  pp.user_id,
  NULL,
  'passport_legacy_publication_quarantined',
  ARRAY[
    'public_handle',
    'publication_status',
    'published_at',
    'publication_consent',
    'default_visibility',
    'is_discoverable'
  ]::text[],
  jsonb_build_object(
    'migration_key', '20260813230653_passport_safe_publication_handles',
    'reason', 'Explicit publication consent and a safe public handle are now required.'
  )
FROM public.passport_profiles pp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.passport_audit_logs pal
  WHERE pal.user_id = pp.user_id
    AND pal.action = 'passport_legacy_publication_quarantined'
    AND pal.details->>'migration_key' = '20260813230653_passport_safe_publication_handles'
);

ALTER TABLE public.passport_publication_migration_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_handle_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.passport_publication_migration_snapshots,
  public.passport_handle_history
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.passport_publication_migration_snapshots,
  public.passport_handle_history
TO service_role;
