-- Phase 3: serialize direct-challenge acceptance and prevent duplicate live invites.

WITH ranked_pending AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        least(challenger_id, opponent_id),
        greatest(challenger_id, opponent_id),
        game,
        platform
      ORDER BY created_at, id
    ) AS pending_rank
  FROM public.match_challenges
  WHERE status = 'pending'
)
UPDATE public.match_challenges AS challenge
SET
  status = 'expired',
  responded_at = coalesce(challenge.responded_at, timezone('utc', now()))
FROM ranked_pending
WHERE challenge.id = ranked_pending.id
  AND ranked_pending.pending_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_challenges_one_pending_pair
  ON public.match_challenges (
    least(challenger_id, opponent_id),
    greatest(challenger_id, opponent_id),
    game,
    platform
  )
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.accept_match_challenge(
  p_challenge_id uuid,
  p_actor_id uuid,
  p_region text
)
RETURNS TABLE (
  challenge_id uuid,
  challenge_status text,
  match_id uuid,
  replayed boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_challenge public.match_challenges%ROWTYPE;
  v_match_id uuid;
BEGIN
  SELECT challenge.*
  INTO v_challenge
  FROM public.match_challenges AS challenge
  WHERE challenge.id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_challenge.opponent_id <> p_actor_id THEN
    RAISE EXCEPTION 'CHALLENGE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_challenge.status = 'accepted' AND v_challenge.match_id IS NOT NULL THEN
    RETURN QUERY
    SELECT v_challenge.id, v_challenge.status, v_challenge.match_id, true;
    RETURN;
  END IF;

  IF v_challenge.status <> 'pending' THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_PENDING:%', v_challenge.status USING ERRCODE = 'P0001';
  END IF;

  IF v_challenge.expires_at <= timezone('utc', now()) THEN
    UPDATE public.match_challenges AS challenge
    SET
      status = 'expired',
      responded_at = timezone('utc', now())
    WHERE challenge.id = v_challenge.id
      AND challenge.status = 'pending';

    RETURN QUERY
    SELECT v_challenge.id, 'expired'::text, NULL::uuid, false;
    RETURN;
  END IF;

  -- Lock both player rows in stable order. This serializes different invites
  -- involving either player before checking for a conflicting live match.
  PERFORM profile.id
  FROM public.profiles AS profile
  WHERE profile.id IN (v_challenge.challenger_id, v_challenge.opponent_id)
  ORDER BY profile.id
  FOR UPDATE;

  IF (
    SELECT count(*)
    FROM public.profiles AS profile
    WHERE profile.id IN (v_challenge.challenger_id, v_challenge.opponent_id)
  ) <> 2 THEN
    RAISE EXCEPTION 'CHALLENGE_PLAYER_MISSING' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.queue AS queue_entry
    WHERE queue_entry.user_id IN (v_challenge.challenger_id, v_challenge.opponent_id)
      AND queue_entry.status = 'waiting'
  ) THEN
    RAISE EXCEPTION 'CHALLENGE_QUEUE_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.matches AS live_match
    WHERE live_match.status = 'pending'
      AND (
        live_match.player1_id IN (v_challenge.challenger_id, v_challenge.opponent_id)
        OR live_match.player2_id IN (v_challenge.challenger_id, v_challenge.opponent_id)
      )
  ) THEN
    RAISE EXCEPTION 'CHALLENGE_MATCH_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.matches (
    player1_id,
    player2_id,
    game,
    platform,
    region,
    status
  )
  VALUES (
    v_challenge.challenger_id,
    v_challenge.opponent_id,
    v_challenge.game,
    v_challenge.platform,
    coalesce(nullif(btrim(p_region), ''), 'Unspecified'),
    'pending'
  )
  RETURNING id INTO v_match_id;

  UPDATE public.match_challenges AS challenge
  SET
    status = 'accepted',
    match_id = v_match_id,
    responded_at = timezone('utc', now())
  WHERE challenge.id = v_challenge.id;

  RETURN QUERY
  SELECT v_challenge.id, 'accepted'::text, v_match_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_match_challenge(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_match_challenge(uuid, uuid, text)
  TO service_role;
