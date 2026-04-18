ALTER TABLE admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_target_type_check;

ALTER TABLE admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_target_type_check
  CHECK (target_type IN ('user', 'match', 'tournament', 'queue', 'lobby', 'system'));
