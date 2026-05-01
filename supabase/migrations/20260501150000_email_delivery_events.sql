CREATE TABLE IF NOT EXISTS email_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_events_user_created_at
  ON email_delivery_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_events_type_created_at
  ON email_delivery_events(event_type, created_at DESC);

REVOKE ALL ON TABLE email_delivery_events FROM anon, authenticated;
GRANT ALL ON email_delivery_events TO service_role;
