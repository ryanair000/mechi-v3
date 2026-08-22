-- Keep the Passport summary read model current when authoritative sources
-- change. Public rendering consumes this row instead of issuing repeated
-- aggregate count queries on every anonymous request.

CREATE OR REPLACE FUNCTION private.refresh_passport_profile_summary_counts(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.passport_profile_summaries (
    user_id,
    tournaments_registered,
    events_attended,
    completed_events,
    achievements_count,
    badges_count,
    teams_count,
    computed_at
  )
  SELECT
    profile.id,
    (
      SELECT count(*)::integer
      FROM public.tournament_players player
      WHERE player.user_id = profile.id
        AND player.payment_status IN ('paid', 'free')
    ) + (
      SELECT count(*)::integer
      FROM public.online_tournament_registrations registration
      WHERE registration.user_id = profile.id
    ),
    (
      SELECT count(*)::integer
      FROM public.tournament_players player
      WHERE player.user_id = profile.id
        AND player.check_in_status = 'checked_in'
    ) + (
      SELECT count(*)::integer
      FROM public.online_tournament_registrations registration
      WHERE registration.user_id = profile.id
        AND registration.check_in_status = 'checked_in'
    ),
    (
      SELECT count(*)::integer
      FROM public.tournament_players player
      JOIN public.tournaments tournament ON tournament.id = player.tournament_id
      WHERE player.user_id = profile.id
        AND player.check_in_status = 'checked_in'
        AND tournament.status = 'completed'
    ),
    (
      SELECT count(*)::integer
      FROM public.achievements achievement
      WHERE achievement.user_id = profile.id
    ),
    (
      SELECT count(*)::integer
      FROM public.profile_badges badge
      WHERE badge.user_id = profile.id
    ),
    (
      SELECT count(*)::integer
      FROM public.team_members membership
      JOIN public.teams team ON team.id = membership.team_id
      WHERE membership.user_id = profile.id
        AND membership.status = 'active'
        AND team.visibility = 'public'
    ),
    timezone('utc', now())
  FROM public.profiles profile
  WHERE profile.id = p_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    tournaments_registered = EXCLUDED.tournaments_registered,
    events_attended = EXCLUDED.events_attended,
    completed_events = EXCLUDED.completed_events,
    achievements_count = EXCLUDED.achievements_count,
    badges_count = EXCLUDED.badges_count,
    teams_count = EXCLUDED.teams_count,
    computed_at = EXCLUDED.computed_at;
END;
$$;

CREATE OR REPLACE FUNCTION private.refresh_passport_summary_from_user_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM private.refresh_passport_profile_summary_counts(OLD.user_id);
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM private.refresh_passport_profile_summary_counts(NEW.user_id);
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    PERFORM private.refresh_passport_profile_summary_counts(OLD.user_id);
    PERFORM private.refresh_passport_profile_summary_counts(NEW.user_id);
  ELSE
    PERFORM private.refresh_passport_profile_summary_counts(NEW.user_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.refresh_passport_summary_from_tournament()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected_user_id uuid;
BEGIN
  FOR affected_user_id IN
    SELECT DISTINCT player.user_id
    FROM public.tournament_players player
    WHERE player.tournament_id = NEW.id
  LOOP
    PERFORM private.refresh_passport_profile_summary_counts(affected_user_id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.refresh_passport_summary_from_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected_user_id uuid;
BEGIN
  FOR affected_user_id IN
    SELECT DISTINCT membership.user_id
    FROM public.team_members membership
    WHERE membership.team_id = NEW.id
  LOOP
    PERFORM private.refresh_passport_profile_summary_counts(affected_user_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tournament_players_refresh_passport_summary ON public.tournament_players;
CREATE TRIGGER tournament_players_refresh_passport_summary
AFTER INSERT OR UPDATE OR DELETE ON public.tournament_players
FOR EACH ROW EXECUTE FUNCTION private.refresh_passport_summary_from_user_source();

DROP TRIGGER IF EXISTS online_registrations_refresh_passport_summary ON public.online_tournament_registrations;
CREATE TRIGGER online_registrations_refresh_passport_summary
AFTER INSERT OR UPDATE OR DELETE ON public.online_tournament_registrations
FOR EACH ROW EXECUTE FUNCTION private.refresh_passport_summary_from_user_source();

DROP TRIGGER IF EXISTS achievements_refresh_passport_summary ON public.achievements;
CREATE TRIGGER achievements_refresh_passport_summary
AFTER INSERT OR UPDATE OR DELETE ON public.achievements
FOR EACH ROW EXECUTE FUNCTION private.refresh_passport_summary_from_user_source();

DROP TRIGGER IF EXISTS profile_badges_refresh_passport_summary ON public.profile_badges;
CREATE TRIGGER profile_badges_refresh_passport_summary
AFTER INSERT OR UPDATE OR DELETE ON public.profile_badges
FOR EACH ROW EXECUTE FUNCTION private.refresh_passport_summary_from_user_source();

DROP TRIGGER IF EXISTS team_members_refresh_passport_summary ON public.team_members;
CREATE TRIGGER team_members_refresh_passport_summary
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION private.refresh_passport_summary_from_user_source();

DROP TRIGGER IF EXISTS tournaments_refresh_passport_summary ON public.tournaments;
CREATE TRIGGER tournaments_refresh_passport_summary
AFTER UPDATE OF status ON public.tournaments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION private.refresh_passport_summary_from_tournament();

DROP TRIGGER IF EXISTS teams_refresh_passport_summary ON public.teams;
CREATE TRIGGER teams_refresh_passport_summary
AFTER UPDATE OF visibility ON public.teams
FOR EACH ROW
WHEN (OLD.visibility IS DISTINCT FROM NEW.visibility)
EXECUTE FUNCTION private.refresh_passport_summary_from_team();

WITH generic_events AS (
  SELECT
    player.user_id,
    count(*) FILTER (WHERE player.payment_status IN ('paid', 'free'))::integer AS registered,
    count(*) FILTER (WHERE player.check_in_status = 'checked_in')::integer AS attended,
    count(*) FILTER (
      WHERE player.check_in_status = 'checked_in'
        AND tournament.status = 'completed'
    )::integer AS completed
  FROM public.tournament_players player
  JOIN public.tournaments tournament ON tournament.id = player.tournament_id
  GROUP BY player.user_id
), online_events AS (
  SELECT
    registration.user_id,
    count(*)::integer AS registered,
    count(*) FILTER (WHERE registration.check_in_status = 'checked_in')::integer AS attended
  FROM public.online_tournament_registrations registration
  GROUP BY registration.user_id
), achievement_totals AS (
  SELECT achievement.user_id, count(*)::integer AS total
  FROM public.achievements achievement
  GROUP BY achievement.user_id
), badge_totals AS (
  SELECT badge.user_id, count(*)::integer AS total
  FROM public.profile_badges badge
  GROUP BY badge.user_id
), public_team_totals AS (
  SELECT membership.user_id, count(*)::integer AS total
  FROM public.team_members membership
  JOIN public.teams team ON team.id = membership.team_id
  WHERE membership.status = 'active'
    AND team.visibility = 'public'
  GROUP BY membership.user_id
)
INSERT INTO public.passport_profile_summaries (
  user_id,
  tournaments_registered,
  events_attended,
  completed_events,
  achievements_count,
  badges_count,
  teams_count,
  computed_at
)
SELECT
  profile.id,
  coalesce(generic_events.registered, 0) + coalesce(online_events.registered, 0),
  coalesce(generic_events.attended, 0) + coalesce(online_events.attended, 0),
  coalesce(generic_events.completed, 0),
  coalesce(achievement_totals.total, 0),
  coalesce(badge_totals.total, 0),
  coalesce(public_team_totals.total, 0),
  timezone('utc', now())
FROM public.profiles profile
LEFT JOIN generic_events ON generic_events.user_id = profile.id
LEFT JOIN online_events ON online_events.user_id = profile.id
LEFT JOIN achievement_totals ON achievement_totals.user_id = profile.id
LEFT JOIN badge_totals ON badge_totals.user_id = profile.id
LEFT JOIN public_team_totals ON public_team_totals.user_id = profile.id
ON CONFLICT (user_id) DO UPDATE SET
  tournaments_registered = EXCLUDED.tournaments_registered,
  events_attended = EXCLUDED.events_attended,
  completed_events = EXCLUDED.completed_events,
  achievements_count = EXCLUDED.achievements_count,
  badges_count = EXCLUDED.badges_count,
  teams_count = EXCLUDED.teams_count,
  computed_at = EXCLUDED.computed_at;

REVOKE ALL ON FUNCTION private.refresh_passport_profile_summary_counts(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.refresh_passport_summary_from_user_source()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.refresh_passport_summary_from_tournament()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.refresh_passport_summary_from_team()
  FROM PUBLIC, anon, authenticated;
