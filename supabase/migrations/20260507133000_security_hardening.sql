ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.achievements TO service_role;
REVOKE ALL ON public.achievements FROM anon, authenticated;

ALTER FUNCTION public.increment_match_usage(uuid, date) SET search_path = public;
ALTER FUNCTION public.set_bounties_updated_at() SET search_path = public;
ALTER FUNCTION public.set_test_issue_reports_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.apply_reward_event(
  uuid,
  text,
  text,
  integer,
  integer,
  integer,
  text,
  uuid,
  uuid,
  text,
  jsonb
) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.finalize_match_with_gamification(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  date,
  text[],
  text[],
  jsonb,
  jsonb
) FROM anon, authenticated;
