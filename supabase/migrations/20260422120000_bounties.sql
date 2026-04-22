CREATE TABLE IF NOT EXISTS bounties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  trigger_type text NOT NULL CHECK (
    trigger_type IN (
      'first_match_of_day',
      'win_streak_3',
      'matches_played_5_today',
      'tournament_register',
      'tournament_match_win',
      'tournament_complete_no_forfeit',
      'profile_complete',
      'referral_converted',
      'share_action',
      'first_voucher_redeem',
      'rp_milestone_1000',
      'leaderboard_top3',
      'stream_watch_10min',
      'stream_go_live_first',
      'feed_first_clip',
      'feed_post_5_likes',
      'follow_3_players'
    )
  ),
  trigger_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  prize_kes integer NOT NULL CHECK (prize_kes IN (50, 100, 200)),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'claimed', 'cancelled')),
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  paid_at timestamptz,
  activated_at timestamptz,
  week_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS bounty_claim_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id uuid NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  won boolean NOT NULL DEFAULT false,
  UNIQUE (bounty_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bounties_trigger_status_created
  ON bounties (trigger_type, status, activated_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bounties_status_created
  ON bounties (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bounty_claim_attempts_bounty_id
  ON bounty_claim_attempts (bounty_id);

CREATE INDEX IF NOT EXISTS idx_bounty_claim_attempts_user_attempted
  ON bounty_claim_attempts (user_id, attempted_at DESC);

CREATE OR REPLACE FUNCTION set_bounties_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bounties_set_updated_at ON bounties;

CREATE TRIGGER bounties_set_updated_at
  BEFORE UPDATE ON bounties
  FOR EACH ROW
  EXECUTE FUNCTION set_bounties_updated_at();

REVOKE ALL ON TABLE bounties, bounty_claim_attempts FROM anon, authenticated;
GRANT SELECT ON bounties TO authenticated;
GRANT ALL ON bounties, bounty_claim_attempts TO service_role;

ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounty_claim_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bounties_select_live_or_claimed ON bounties;

CREATE POLICY bounties_select_live_or_claimed
  ON bounties
  FOR SELECT
  TO authenticated
  USING (status IN ('active', 'claimed'));
