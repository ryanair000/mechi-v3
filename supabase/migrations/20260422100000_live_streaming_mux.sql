CREATE TABLE IF NOT EXISTS live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  streamer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mux_stream_id text NOT NULL UNIQUE,
  mux_playback_id text NOT NULL,
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'ended')),
  title text NOT NULL,
  viewer_count integer NOT NULL DEFAULT 0 CHECK (viewer_count >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  recording_playback_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT live_streams_target_check CHECK (tournament_id IS NOT NULL OR match_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS stream_watch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_heartbeat_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  rp_awarded integer NOT NULL DEFAULT 0 CHECK (rp_awarded >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_streams_tournament_id
  ON live_streams(tournament_id);

CREATE INDEX IF NOT EXISTS idx_live_streams_match_id
  ON live_streams(match_id);

CREATE INDEX IF NOT EXISTS idx_live_streams_streamer_id
  ON live_streams(streamer_id);

CREATE INDEX IF NOT EXISTS idx_live_streams_status_created_at
  ON live_streams(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_streams_updated_at
  ON live_streams(updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_streams_active_tournament_unique
  ON live_streams(tournament_id)
  WHERE tournament_id IS NOT NULL AND status <> 'ended';

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_streams_active_match_unique
  ON live_streams(match_id)
  WHERE match_id IS NOT NULL AND status <> 'ended';

CREATE INDEX IF NOT EXISTS idx_stream_watch_sessions_last_heartbeat_at
  ON stream_watch_sessions(last_heartbeat_at DESC);

GRANT SELECT ON live_streams TO authenticated;
GRANT ALL ON live_streams, stream_watch_sessions TO service_role;

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_watch_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_streams_select_authenticated ON live_streams;

CREATE POLICY live_streams_select_authenticated
  ON live_streams
  FOR SELECT
  TO authenticated
  USING (true);
