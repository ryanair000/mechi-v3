CREATE TABLE IF NOT EXISTS match_message_reads (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_match_message_reads_user_id
  ON match_message_reads(user_id);

GRANT SELECT ON match_message_reads TO authenticated;
GRANT ALL ON match_message_reads TO service_role;

ALTER TABLE match_message_reads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE match_message_reads FROM anon, authenticated;
