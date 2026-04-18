CREATE TABLE IF NOT EXISTS match_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sender_type text NOT NULL
    CHECK (sender_type IN ('player', 'system', 'admin')),
  message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'system', 'quick_reply')),
  body text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_match_messages_match_created_at
  ON match_messages(match_id, created_at ASC);

GRANT SELECT ON match_messages TO authenticated;
GRANT ALL ON match_messages TO service_role;

ALTER TABLE match_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE match_messages FROM anon, authenticated;
