CREATE TABLE IF NOT EXISTS reward_link_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechi_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  chezahub_user_id uuid,
  status text NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'linked', 'rejected', 'expired')),
  expires_at timestamptz NOT NULL,
  linked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS reward_link_sessions_user_idx
  ON reward_link_sessions (mechi_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reward_link_sessions_status_idx
  ON reward_link_sessions (status, expires_at DESC);
