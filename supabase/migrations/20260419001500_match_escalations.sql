CREATE TABLE IF NOT EXISTS match_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL
    CHECK (reason IN ('setup_issue', 'stalling', 'wrong_result', 'abuse', 'other')),
  details text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_match_escalations_match_status_created
  ON match_escalations(match_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_escalations_requested_by
  ON match_escalations(requested_by, created_at DESC);

GRANT ALL ON match_escalations TO service_role;

ALTER TABLE match_escalations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE match_escalations FROM anon, authenticated;
