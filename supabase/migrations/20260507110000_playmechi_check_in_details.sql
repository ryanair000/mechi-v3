ALTER TABLE public.online_tournament_registrations
  ADD COLUMN IF NOT EXISTS game_uid text,
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS device_serial_last6 text,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'online_tournament_registrations_device_serial_last6_check'
      AND conrelid = 'public.online_tournament_registrations'::regclass
  ) THEN
    ALTER TABLE public.online_tournament_registrations
      ADD CONSTRAINT online_tournament_registrations_device_serial_last6_check
      CHECK (device_serial_last6 IS NULL OR device_serial_last6 ~ '^[0-9]{6}$');
  END IF;
END $$;
