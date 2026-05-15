CREATE OR REPLACE FUNCTION public.enforce_playmechi_online_tournament_caps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  registration_cap integer;
  check_in_cap integer;
  requires_paid_confirmation boolean := false;
  registration_count integer;
  checked_in_count integer;
BEGIN
  IF NEW.event_slug = 'mechi-club-online-gaming-tournament-2026-05' THEN
    CASE NEW.game
      WHEN 'pubgm' THEN
        registration_cap := 200;
        check_in_cap := 100;
      WHEN 'codm' THEN
        registration_cap := 200;
        check_in_cap := 100;
      WHEN 'efootball' THEN
        registration_cap := 200;
        check_in_cap := 16;
      ELSE
        RETURN NEW;
    END CASE;
  ELSIF NEW.event_slug = 'playmechi-weekend-cup-season-1-2026-05-15' THEN
    requires_paid_confirmation := true;
    CASE NEW.game
      WHEN 'pubgm' THEN
        registration_cap := 80;
        check_in_cap := 80;
      WHEN 'codm' THEN
        registration_cap := 80;
        check_in_cap := 80;
      WHEN 'efootball' THEN
        registration_cap := 16;
        check_in_cap := 16;
      ELSE
        RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.event_slug), hashtext(NEW.game));

  IF
    coalesce(NEW.eligibility_status, 'pending') <> 'disqualified' AND
    (
      NOT requires_paid_confirmation OR
      coalesce(NEW.payment_status, 'pending_payment') = 'paid'
    )
  THEN
    SELECT count(*)
    INTO registration_count
    FROM public.online_tournament_registrations
    WHERE event_slug = NEW.event_slug
      AND game = NEW.game
      AND eligibility_status <> 'disqualified'
      AND (
        NOT requires_paid_confirmation OR
        payment_status = 'paid'
      )
      AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

    IF registration_count >= registration_cap THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'online_tournament_registration_cap_reached',
        DETAIL = format(
          'event_slug=%s game=%s registration_cap=%s',
          NEW.event_slug,
          NEW.game,
          registration_cap
        );
    END IF;
  END IF;

  IF NEW.check_in_status = 'checked_in' THEN
    SELECT count(*)
    INTO checked_in_count
    FROM public.online_tournament_registrations
    WHERE event_slug = NEW.event_slug
      AND game = NEW.game
      AND check_in_status = 'checked_in'
      AND (
        NOT requires_paid_confirmation OR
        payment_status = 'paid'
      )
      AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

    IF checked_in_count >= check_in_cap THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'online_tournament_check_in_cap_reached',
        DETAIL = format(
          'event_slug=%s game=%s check_in_cap=%s',
          NEW.event_slug,
          NEW.game,
          check_in_cap
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_playmechi_online_tournament_caps
  ON public.online_tournament_registrations;

CREATE TRIGGER trg_enforce_playmechi_online_tournament_caps
BEFORE INSERT OR UPDATE
ON public.online_tournament_registrations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_playmechi_online_tournament_caps();
