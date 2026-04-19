REVOKE ALL ON TABLE notifications FROM anon, authenticated;
REVOKE ALL ON TABLE match_challenges FROM anon, authenticated;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON notifications;
DROP POLICY IF EXISTS notifications_update_own ON notifications;
DROP POLICY IF EXISTS match_challenges_select_party ON match_challenges;

CREATE POLICY notifications_select_own
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY notifications_update_own
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY match_challenges_select_party
  ON match_challenges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
