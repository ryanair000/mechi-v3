ALTER TABLE support_threads
  DROP CONSTRAINT IF EXISTS support_threads_channel_check;

ALTER TABLE support_threads
  ADD CONSTRAINT support_threads_channel_check
  CHECK (channel IN ('whatsapp', 'instagram'));

ALTER TABLE support_threads
  ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE support_threads
  ADD COLUMN IF NOT EXISTS contact_name text;
