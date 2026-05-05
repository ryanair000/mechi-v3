ALTER TABLE public.email_delivery_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'claimed',
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

DO $$
BEGIN
  ALTER TABLE public.email_delivery_events
    ADD CONSTRAINT email_delivery_events_status_check
    CHECK (status IN ('claimed', 'sent', 'failed', 'skipped'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_delivery_events_status_updated_at
  ON public.email_delivery_events(status, updated_at DESC);

ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  normalized_email text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'broadcast',
  token_hash text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  unsubscribed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT email_unsubscribes_scope_check CHECK (scope IN ('broadcast', 'all')),
  CONSTRAINT email_unsubscribes_normalized_scope_key UNIQUE (normalized_email, scope)
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user_created_at
  ON public.email_unsubscribes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_token_hash
  ON public.email_unsubscribes(token_hash);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_unsubscribes FROM anon, authenticated;
GRANT ALL ON TABLE public.email_unsubscribes TO service_role;

CREATE TABLE IF NOT EXISTS public.admin_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  audience_type text NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  body_text text NOT NULL,
  cta_label text,
  cta_url text,
  status text NOT NULL DEFAULT 'draft',
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  sent_at timestamptz,
  CONSTRAINT admin_email_campaigns_audience_type_check
    CHECK (audience_type IN ('all_profiles', 'manual')),
  CONSTRAINT admin_email_campaigns_status_check
    CHECK (status IN ('draft', 'sending', 'sent', 'partial_failure', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_admin_email_campaigns_admin_created_at
  ON public.admin_email_campaigns(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_email_campaigns_status_created_at
  ON public.admin_email_campaigns(status, created_at DESC);

ALTER TABLE public.admin_email_campaigns ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_email_campaigns FROM anon, authenticated;
GRANT ALL ON TABLE public.admin_email_campaigns TO service_role;

CREATE TABLE IF NOT EXISTS public.admin_email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.admin_email_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  normalized_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  delivery_event_key text,
  error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT admin_email_campaign_recipients_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT admin_email_campaign_recipients_campaign_email_key
    UNIQUE (campaign_id, normalized_email)
);

CREATE INDEX IF NOT EXISTS idx_admin_email_campaign_recipients_campaign_status
  ON public.admin_email_campaign_recipients(campaign_id, status);

ALTER TABLE public.admin_email_campaign_recipients ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_email_campaign_recipients FROM anon, authenticated;
GRANT ALL ON TABLE public.admin_email_campaign_recipients TO service_role;
