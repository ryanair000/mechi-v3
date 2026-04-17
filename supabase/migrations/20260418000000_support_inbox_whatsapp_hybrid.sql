CREATE TABLE IF NOT EXISTS support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp')),
  phone text NOT NULL,
  wa_id text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'waiting_on_ai', 'waiting_on_human', 'resolved', 'blocked')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  escalation_reason text,
  last_message_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_ai_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  direction text NOT NULL
    CHECK (direction IN ('inbound', 'outbound')),
  sender_type text NOT NULL
    CHECK (sender_type IN ('user', 'ai', 'admin', 'system')),
  body text,
  message_type text NOT NULL DEFAULT 'text',
  provider_message_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_confidence real,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_support_threads_status_last_message_at
  ON support_threads(status, last_message_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_threads_channel_wa_id
  ON support_threads(channel, wa_id);

CREATE INDEX IF NOT EXISTS idx_support_threads_assigned_status_last_message_at
  ON support_threads(assigned_to, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_threads_user_id
  ON support_threads(user_id);

CREATE INDEX IF NOT EXISTS idx_support_threads_phone
  ON support_threads(phone);

CREATE INDEX IF NOT EXISTS idx_support_threads_wa_id
  ON support_threads(wa_id);

CREATE INDEX IF NOT EXISTS idx_support_messages_thread_created_at
  ON support_messages(thread_id, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_messages_provider_message_id
  ON support_messages(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

GRANT SELECT ON support_threads, support_messages TO authenticated;
GRANT ALL ON support_threads, support_messages TO service_role;

ALTER TABLE support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE support_threads FROM anon, authenticated;
REVOKE ALL ON TABLE support_messages FROM anon, authenticated;

ALTER TABLE admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_target_type_check;

ALTER TABLE admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_target_type_check
  CHECK (target_type IN ('user', 'match', 'tournament', 'queue', 'lobby', 'support', 'system'));
