CREATE OR REPLACE FUNCTION public.enforce_tournament_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.entry_fee = 0 THEN
    IF NEW.prize_pool_mode = 'specified' OR NEW.prize_pool > 0 THEN
      RAISE EXCEPTION 'FREE_TOURNAMENT_CANNOT_HAVE_REWARD';
    END IF;

    NEW.prize_pool_mode := 'auto';
    NEW.prize_pool := 0;
    NEW.platform_fee := 0;
    NEW.platform_fee_rate := 0;
    NEW.approval_status := 'approved';
    NEW.approved_at := COALESCE(NEW.approved_at, timezone('utc', now()));
    NEW.approved_by := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.approval_status := 'pending';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.is_featured := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tournament_policy_trigger ON public.tournaments;
CREATE TRIGGER enforce_tournament_policy_trigger
  BEFORE INSERT OR UPDATE OF entry_fee, prize_pool_mode, prize_pool, approval_status
  ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_tournament_policy();

CREATE OR REPLACE FUNCTION public.enforce_paid_tournament_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_entry_fee integer;
  v_approval_status text;
BEGIN
  IF NEW.payment_status NOT IN ('pending', 'paid') THEN
    RETURN NEW;
  END IF;

  SELECT entry_fee, approval_status
    INTO v_entry_fee, v_approval_status
    FROM public.tournaments
   WHERE id = NEW.tournament_id;

  IF v_entry_fee > 0 AND v_approval_status <> 'approved' THEN
    RAISE EXCEPTION 'PAID_TOURNAMENT_NOT_APPROVED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_paid_tournament_approval_trigger
  ON public.tournament_players;
CREATE TRIGGER enforce_paid_tournament_approval_trigger
  BEFORE INSERT OR UPDATE OF payment_status, tournament_id
  ON public.tournament_players
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_paid_tournament_approval();

