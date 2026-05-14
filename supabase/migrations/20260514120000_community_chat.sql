CREATE TABLE IF NOT EXISTS community_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_locked boolean NOT NULL DEFAULT false,
  pinned_message_id uuid,
  locked_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  locked_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS community_room_members (
  room_id uuid NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  last_notified_at timestamptz,
  muted_until timestamptz,
  muted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sender_type text NOT NULL
    CHECK (sender_type IN ('user', 'moderator', 'admin', 'system')),
  message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'announcement', 'system')),
  body text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE community_rooms
  DROP CONSTRAINT IF EXISTS community_rooms_pinned_message_id_fkey;

ALTER TABLE community_rooms
  ADD CONSTRAINT community_rooms_pinned_message_id_fkey
  FOREIGN KEY (pinned_message_id) REFERENCES community_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_community_messages_room_created_at
  ON community_messages(room_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_community_room_members_room_id
  ON community_room_members(room_id);

CREATE INDEX IF NOT EXISTS idx_community_room_members_user_id
  ON community_room_members(user_id);

CREATE INDEX IF NOT EXISTS idx_community_room_members_muted_until
  ON community_room_members(room_id, muted_until);

GRANT SELECT ON community_rooms TO authenticated;
GRANT SELECT ON community_room_members TO authenticated;
GRANT SELECT ON community_messages TO authenticated;
GRANT ALL ON community_rooms TO service_role;
GRANT ALL ON community_room_members TO service_role;
GRANT ALL ON community_messages TO service_role;

ALTER TABLE community_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE community_rooms FROM anon, authenticated;
REVOKE ALL ON TABLE community_room_members FROM anon, authenticated;
REVOKE ALL ON TABLE community_messages FROM anon, authenticated;

INSERT INTO community_rooms (slug, name, description)
VALUES (
  'global',
  'Mechi Community',
  'The main Mechi community room for match-night updates, banter, and operator announcements.'
)
ON CONFLICT (slug) DO NOTHING;
