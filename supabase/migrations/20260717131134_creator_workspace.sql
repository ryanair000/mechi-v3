CREATE TABLE IF NOT EXISTS creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 60),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 400),
  creator_types text[] NOT NULL DEFAULT ARRAY['streamer']::text[],
  games text[] NOT NULL DEFAULT '{}'::text[],
  platform_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'pending_verification', 'verified', 'rejected', 'suspended')),
  availability text NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'limited', 'unavailable')),
  verification_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creator_profiles_types_check CHECK (
    cardinality(creator_types) > 0
    AND creator_types <@ ARRAY['streamer', 'commentator', 'video_creator', 'coach']::text[]
  ),
  CONSTRAINT creator_profiles_links_object_check CHECK (jsonb_typeof(platform_links) = 'object')
);

CREATE TABLE IF NOT EXISTS creator_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  content_type text NOT NULL CHECK (content_type IN ('clip', 'video', 'stream', 'post')),
  platform text NOT NULL DEFAULT 'other'
    CHECK (platform IN ('youtube', 'twitch', 'tiktok', 'instagram', 'facebook', 'x', 'other')),
  external_url text NOT NULL CHECK (external_url ~ '^https?://'),
  thumbnail_url text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  engagement integer NOT NULL DEFAULT 0 CHECK (engagement >= 0),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS creator_coverage_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  assignment_type text NOT NULL DEFAULT 'stream'
    CHECK (assignment_type IN ('stream', 'commentary', 'highlights', 'interview', 'social')),
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'accepted', 'declined', 'live', 'completed', 'cancelled')),
  scheduled_for timestamptz,
  sponsor_name text,
  brief text CHECK (char_length(brief) <= 1200),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT creator_coverage_target_check CHECK (tournament_id IS NOT NULL OR match_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_status ON creator_profiles(status);
CREATE INDEX IF NOT EXISTS idx_creator_content_creator_created
  ON creator_content(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_content_status_published
  ON creator_content(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_coverage_creator_schedule
  ON creator_coverage_assignments(creator_id, scheduled_for ASC);
CREATE INDEX IF NOT EXISTS idx_creator_coverage_status
  ON creator_coverage_assignments(status, scheduled_for ASC);

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_coverage_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE creator_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE creator_content FROM anon, authenticated;
REVOKE ALL ON TABLE creator_coverage_assignments FROM anon, authenticated;
GRANT ALL ON creator_profiles, creator_content, creator_coverage_assignments TO service_role;
