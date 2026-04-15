ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'elite')),
  ADD COLUMN IF NOT EXISTS plan_since timestamptz,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('pro', 'elite')),
  billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_kes integer NOT NULL CHECK (amount_kes >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'failed')),
  paystack_ref text UNIQUE,
  started_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS match_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  match_count integer NOT NULL DEFAULT 0 CHECK (match_count >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires_at ON profiles(plan_expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paystack_ref ON subscriptions(paystack_ref);
CREATE INDEX IF NOT EXISTS idx_match_usage_user_date ON match_usage(user_id, date DESC);

CREATE OR REPLACE FUNCTION increment_match_usage(p_user_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO match_usage (user_id, date, match_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET match_count = match_usage.match_count + 1;
END;
$$;

GRANT SELECT ON subscriptions, match_usage TO authenticated;
GRANT ALL ON subscriptions, match_usage TO service_role;
GRANT EXECUTE ON FUNCTION increment_match_usage(uuid, date) TO service_role;
