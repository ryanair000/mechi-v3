-- Run after all Mechi V5 migrations in preview and production.
-- The script is read-only and raises on any release-blocking security regression.

do $$
declare
  violation text;
begin
  select p.oid::regprocedure::text
  into violation
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (
      has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute')
    )
  order by p.oid::regprocedure::text
  limit 1;

  if violation is not null then
    raise exception 'Data API role can execute public function %', violation;
  end if;

  select p.oid::regprocedure::text
  into violation
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
  order by p.oid::regprocedure::text
  limit 1;

  if violation is not null then
    raise exception 'SECURITY DEFINER function remains in exposed public schema: %', violation;
  end if;
end;
$$;

do $$
declare
  exposed_table text;
begin
  select c.oid::regclass::text
  into exposed_table
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and (
      has_table_privilege('anon', c.oid, 'select,insert,update,delete,truncate,references,trigger')
      or has_table_privilege('authenticated', c.oid, 'select,insert,update,delete,truncate,references,trigger')
    )
  order by c.oid::regclass::text
  limit 1;

  if exposed_table is not null then
    raise exception 'Data API role has direct privileges on public relation %', exposed_table;
  end if;
end;
$$;

do $$
declare
  table_name text;
begin
  select c.relname
  into table_name
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array[
      'workspaces',
      'workspace_members',
      'workspace_invitations',
      'workspace_preferences',
      'teams',
      'team_members',
      'team_roster_snapshots',
      'tournament_entries',
      'tournament_entry_members',
      'workspace_audit_events'
    ])
    and c.relkind = 'r'
    and not c.relrowsecurity
  order by c.relname
  limit 1;

  if table_name is not null then
    raise exception 'V5 table % does not have RLS enabled', table_name;
  end if;

  select c.relname
  into table_name
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array[
      'workspaces',
      'workspace_members',
      'workspace_invitations',
      'workspace_preferences',
      'teams',
      'team_members',
      'team_roster_snapshots',
      'tournament_entries',
      'tournament_entry_members',
      'workspace_audit_events'
    ])
    and c.relkind = 'r'
    and (
      has_table_privilege('anon', c.oid, 'select,insert,update,delete')
      or has_table_privilege('authenticated', c.oid, 'select,insert,update,delete')
    )
  order by c.relname
  limit 1;

  if table_name is not null then
    raise exception 'Data API role has direct privileges on V5 table %', table_name;
  end if;
end;
$$;

do $$
declare
  missing_index text;
begin
  select format('%s(%s)', c.conrelid::regclass, a.attname)
  into missing_index
  from pg_constraint as c
  join pg_attribute as a
    on a.attrelid = c.conrelid
   and a.attnum = any(c.conkey)
  where c.contype = 'f'
    and c.conrelid = any(array[
      'public.workspaces'::regclass,
      'public.workspace_members'::regclass,
      'public.workspace_invitations'::regclass,
      'public.workspace_preferences'::regclass,
      'public.teams'::regclass,
      'public.team_members'::regclass,
      'public.team_roster_snapshots'::regclass,
      'public.tournament_entries'::regclass,
      'public.tournament_entry_members'::regclass,
      'public.workspace_audit_events'::regclass
    ])
    and not exists (
      select 1
      from pg_index as i
      where i.indrelid = c.conrelid
        and a.attnum = any(i.indkey)
    )
  order by c.conrelid::regclass::text, a.attname
  limit 1;

  if missing_index is not null then
    raise exception 'V5 foreign key is missing an index: %', missing_index;
  end if;
end;
$$;

do $$
declare
  required_function regprocedure;
begin
  foreach required_function in array array[
    'public.apply_reward_event(uuid,text,text,integer,integer,integer,text,uuid,uuid,text,jsonb)'::regprocedure,
    'public.finalize_match_with_gamification(uuid,uuid,integer,integer,integer,integer,text,text,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,date,text[],text[],jsonb,jsonb)'::regprocedure,
    'public.increment_match_usage(uuid,date)'::regprocedure,
    'public.check_rate_limit_attempt(text,integer,integer)'::regprocedure,
    'public.create_v5_workspace(uuid,text,text,text)'::regprocedure,
    'public.create_v5_team_workspace(uuid,text,text,text,text,text)'::regprocedure,
    'public.update_v5_workspace(uuid,uuid,text,text,text,text,boolean,text)'::regprocedure,
    'public.archive_v5_workspace(uuid,uuid,text)'::regprocedure,
    'public.create_v5_workspace_invitation(uuid,uuid,uuid,text,text,text[],text,timestamp with time zone)'::regprocedure,
    'public.respond_v5_workspace_invitation(uuid,uuid,text)'::regprocedure,
    'public.update_v5_workspace_member(uuid,uuid,uuid,text,text[],text,text)'::regprocedure,
    'public.revoke_v5_workspace_invitation(uuid,uuid,uuid,text)'::regprocedure,
    'public.set_v5_tournament_approval(uuid,uuid,text,text,text)'::regprocedure,
    'public.activate_verified_subscription(uuid,timestamp with time zone,timestamp with time zone,bigint,timestamp with time zone,text)'::regprocedure,
    'public.create_v5_team_tournament_entry(uuid,uuid,uuid,text,text)'::regprocedure,
    'public.withdraw_v5_team_tournament_entry(uuid,uuid,uuid,text)'::regprocedure
  ]
  loop
    if not has_function_privilege('service_role', required_function, 'execute') then
      raise exception 'service_role is missing EXECUTE on %', required_function;
    end if;
  end loop;
end;
$$;

select
  'v5_production_security' as verification,
  'passed' as status,
  timezone('utc', now()) as verified_at;
