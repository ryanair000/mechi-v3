-- Mechi uses server-side sessions and a service-role Supabase client for these RPCs.
-- No browser/Data API role should be able to call an application function directly.
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, so named-role
-- revocations alone are not sufficient.

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
-- These functions were originally SECURITY DEFINER even though every application
-- call is made by service_role. Running as the caller removes the unnecessary
-- privilege elevation while preserving the atomic database operation.
alter function public.apply_reward_event(
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
) security invoker;
alter function public.finalize_match_with_gamification(
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
) security invoker;
alter function public.increment_match_usage(uuid, date) security invoker;
alter function public.increment_match_usage(uuid, date) set search_path = public;
alter function public.check_rate_limit_attempt(text, integer, integer) security invoker;
alter function public.check_rate_limit_attempt(text, integer, integer) set search_path = public;
grant execute on function public.apply_reward_event(
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
) to service_role;
grant execute on function public.finalize_match_with_gamification(
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
) to service_role;
grant execute on function public.increment_match_usage(uuid, date) to service_role;
grant execute on function public.check_rate_limit_attempt(text, integer, integer) to service_role;
-- Fail the migration rather than recording a false hardening state.
do $$
declare
  exposed_function text;
  required_function regprocedure;
begin
  select p.oid::regprocedure::text
  into exposed_function
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (
      has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute')
    )
  order by p.oid::regprocedure::text
  limit 1;

  if exposed_function is not null then
    raise exception 'Data API role can still execute public function %', exposed_function;
  end if;

  foreach required_function in array array[
    'public.apply_reward_event(uuid,text,text,integer,integer,integer,text,uuid,uuid,text,jsonb)'::regprocedure,
    'public.finalize_match_with_gamification(uuid,uuid,integer,integer,integer,integer,text,text,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,date,text[],text[],jsonb,jsonb)'::regprocedure,
    'public.increment_match_usage(uuid,date)'::regprocedure,
    'public.check_rate_limit_attempt(text,integer,integer)'::regprocedure
  ]
  loop
    if not has_function_privilege('service_role', required_function, 'execute') then
      raise exception 'service_role is missing EXECUTE on %', required_function;
    end if;
  end loop;
end;
$$;
