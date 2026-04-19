ALTER TABLE reward_review_queue
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_note text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS reward_review_queue_user_status_idx
  ON reward_review_queue (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS reward_review_queue_dedupe_key_idx
  ON reward_review_queue (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reward_review_queue_open_dedupe_idx
  ON reward_review_queue (dedupe_key)
  WHERE dedupe_key IS NOT NULL
    AND status IN ('open', 'reviewing');
