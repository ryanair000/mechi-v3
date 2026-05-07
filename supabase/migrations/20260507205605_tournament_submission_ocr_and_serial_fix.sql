UPDATE public.online_tournament_registrations
SET device_serial_last6 = CASE
  WHEN device_serial_last6 IS NULL THEN NULL
  WHEN length(regexp_replace(device_serial_last6, '[^A-Za-z0-9]', '', 'g')) >= 6
    THEN upper(right(regexp_replace(device_serial_last6, '[^A-Za-z0-9]', '', 'g'), 6))
  ELSE NULL
END
WHERE device_serial_last6 IS NOT NULL;

ALTER TABLE public.online_tournament_registrations
  DROP CONSTRAINT IF EXISTS online_tournament_registrations_device_serial_last6_check;

ALTER TABLE public.online_tournament_registrations
  ADD CONSTRAINT online_tournament_registrations_device_serial_last6_check
  CHECK (device_serial_last6 IS NULL OR device_serial_last6 ~ '^[A-Z0-9]{6}$');

ALTER TABLE public.online_tournament_result_submissions
  ADD COLUMN IF NOT EXISTS ocr_status text
    CHECK (ocr_status IS NULL OR ocr_status IN ('pending', 'complete', 'failed')),
  ADD COLUMN IF NOT EXISTS ocr_text text,
  ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
  ADD COLUMN IF NOT EXISTS ocr_kills integer
    CHECK (ocr_kills IS NULL OR ocr_kills >= 0),
  ADD COLUMN IF NOT EXISTS ocr_placement integer
    CHECK (ocr_placement IS NULL OR ocr_placement > 0),
  ADD COLUMN IF NOT EXISTS ocr_error text,
  ADD COLUMN IF NOT EXISTS ocr_scanned_at timestamptz;

UPDATE public.online_tournament_result_submissions
SET ocr_status = 'pending'
WHERE game = 'codm'
  AND screenshot_url IS NOT NULL
  AND ocr_status IS NULL;
