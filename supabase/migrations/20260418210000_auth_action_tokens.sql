CREATE TABLE IF NOT EXISTS auth_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('magic_link_signin', 'password_reset')),
  token_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  next_path text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_user_purpose_created
  ON auth_action_tokens(user_id, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_expires_at
  ON auth_action_tokens(expires_at);

REVOKE ALL ON TABLE auth_action_tokens FROM anon, authenticated;
GRANT ALL ON auth_action_tokens TO service_role;
