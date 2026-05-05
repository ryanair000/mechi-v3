CREATE TABLE IF NOT EXISTS notification_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  device_name text,
  app_version text,
  experience_id text,
  disabled_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_notification_push_tokens_user_active
  ON notification_push_tokens(user_id, last_seen_at DESC)
  WHERE disabled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_push_tokens_disabled_at
  ON notification_push_tokens(disabled_at)
  WHERE disabled_at IS NOT NULL;

GRANT ALL ON notification_push_tokens TO service_role;
