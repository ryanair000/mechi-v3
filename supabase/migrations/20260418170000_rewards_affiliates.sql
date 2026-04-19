ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reward_points_available integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_points_pending integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_points_lifetime integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chezahub_user_id uuid,
  ADD COLUMN IF NOT EXISTS chezahub_linked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_chezahub_user_id_idx
  ON profiles (chezahub_user_id)
  WHERE chezahub_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS reward_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  source text,
  available_delta integer NOT NULL DEFAULT 0,
  pending_delta integer NOT NULL DEFAULT 0,
  lifetime_delta integer NOT NULL DEFAULT 0,
  related_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  related_match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  related_order_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT reward_events_non_zero_delta CHECK (
    available_delta <> 0 OR pending_delta <> 0 OR lifetime_delta <> 0
  )
);

CREATE INDEX IF NOT EXISTS reward_events_user_created_idx
  ON reward_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reward_events_related_order_idx
  ON reward_events (related_order_id)
  WHERE related_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chezahub_user_id uuid,
  first_order_id text UNIQUE,
  order_total_kes numeric(10, 2),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'completed', 'reversed', 'flagged')),
  suspicious_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  qualified_at timestamptz,
  completed_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(invitee_user_id)
);

CREATE INDEX IF NOT EXISTS referral_conversions_inviter_idx
  ON referral_conversions (inviter_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS referral_conversions_invitee_idx
  ON referral_conversions (invitee_user_id);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id text NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('discount_code', 'reward_claim')),
  title text NOT NULL,
  code text,
  points_cost integer NOT NULL CHECK (points_cost > 0),
  external_issuance_id text UNIQUE,
  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'claimed', 'void', 'reversed', 'expired')),
  expires_at timestamptz,
  chezahub_order_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS reward_redemptions_user_created_idx
  ON reward_redemptions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reward_redemptions_status_idx
  ON reward_redemptions (status, expires_at);

CREATE TABLE IF NOT EXISTS reward_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS reward_review_queue_status_idx
  ON reward_review_queue (status, created_at DESC);

CREATE OR REPLACE FUNCTION apply_reward_event(
  p_user_id uuid,
  p_event_key text,
  p_event_type text,
  p_available_delta integer,
  p_pending_delta integer,
  p_lifetime_delta integer,
  p_source text DEFAULT NULL,
  p_related_user_id uuid DEFAULT NULL,
  p_related_match_id uuid DEFAULT NULL,
  p_related_order_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT *
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF COALESCE(v_profile.reward_points_available, 0) + p_available_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient available reward points';
  END IF;

  IF COALESCE(v_profile.reward_points_pending, 0) + p_pending_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient pending reward points';
  END IF;

  IF COALESCE(v_profile.reward_points_lifetime, 0) + p_lifetime_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient lifetime reward points';
  END IF;

  BEGIN
    INSERT INTO reward_events (
      user_id,
      event_key,
      event_type,
      source,
      available_delta,
      pending_delta,
      lifetime_delta,
      related_user_id,
      related_match_id,
      related_order_id,
      metadata
    )
    VALUES (
      p_user_id,
      p_event_key,
      p_event_type,
      p_source,
      p_available_delta,
      p_pending_delta,
      p_lifetime_delta,
      p_related_user_id,
      p_related_match_id,
      p_related_order_id,
      COALESCE(p_metadata, '{}'::jsonb)
    );
  EXCEPTION
    WHEN unique_violation THEN
      SELECT *
      INTO v_profile
      FROM profiles
      WHERE id = p_user_id;

      RETURN jsonb_build_object(
        'inserted', false,
        'available', COALESCE(v_profile.reward_points_available, 0),
        'pending', COALESCE(v_profile.reward_points_pending, 0),
        'lifetime', COALESCE(v_profile.reward_points_lifetime, 0)
      );
  END;

  UPDATE profiles
  SET
    reward_points_available = COALESCE(reward_points_available, 0) + p_available_delta,
    reward_points_pending = COALESCE(reward_points_pending, 0) + p_pending_delta,
    reward_points_lifetime = COALESCE(reward_points_lifetime, 0) + p_lifetime_delta
  WHERE id = p_user_id
  RETURNING *
  INTO v_profile;

  RETURN jsonb_build_object(
    'inserted', true,
    'available', COALESCE(v_profile.reward_points_available, 0),
    'pending', COALESCE(v_profile.reward_points_pending, 0),
    'lifetime', COALESCE(v_profile.reward_points_lifetime, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_reward_event(
  uuid,
  text,
  text,
  integer,
  integer,
  integer,
  text,
  uuid,
  uuid,
  text,
  jsonb
) TO authenticated, service_role;
