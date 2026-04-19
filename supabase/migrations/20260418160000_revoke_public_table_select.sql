REVOKE ALL ON TABLE
  profiles,
  queue,
  matches,
  lobbies,
  lobby_members,
  suggestions,
  suggestion_votes,
  tournaments,
  tournament_players,
  tournament_matches,
  notifications,
  match_challenges,
  support_threads,
  support_messages,
  subscriptions,
  match_usage,
  admin_audit_logs,
  rate_limit_attempts
FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT ON TABLES FROM anon, authenticated;
