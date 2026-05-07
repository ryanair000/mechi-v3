ALTER TABLE public.online_tournament_registrations
  ADD COLUMN IF NOT EXISTS tournament_lobby_number integer,
  ADD COLUMN IF NOT EXISTS tournament_lobby_slot integer,
  ADD COLUMN IF NOT EXISTS tournament_lobby_assigned_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'online_tournament_registrations_lobby_number_check'
      AND conrelid = 'public.online_tournament_registrations'::regclass
  ) THEN
    ALTER TABLE public.online_tournament_registrations
      ADD CONSTRAINT online_tournament_registrations_lobby_number_check
      CHECK (tournament_lobby_number IS NULL OR tournament_lobby_number > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'online_tournament_registrations_lobby_slot_check'
      AND conrelid = 'public.online_tournament_registrations'::regclass
  ) THEN
    ALTER TABLE public.online_tournament_registrations
      ADD CONSTRAINT online_tournament_registrations_lobby_slot_check
      CHECK (tournament_lobby_slot IS NULL OR tournament_lobby_slot > 0);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_online_tournament_checked_in_lobby_slot
  ON public.online_tournament_registrations(
    event_slug,
    game,
    tournament_lobby_number,
    tournament_lobby_slot
  )
  WHERE check_in_status = 'checked_in'
    AND tournament_lobby_number IS NOT NULL
    AND tournament_lobby_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_online_tournament_checked_in_lobby
  ON public.online_tournament_registrations(
    event_slug,
    game,
    check_in_status,
    tournament_lobby_number,
    tournament_lobby_slot
  );
WITH ranked AS (
  SELECT
    id,
    CASE WHEN game = 'efootball' THEN 16 ELSE 100 END AS lobby_size,
    row_number() OVER (
      PARTITION BY event_slug, game
      ORDER BY updated_at, created_at, id
    ) AS position
  FROM public.online_tournament_registrations
  WHERE check_in_status = 'checked_in'
    AND tournament_lobby_number IS NULL
    AND tournament_lobby_slot IS NULL
)
UPDATE public.online_tournament_registrations registrations
SET
  tournament_lobby_number = (((ranked.position - 1) / ranked.lobby_size)::integer + 1),
  tournament_lobby_slot = (((ranked.position - 1) % ranked.lobby_size)::integer + 1),
  tournament_lobby_assigned_at = COALESCE(registrations.tournament_lobby_assigned_at, registrations.updated_at, timezone('utc', now())),
  updated_at = timezone('utc', now())
FROM ranked
WHERE registrations.id = ranked.id;
