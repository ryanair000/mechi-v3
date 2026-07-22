-- Durable team tournament entry, immutable roster snapshots, and cross-team
-- player conflict protection. The first production contract intentionally
-- accepts free team tournaments only; paid team entry requires a separate
-- payment-intent/reconciliation contract.

create table if not exists public.tournament_entry_members (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.tournament_entries(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  roster_role text not null check (
    roster_role in ('captain', 'manager', 'starter', 'substitute', 'analyst', 'member')
  ),
  status text not null default 'active' check (
    status in ('active', 'withdrawn', 'disqualified')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (entry_id, user_id)
);

create unique index if not exists tournament_entry_members_active_player_unique
  on public.tournament_entry_members(tournament_id, user_id)
  where status = 'active';
create index if not exists tournament_entry_members_entry_idx
  on public.tournament_entry_members(entry_id);
create index if not exists tournament_entry_members_team_idx
  on public.tournament_entry_members(team_id, status);
create index if not exists tournament_entry_members_user_idx
  on public.tournament_entry_members(user_id, status);

alter table public.tournament_entry_members enable row level security;
revoke all on table public.tournament_entry_members from public, anon, authenticated;
grant select, insert, update on table public.tournament_entry_members to service_role;

create or replace function public.sync_v5_workspace_team_member()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_team_id uuid;
  v_roster_role text;
  v_status text;
begin
  if tg_op = 'DELETE' then
    select t.id into v_team_id
    from public.teams t
    join public.workspaces w on w.id = t.workspace_id
    where w.id = old.workspace_id and w.type = 'team';

    if v_team_id is not null then
      update public.team_members
      set status = 'removed', updated_at = timezone('utc', now())
      where team_id = v_team_id and user_id = old.user_id;
    end if;
    return old;
  end if;

  select t.id into v_team_id
  from public.teams t
  join public.workspaces w on w.id = t.workspace_id
  where w.id = new.workspace_id and w.type = 'team';

  if v_team_id is null then
    return new;
  end if;

  v_roster_role := case
    when new.role in ('captain', 'manager', 'starter', 'substitute', 'analyst') then new.role
    else 'member'
  end;
  v_status := case
    when new.status in ('invited', 'active', 'suspended', 'left', 'removed') then new.status
    else 'removed'
  end;

  insert into public.team_members (
    team_id,
    user_id,
    roster_role,
    status,
    joined_at,
    updated_at
  )
  values (
    v_team_id,
    new.user_id,
    v_roster_role,
    v_status,
    case when v_status = 'active' then coalesce(new.joined_at, timezone('utc', now())) else null end,
    timezone('utc', now())
  )
  on conflict (team_id, user_id)
  do update set
    roster_role = excluded.roster_role,
    status = excluded.status,
    joined_at = coalesce(public.team_members.joined_at, excluded.joined_at),
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists sync_v5_workspace_team_member_trigger on public.workspace_members;
create trigger sync_v5_workspace_team_member_trigger
after insert or update of role, status, joined_at or delete
on public.workspace_members
for each row execute function public.sync_v5_workspace_team_member();

revoke all on function public.sync_v5_workspace_team_member()
  from public, anon, authenticated;

-- Reconcile members created before the synchronization trigger existed.
insert into public.team_members (
  team_id,
  user_id,
  roster_role,
  status,
  joined_at,
  updated_at
)
select
  t.id,
  wm.user_id,
  case
    when wm.role in ('captain', 'manager', 'starter', 'substitute', 'analyst') then wm.role
    else 'member'
  end,
  case
    when wm.status in ('invited', 'active', 'suspended', 'left', 'removed') then wm.status
    else 'removed'
  end,
  wm.joined_at,
  timezone('utc', now())
from public.workspace_members wm
join public.workspaces w on w.id = wm.workspace_id and w.type = 'team'
join public.teams t on t.workspace_id = w.id
on conflict (team_id, user_id)
do update set
  roster_role = excluded.roster_role,
  status = excluded.status,
  joined_at = coalesce(public.team_members.joined_at, excluded.joined_at),
  updated_at = excluded.updated_at;

create or replace function public.create_v5_team_tournament_entry(
  p_actor_id uuid,
  p_team_id uuid,
  p_tournament_id uuid,
  p_idempotency_key text,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_team public.teams%rowtype;
  v_workspace public.workspaces%rowtype;
  v_tournament public.tournaments%rowtype;
  v_entry public.tournament_entries%rowtype;
  v_snapshot public.team_roster_snapshots%rowtype;
  v_roster jsonb;
  v_core_count integer;
  v_member_count integer;
  v_missing_game_id text;
  v_entry_count integer;
  v_key text;
  v_authorized boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_reason, ''))) < 8 then
    raise exception 'Entry reason must be at least 8 characters' using errcode = '22023';
  end if;

  v_key := btrim(coalesce(p_idempotency_key, ''));
  if char_length(v_key) < 16 or char_length(v_key) > 128 then
    raise exception 'Idempotency key must be between 16 and 128 characters' using errcode = '22023';
  end if;

  select * into v_team
  from public.teams
  where id = p_team_id
  for update;
  if not found then
    raise exception 'Team not found' using errcode = 'P0002';
  end if;

  select * into v_workspace
  from public.workspaces
  where id = v_team.workspace_id and type = 'team' and archived_at is null
  for update;
  if not found or v_workspace.status <> 'active' then
    raise exception 'Team workspace is not active' using errcode = '55000';
  end if;

  select (
    v_workspace.owner_id = p_actor_id
    or v_team.captain_user_id = p_actor_id
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = v_workspace.id
        and wm.user_id = p_actor_id
        and wm.status = 'active'
        and (
          wm.role in ('captain', 'manager')
          or wm.permissions && array['*', 'team:*', 'team:entries:write']::text[]
        )
    )
  ) into v_authorized;
  if not v_authorized then
    raise exception 'Team entry permission required' using errcode = '42501';
  end if;

  select * into v_entry
  from public.tournament_entries
  where tournament_id = p_tournament_id and idempotency_key = v_key;
  if found then
    if v_entry.team_id <> p_team_id or v_entry.created_by <> p_actor_id then
      raise exception 'Idempotency key belongs to another operation' using errcode = '23505';
    end if;
    return jsonb_build_object('entry', to_jsonb(v_entry), 'idempotent', true);
  end if;

  select * into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;
  if not found then
    raise exception 'Tournament not found' using errcode = 'P0002';
  end if;

  if v_tournament.participant_type <> 'team' then
    raise exception 'Tournament does not accept team entries' using errcode = '22023';
  end if;
  if v_tournament.status <> 'open' or v_tournament.approval_status <> 'approved' then
    raise exception 'Tournament is not open for approved registration' using errcode = '55000';
  end if;
  if v_tournament.entry_fee <> 0 then
    raise exception 'Paid team entry is not available until payment protection is enabled'
      using errcode = '0A000';
  end if;
  if v_tournament.game <> v_team.game then
    raise exception 'Team game does not match tournament game' using errcode = '22023';
  end if;
  if v_tournament.platform is not null and v_team.platform is not null
    and v_tournament.platform <> v_team.platform then
    raise exception 'Team platform does not match tournament platform' using errcode = '22023';
  end if;

  select count(*) into v_core_count
  from public.team_members tm
  where tm.team_id = v_team.id
    and tm.status = 'active'
    and tm.roster_role in ('captain', 'starter');
  if v_core_count <> v_tournament.team_size then
    raise exception 'Roster requires exactly % captain/starter players; found %',
      v_tournament.team_size, v_core_count using errcode = '22023';
  end if;

  select count(*) into v_member_count
  from public.team_members tm
  where tm.team_id = v_team.id
    and tm.status = 'active'
    and tm.roster_role in ('captain', 'starter', 'substitute');
  if v_member_count < v_core_count then
    raise exception 'Roster is incomplete' using errcode = '22023';
  end if;

  select p.username into v_missing_game_id
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = v_team.id
    and tm.status = 'active'
    and tm.roster_role in ('captain', 'starter', 'substitute')
    and nullif(btrim(coalesce(
      p.game_ids ->> (v_tournament.game || ':' || coalesce(v_tournament.platform, v_team.platform, '')),
      p.game_ids ->> coalesce(v_tournament.platform, v_team.platform, ''),
      p.game_ids ->> v_tournament.game,
      ''
    )), '') is null
  order by p.username
  limit 1;
  if v_missing_game_id is not null then
    raise exception 'Roster member % is missing the required game ID', v_missing_game_id
      using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', tm.user_id,
    'username', p.username,
    'roster_role', tm.roster_role,
    'game', v_tournament.game,
    'game_id', coalesce(
      p.game_ids ->> (v_tournament.game || ':' || coalesce(v_tournament.platform, v_team.platform, '')),
      p.game_ids ->> coalesce(v_tournament.platform, v_team.platform, ''),
      p.game_ids ->> v_tournament.game
    )
  ) order by
    case tm.roster_role when 'captain' then 0 when 'starter' then 1 else 2 end,
    p.username), '[]'::jsonb)
  into v_roster
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = v_team.id
    and tm.status = 'active'
    and tm.roster_role in ('captain', 'starter', 'substitute');

  select count(*) into v_entry_count
  from public.tournament_entries te
  where te.tournament_id = v_tournament.id
    and te.status not in ('withdrawn', 'disqualified', 'refunded');
  if v_entry_count >= v_tournament.size then
    raise exception 'Tournament is full' using errcode = '55000';
  end if;

  insert into public.team_roster_snapshots (
    team_id,
    tournament_id,
    created_by,
    roster,
    lock_reason
  ) values (
    v_team.id,
    v_tournament.id,
    p_actor_id,
    v_roster,
    p_reason
  ) returning * into v_snapshot;

  insert into public.tournament_entries (
    tournament_id,
    entry_type,
    team_id,
    roster_snapshot_id,
    status,
    payment_status,
    idempotency_key,
    created_by
  ) values (
    v_tournament.id,
    'team',
    v_team.id,
    v_snapshot.id,
    'confirmed',
    'not_required',
    v_key,
    p_actor_id
  ) returning * into v_entry;

  insert into public.tournament_entry_members (
    entry_id,
    tournament_id,
    team_id,
    user_id,
    roster_role
  )
  select
    v_entry.id,
    v_tournament.id,
    v_team.id,
    tm.user_id,
    tm.roster_role
  from public.team_members tm
  where tm.team_id = v_team.id
    and tm.status = 'active'
    and tm.roster_role in ('captain', 'starter', 'substitute');

  update public.teams
  set roster_status = 'locked', updated_at = timezone('utc', now())
  where id = v_team.id;

  if v_entry_count + 1 >= v_tournament.size then
    update public.tournaments set status = 'full' where id = v_tournament.id;
  end if;

  insert into public.workspace_audit_events (
    workspace_id,
    actor_user_id,
    action,
    subject_type,
    subject_id,
    reason,
    after_summary,
    metadata
  ) values (
    v_workspace.id,
    p_actor_id,
    'team.tournament_entry.created',
    'tournament_entry',
    v_entry.id::text,
    p_reason,
    jsonb_build_object(
      'tournamentId', v_tournament.id,
      'teamId', v_team.id,
      'rosterSnapshotId', v_snapshot.id,
      'memberCount', v_member_count,
      'status', v_entry.status
    ),
    jsonb_build_object('idempotencyKey', v_key)
  );

  return jsonb_build_object(
    'entry', to_jsonb(v_entry),
    'roster_snapshot', to_jsonb(v_snapshot),
    'idempotent', false
  );
end;
$$;

create or replace function public.withdraw_v5_team_tournament_entry(
  p_actor_id uuid,
  p_team_id uuid,
  p_entry_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_team public.teams%rowtype;
  v_workspace public.workspaces%rowtype;
  v_entry public.tournament_entries%rowtype;
  v_tournament public.tournaments%rowtype;
  v_authorized boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 8 then
    raise exception 'Withdrawal reason must be at least 8 characters' using errcode = '22023';
  end if;

  select * into v_team from public.teams where id = p_team_id for update;
  if not found then raise exception 'Team not found' using errcode = 'P0002'; end if;
  select * into v_workspace from public.workspaces
    where id = v_team.workspace_id and type = 'team' and archived_at is null for update;
  if not found then raise exception 'Team workspace not found' using errcode = 'P0002'; end if;

  select (
    v_workspace.owner_id = p_actor_id
    or v_team.captain_user_id = p_actor_id
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = v_workspace.id and wm.user_id = p_actor_id and wm.status = 'active'
        and (wm.role in ('captain', 'manager')
          or wm.permissions && array['*', 'team:*', 'team:entries:write']::text[])
    )
  ) into v_authorized;
  if not v_authorized then
    raise exception 'Team entry permission required' using errcode = '42501';
  end if;

  select * into v_entry from public.tournament_entries
    where id = p_entry_id and team_id = p_team_id and entry_type = 'team' for update;
  if not found then raise exception 'Team entry not found' using errcode = 'P0002'; end if;
  if v_entry.status = 'withdrawn' then
    return jsonb_build_object('entry', to_jsonb(v_entry), 'idempotent', true);
  end if;
  if v_entry.status not in ('draft', 'pending_payment', 'pending_eligibility', 'confirmed', 'waitlisted') then
    raise exception 'Entry can no longer be withdrawn' using errcode = '55000';
  end if;

  select * into v_tournament from public.tournaments where id = v_entry.tournament_id for update;
  if not found then raise exception 'Tournament not found' using errcode = 'P0002'; end if;
  if v_tournament.status in ('active', 'completed', 'cancelled') then
    raise exception 'Tournament state prevents withdrawal' using errcode = '55000';
  end if;

  update public.tournament_entries
  set status = 'withdrawn', updated_at = timezone('utc', now())
  where id = v_entry.id returning * into v_entry;

  update public.tournament_entry_members
  set status = 'withdrawn', updated_at = timezone('utc', now())
  where entry_id = v_entry.id and status = 'active';

  update public.team_roster_snapshots
  set unlocked_at = timezone('utc', now()), unlocked_by = p_actor_id, unlock_reason = p_reason
  where id = v_entry.roster_snapshot_id and unlocked_at is null;

  if not exists (
    select 1 from public.tournament_entries te
    where te.team_id = v_team.id and te.status not in ('withdrawn', 'disqualified', 'refunded')
  ) then
    update public.teams set roster_status = 'ready', updated_at = timezone('utc', now())
    where id = v_team.id;
  end if;

  if v_tournament.status = 'full' then
    update public.tournaments set status = 'open' where id = v_tournament.id;
  end if;

  insert into public.workspace_audit_events (
    workspace_id, actor_user_id, action, subject_type, subject_id, reason, after_summary
  ) values (
    v_workspace.id,
    p_actor_id,
    'team.tournament_entry.withdrawn',
    'tournament_entry',
    v_entry.id::text,
    p_reason,
    jsonb_build_object('tournamentId', v_tournament.id, 'teamId', v_team.id, 'status', 'withdrawn')
  );

  return jsonb_build_object('entry', to_jsonb(v_entry), 'idempotent', false);
end;
$$;

revoke all on function public.create_v5_team_tournament_entry(uuid, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.withdraw_v5_team_tournament_entry(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_v5_team_tournament_entry(uuid, uuid, uuid, text, text)
  to service_role;
grant execute on function public.withdraw_v5_team_tournament_entry(uuid, uuid, uuid, text)
  to service_role;
