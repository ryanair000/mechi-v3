CREATE TABLE IF NOT EXISTS test_issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  page_path text NOT NULL,
  page_url text,
  description text NOT NULL,
  screenshot_url text NOT NULL,
  screenshot_public_id text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'triaged', 'in_progress', 'resolved', 'closed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_test_issue_reports_status_created_at
  ON test_issue_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_issue_reports_user_id
  ON test_issue_reports(user_id);

CREATE OR REPLACE FUNCTION set_test_issue_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS test_issue_reports_set_updated_at ON test_issue_reports;

CREATE TRIGGER test_issue_reports_set_updated_at
  BEFORE UPDATE ON test_issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_test_issue_reports_updated_at();

REVOKE ALL ON TABLE test_issue_reports FROM anon, authenticated;
GRANT ALL ON test_issue_reports TO service_role;

ALTER TABLE test_issue_reports ENABLE ROW LEVEL SECURITY;
