REVOKE ALL ON TABLE subscriptions, match_usage, admin_audit_logs FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION finalize_match_with_gamification(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  date,
  text[],
  text[],
  jsonb,
  jsonb
) FROM anon, authenticated;
