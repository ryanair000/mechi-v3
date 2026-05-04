CREATE TABLE IF NOT EXISTS public.android_tester_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  play_email text NOT NULL,
  play_email_normalized text NOT NULL UNIQUE,
  whatsapp_number text NOT NULL,
  mechi_username text,
  device_model text NOT NULL,
  android_version text,
  country text NOT NULL DEFAULT 'Kenya',
  target_track text NOT NULL DEFAULT 'closed'
    CHECK (target_track IN ('internal', 'closed')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invited', 'opted_in', 'active', 'removed')),
  wants_updates boolean NOT NULL DEFAULT true,
  accepted_requirements boolean NOT NULL DEFAULT false,
  notes text,
  source text NOT NULL DEFAULT 'mechi.club/android-testers',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_android_tester_signups_status_created
  ON public.android_tester_signups(status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_android_tester_signups_target_track
  ON public.android_tester_signups(target_track, status, created_at ASC);

ALTER TABLE public.android_tester_signups ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.android_tester_signups TO service_role;
REVOKE ALL ON public.android_tester_signups FROM anon, authenticated;
