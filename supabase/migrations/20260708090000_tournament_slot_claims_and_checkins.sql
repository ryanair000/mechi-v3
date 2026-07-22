ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS check_in_status text NOT NULL DEFAULT 'registered'
    CHECK (check_in_status IN ('registered', 'checked_in', 'no_show'));

ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tournament_players_check_in_status
  ON public.tournament_players(tournament_id, check_in_status);

CREATE OR REPLACE FUNCTION public.claim_tournament_slot(
  p_tournament_id uuid,
  p_user_id uuid,
  p_payment_status text,
  p_payment_ref text DEFAULT NULL,
  p_payment_access_code text DEFAULT NULL
)
RETURNS TABLE (
  player_id uuid,
  player_payment_status text,
  player_joined_at timestamptz,
  player_inserted boolean,
  tournament_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_existing public.tournament_players%ROWTYPE;
  v_player public.tournament_players%ROWTYPE;
  v_reserved_count integer;
  v_joined_at timestamptz := timezone('utc', now());
BEGIN
  IF p_payment_status NOT IN ('pending', 'free') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS';
  END IF;

  SELECT *
    INTO v_tournament
    FROM public.tournaments
   WHERE id = p_tournament_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;

  IF v_tournament.status <> 'open' THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_OPEN';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.tournament_players
   WHERE tournament_id = p_tournament_id
     AND user_id = p_user_id
   FOR UPDATE;

  IF FOUND AND v_existing.payment_status IN ('paid', 'free') THEN
    RAISE EXCEPTION 'ALREADY_JOINED';
  END IF;

  IF FOUND AND v_existing.payment_status = 'pending' THEN
    RAISE EXCEPTION 'PAYMENT_PENDING';
  END IF;

  SELECT count(*)
    INTO v_reserved_count
    FROM public.tournament_players
   WHERE tournament_id = p_tournament_id
     AND payment_status IN ('pending', 'paid', 'free');

  IF v_reserved_count >= v_tournament.size THEN
    UPDATE public.tournaments
       SET status = 'full'
     WHERE id = p_tournament_id
       AND status = 'open';

    RAISE EXCEPTION 'TOURNAMENT_FULL';
  END IF;

  IF FOUND THEN
    UPDATE public.tournament_players
       SET payment_status = p_payment_status,
           payment_ref = p_payment_ref,
           payment_access_code = p_payment_access_code,
           check_in_status = 'registered',
           checked_in_at = NULL,
           joined_at = v_joined_at
     WHERE id = v_existing.id
     RETURNING *
      INTO v_player;

    player_inserted := false;
  ELSE
    INSERT INTO public.tournament_players (
      tournament_id,
      user_id,
      payment_status,
      payment_ref,
      payment_access_code,
      check_in_status,
      joined_at
    )
    VALUES (
      p_tournament_id,
      p_user_id,
      p_payment_status,
      p_payment_ref,
      p_payment_access_code,
      'registered',
      v_joined_at
    )
    RETURNING *
      INTO v_player;

    player_inserted := true;
  END IF;

  SELECT count(*)
    INTO v_reserved_count
    FROM public.tournament_players
   WHERE tournament_id = p_tournament_id
     AND payment_status IN ('pending', 'paid', 'free');

  IF v_reserved_count >= v_tournament.size THEN
    UPDATE public.tournaments
       SET status = 'full'
     WHERE id = p_tournament_id
       AND status = 'open';
    tournament_status := 'full';
  ELSE
    tournament_status := 'open';
  END IF;

  player_id := v_player.id;
  player_payment_status := v_player.payment_status;
  player_joined_at := v_player.joined_at;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_tournament_slot(uuid, uuid, text, text, text)
  TO service_role;
