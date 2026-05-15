ALTER TABLE public.online_tournament_registrations
  DROP CONSTRAINT IF EXISTS online_tournament_registrations_game_check;

ALTER TABLE public.online_tournament_registrations
  ADD CONSTRAINT online_tournament_registrations_game_check
  CHECK (game IN ('pubgm', 'codm', 'efootball', 'mystery'));

CREATE INDEX IF NOT EXISTS idx_online_tournament_registrations_payment_reference
  ON public.online_tournament_registrations(event_slug, payment_reference)
  WHERE payment_reference IS NOT NULL;

UPDATE public.weekend_cup_ballots
SET
  title = 'Mystery Game Vote',
  subtitle = 'Pick the fourth Season 1 game',
  theme_label = 'Mystery slot',
  date_label = '29-31 May 2026',
  status = 'open',
  updated_at = timezone('utc', now())
WHERE slug = 'weekend-cup-1-mobile';

DELETE FROM public.weekend_cup_ballot_votes votes
USING public.weekend_cup_ballot_options options,
      public.weekend_cup_ballots ballots
WHERE votes.ballot_option_id = options.id
  AND options.ballot_id = ballots.id
  AND ballots.slug = 'weekend-cup-1-mobile'
  AND options.slug IN ('pubgm', 'codm', 'efootball');

DELETE FROM public.weekend_cup_ballot_options options
USING public.weekend_cup_ballots ballots
WHERE options.ballot_id = ballots.id
  AND ballots.slug = 'weekend-cup-1-mobile'
  AND options.slug IN ('pubgm', 'codm', 'efootball');

INSERT INTO public.weekend_cup_ballot_options (
  ballot_id,
  slug,
  label,
  platform,
  description,
  is_official
)
VALUES
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-1-mobile'), 'free-fire', 'Free Fire', 'mobile', 'Fast lobbies, quick smoke, huge casual pull.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-1-mobile'), 'ludo', 'Ludo', 'mobile', 'Quick rounds, easy entry, noisy finals energy.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-1-mobile'), 'ea-sports-fc-26', 'EA SPORTS FC 26', 'console', 'Controller classics, easy storylines, strong local banter.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-1-mobile'), 'mortal-kombat', 'Mortal Kombat', 'console', 'Fast sets, loud moments, clean bracket pressure.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-1-mobile'), 'rocket-league', 'Rocket League', 'console', 'Short matches, clutch goals, easy highlights.', true)
ON CONFLICT (ballot_id, slug) DO UPDATE
SET
  label = EXCLUDED.label,
  platform = EXCLUDED.platform,
  description = EXCLUDED.description,
  is_official = EXCLUDED.is_official,
  updated_at = timezone('utc', now());

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
  ELSIF NEW.event_slug = 'playmechi-weekend-cup-season-1-2026-05-29' THEN
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
      WHEN 'mystery' THEN
        registration_cap := 80;
        check_in_cap := 80;
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
