-- Atomic V5 workspace operations. Authorization remains in the server route;
-- these invoker functions guarantee that partial rows and missing audit events
-- cannot be committed when one step fails.

create or replace function public.create_v5_workspace(
  p_owner_id uuid,
  p_type text,
  p_name text,
  p_slug text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace public.workspaces%rowtype;
begin
  if p_type not in ('player', 'organizer', 'creator', 'coach', 'sponsor', 'shop') then
    raise exception using errcode = '22023', message = 'Unsupported workspace type';
  end if;

  insert into public.workspaces (
    type,
    owner_id,
    name,
    slug,
    status,
    verification_status,
    is_public
  )
  values (
    p_type,
    p_owner_id,
    p_name,
    p_slug,
    'active',
    'unverified',
    false
  )
  returning * into v_workspace;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    permissions,
    joined_at
  )
  values (
    v_workspace.id,
    p_owner_id,
    'owner',
    'active',
    array['workspace:*'],
    timezone('utc', now())
  );

  insert into public.workspace_audit_events (
    workspace_id,
    actor_user_id,
    action,
    subject_type,
    subject_id,
    reason,
    after_summary
  )
  values (
    v_workspace.id,
    p_owner_id,
    'workspace.created',
    'workspace',
    v_workspace.id::text,
    format('Activated %s workspace', p_type),
    jsonb_build_object('type', p_type, 'name', p_name, 'status', 'active')
  );

  return jsonb_build_object(
    'id', v_workspace.id,
    'type', v_workspace.type,
    'owner_id', v_workspace.owner_id,
    'name', v_workspace.name,
    'slug', v_workspace.slug,
    'status', v_workspace.status,
    'verification_status', v_workspace.verification_status,
    'is_public', v_workspace.is_public,
    'role', 'owner',
    'persisted', true
  );
end;
$$;

create or replace function public.create_v5_team_workspace(
  p_owner_id uuid,
  p_name text,
  p_slug text,
  p_game text,
  p_platform text,
  p_tag text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace public.workspaces%rowtype;
  v_team public.teams%rowtype;
begin
  insert into public.workspaces (
    type,
    owner_id,
    name,
    slug,
    status,
    verification_status,
    is_public
  )
  values (
    'team',
    p_owner_id,
    p_name,
    p_slug,
    'active',
    'unverified',
    false
  )
  returning * into v_workspace;

  insert into public.teams (
    workspace_id,
    game,
    platform,
    tag,
    roster_status,
    captain_user_id
  )
  values (
    v_workspace.id,
    p_game,
    nullif(btrim(p_platform), ''),
    nullif(btrim(p_tag), ''),
    'building',
    p_owner_id
  )
  returning * into v_team;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    permissions,
    joined_at
  )
  values (
    v_workspace.id,
    p_owner_id,
    'captain',
    'active',
    array['workspace:read', 'workspace:update', 'workspace:members:*', 'team:*'],
    timezone('utc', now())
  );

  insert into public.team_members (
    team_id,
    user_id,
    roster_role,
    status,
    joined_at
  )
  values (
    v_team.id,
    p_owner_id,
    'captain',
    'active',
    timezone('utc', now())
  );

  insert into public.workspace_audit_events (
    workspace_id,
    actor_user_id,
    action,
    subject_type,
    subject_id,
    reason,
    after_summary
  )
  values (
    v_workspace.id,
    p_owner_id,
    'team.created',
    'team',
    v_team.id::text,
    'Created a team workspace',
    jsonb_build_object('name', p_name, 'game', p_game, 'tag', nullif(btrim(p_tag), ''))
  );

  return jsonb_build_object(
    'team', jsonb_build_object(
      'id', v_team.id,
      'workspace_id', v_team.workspace_id,
      'game', v_team.game,
      'platform', v_team.platform,
      'tag', v_team.tag,
      'roster_status', v_team.roster_status,
      'captain_user_id', v_team.captain_user_id,
      'workspace', jsonb_build_object(
        'id', v_workspace.id,
        'name', v_workspace.name,
        'slug', v_workspace.slug,
        'status', v_workspace.status,
        'verification_status', v_workspace.verification_status
      )
    ),
    'role', 'captain'
  );
end;
$$;

revoke execute on function public.create_v5_workspace(uuid, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.create_v5_team_workspace(uuid, text, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.create_v5_workspace(uuid, text, text, text)
  to service_role;
grant execute on function public.create_v5_team_workspace(uuid, text, text, text, text, text)
  to service_role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.create_v5_workspace(uuid,text,text,text)'::regprocedure,
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.create_v5_workspace(uuid,text,text,text)'::regprocedure,
    'execute'
  ) then
    raise exception 'Data API role can execute create_v5_workspace';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.create_v5_team_workspace(uuid,text,text,text,text,text)'::regprocedure,
    'execute'
  ) then
    raise exception 'service_role cannot execute create_v5_team_workspace';
  end if;
end;
$$;

create unique index if not exists workspace_invitations_pending_user_unique
  on public.workspace_invitations(workspace_id, invited_user_id)
  where status = 'pending' and invited_user_id is not null;

create unique index if not exists workspace_invitations_pending_email_unique
  on public.workspace_invitations(workspace_id, lower(invited_email))
  where status = 'pending' and invited_email is not null;

create or replace function public.update_v5_workspace(
  p_workspace_id uuid,
  p_actor_id uuid,
  p_name text,
  p_description text,
  p_country text,
  p_region text,
  p_is_public boolean,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_before public.workspaces%rowtype;
  v_after public.workspaces%rowtype;
begin
  select * into v_before
  from public.workspaces
  where id = p_workspace_id and archived_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Workspace not found';
  end if;

  update public.workspaces
  set name = p_name,
      description = nullif(btrim(p_description), ''),
      country = nullif(btrim(p_country), ''),
      region = nullif(btrim(p_region), ''),
      is_public = p_is_public,
      updated_at = timezone('utc', now())
  where id = p_workspace_id
  returning * into v_after;

  insert into public.workspace_audit_events (
    workspace_id, actor_user_id, action, subject_type, subject_id, reason,
    before_summary, after_summary
  )
  values (
    p_workspace_id, p_actor_id, 'workspace.updated', 'workspace', p_workspace_id::text,
    p_reason,
    jsonb_build_object(
      'name', v_before.name,
      'description', v_before.description,
      'country', v_before.country,
      'region', v_before.region,
      'is_public', v_before.is_public
    ),
    jsonb_build_object(
      'name', v_after.name,
      'description', v_after.description,
      'country', v_after.country,
      'region', v_after.region,
      'is_public', v_after.is_public
    )
  );

  return jsonb_build_object(
    'id', v_after.id,
    'type', v_after.type,
    'owner_id', v_after.owner_id,
    'name', v_after.name,
    'slug', v_after.slug,
    'status', v_after.status,
    'verification_status', v_after.verification_status,
    'is_public', v_after.is_public,
    'description', v_after.description,
    'country', v_after.country,
    'region', v_after.region,
    'updated_at', v_after.updated_at
  );
end;
$$;

create or replace function public.archive_v5_workspace(
  p_workspace_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace public.workspaces%rowtype;
begin
  select * into v_workspace
  from public.workspaces
  where id = p_workspace_id and archived_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Workspace not found';
  end if;

  if v_workspace.owner_id <> p_actor_id then
    raise exception using errcode = '42501', message = 'Only the workspace owner can archive it';
  end if;

  update public.workspaces
  set status = 'archived',
      is_public = false,
      archived_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_workspace_id;

  insert into public.workspace_audit_events (
    workspace_id, actor_user_id, action, subject_type, subject_id, reason,
    before_summary, after_summary
  )
  values (
    p_workspace_id, p_actor_id, 'workspace.archived', 'workspace', p_workspace_id::text,
    p_reason,
    jsonb_build_object('status', v_workspace.status, 'is_public', v_workspace.is_public),
    jsonb_build_object('status', 'archived', 'is_public', false)
  );
end;
$$;

create or replace function public.create_v5_workspace_invitation(
  p_workspace_id uuid,
  p_actor_id uuid,
  p_invited_user_id uuid,
  p_invited_email text,
  p_role text,
  p_permissions text[],
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invitation_id uuid;
begin
  if p_invited_user_id is null and nullif(btrim(p_invited_email), '') is null then
    raise exception using errcode = '22023', message = 'Invitation target is required';
  end if;

  insert into public.workspace_invitations (
    workspace_id, invited_by, invited_user_id, invited_email, role, permissions,
    token_hash, status, expires_at
  )
  values (
    p_workspace_id, p_actor_id, p_invited_user_id,
    nullif(lower(btrim(p_invited_email)), ''), p_role, p_permissions,
    p_token_hash, 'pending', p_expires_at
  )
  returning id into v_invitation_id;

  insert into public.workspace_audit_events (
    workspace_id, actor_user_id, action, subject_type, subject_id, reason,
    after_summary
  )
  values (
    p_workspace_id, p_actor_id, 'workspace.invitation.created', 'workspace_invitation',
    v_invitation_id::text, 'Invited a workspace member',
    jsonb_build_object('role', p_role, 'expires_at', p_expires_at)
  );

  return v_invitation_id;
end;
$$;

create or replace function public.respond_v5_workspace_invitation(
  p_invitation_id uuid,
  p_actor_id uuid,
  p_response text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invitation public.workspace_invitations%rowtype;
  v_actor_email text;
  v_team_id uuid;
  v_roster_role text;
begin
  if p_response not in ('accepted', 'declined') then
    raise exception using errcode = '22023', message = 'Unsupported invitation response';
  end if;

  select * into v_invitation
  from public.workspace_invitations
  where id = p_invitation_id
  for update;

  if not found or v_invitation.status <> 'pending' then
    raise exception using errcode = 'P0002', message = 'Invitation not found';
  end if;

  select lower(email) into v_actor_email
  from public.profiles
  where id = p_actor_id;

  if coalesce(v_invitation.invited_user_id = p_actor_id, false) is false
     and coalesce(lower(v_invitation.invited_email) = v_actor_email, false) is false then
    raise exception using errcode = '42501', message = 'Invitation belongs to another account';
  end if;

  if v_invitation.expires_at <= timezone('utc', now()) then
    update public.workspace_invitations
    set status = 'expired', responded_at = timezone('utc', now())
    where id = p_invitation_id;

    insert into public.workspace_audit_events (
      workspace_id, actor_user_id, action, subject_type, subject_id, reason,
      after_summary
    )
    values (
      v_invitation.workspace_id, p_actor_id, 'workspace.invitation.expired',
      'workspace_invitation', p_invitation_id::text,
      'Expired invitation opened by recipient', jsonb_build_object('status', 'expired')
    );

    return jsonb_build_object(
      'invitation_id', p_invitation_id,
      'workspace_id', v_invitation.workspace_id,
      'status', 'expired'
    );
  end if;

  update public.workspace_invitations
  set status = p_response,
      invited_user_id = coalesce(invited_user_id, p_actor_id),
      responded_at = timezone('utc', now())
  where id = p_invitation_id;

  if p_response = 'accepted' then
    insert into public.workspace_members (
      workspace_id, user_id, role, status, permissions, invited_by, joined_at
    )
    values (
      v_invitation.workspace_id, p_actor_id, v_invitation.role, 'active',
      v_invitation.permissions, v_invitation.invited_by, timezone('utc', now())
    )
    on conflict (workspace_id, user_id) do update
      set role = excluded.role,
          status = 'active',
          permissions = excluded.permissions,
          invited_by = excluded.invited_by,
          joined_at = coalesce(public.workspace_members.joined_at, excluded.joined_at),
          updated_at = timezone('utc', now());

    select id into v_team_id
    from public.teams
    where workspace_id = v_invitation.workspace_id;

    if v_team_id is not null then
      v_roster_role := case
        when v_invitation.role in ('captain', 'manager', 'starter', 'substitute', 'analyst', 'member')
          then v_invitation.role
        else 'member'
      end;
      insert into public.team_members (team_id, user_id, roster_role, status, joined_at)
      values (v_team_id, p_actor_id, v_roster_role, 'active', timezone('utc', now()))
      on conflict (team_id, user_id) do update
        set roster_role = excluded.roster_role,
            status = 'active',
            joined_at = coalesce(public.team_members.joined_at, excluded.joined_at),
            updated_at = timezone('utc', now());
    end if;
  end if;

  insert into public.workspace_audit_events (
    workspace_id, actor_user_id, action, subject_type, subject_id, reason,
    after_summary
  )
  values (
    v_invitation.workspace_id, p_actor_id,
    format('workspace.invitation.%s', p_response),
    'workspace_invitation', p_invitation_id::text,
    format('Invitation %s by recipient', p_response),
    jsonb_build_object('status', p_response, 'role', v_invitation.role)
  );

  return jsonb_build_object(
    'invitation_id', p_invitation_id,
    'workspace_id', v_invitation.workspace_id,
    'status', p_response
  );
end;
$$;

revoke execute on function public.update_v5_workspace(uuid, uuid, text, text, text, text, boolean, text)
  from public, anon, authenticated;
revoke execute on function public.archive_v5_workspace(uuid, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.create_v5_workspace_invitation(uuid, uuid, uuid, text, text, text[], text, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.respond_v5_workspace_invitation(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.update_v5_workspace(uuid, uuid, text, text, text, text, boolean, text)
  to service_role;
grant execute on function public.archive_v5_workspace(uuid, uuid, text)
  to service_role;
grant execute on function public.create_v5_workspace_invitation(uuid, uuid, uuid, text, text, text[], text, timestamptz)
  to service_role;
grant execute on function public.respond_v5_workspace_invitation(uuid, uuid, text)
  to service_role;

create or replace function public.update_v5_workspace_member(
  p_workspace_id uuid,
  p_actor_id uuid,
  p_user_id uuid,
  p_role text,
  p_permissions text[],
  p_status text,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace public.workspaces%rowtype;
  v_member public.workspace_members%rowtype;
  v_team_id uuid;
  v_roster_role text;
begin
  if p_status not in ('active', 'suspended', 'removed') then
    raise exception using errcode = '22023', message = 'Unsupported member status';
  end if;

  select * into v_workspace
  from public.workspaces
  where id = p_workspace_id and archived_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Workspace not found';
  end if;
  if v_workspace.owner_id = p_user_id then
    raise exception using errcode = '42501', message = 'Workspace owner membership cannot be changed';
  end if;

  select * into v_member
  from public.workspace_members
  where workspace_id = p_workspace_id and user_id = p_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Workspace member not found';
  end if;

  update public.workspace_members
  set role = p_role,
      permissions = p_permissions,
      status = p_status,
      updated_at = timezone('utc', now())
  where id = v_member.id;

  select id into v_team_id
  from public.teams
  where workspace_id = p_workspace_id;
  if v_team_id is not null then
    v_roster_role := case
      when p_role in ('captain', 'manager', 'starter', 'substitute', 'analyst', 'member')
        then p_role
      else 'member'
    end;
    update public.team_members
    set roster_role = v_roster_role,
        status = case
          when p_status = 'active' then 'active'
          when p_status = 'suspended' then 'suspended'
          else 'removed'
        end,
        updated_at = timezone('utc', now())
    where team_id = v_team_id and user_id = p_user_id;
  end if;

  insert into public.workspace_audit_events (
    workspace_id, actor_user_id, action, subject_type, subject_id, reason,
    before_summary, after_summary
  )
  values (
    p_workspace_id, p_actor_id, 'workspace.member.updated', 'workspace_member',
    v_member.id::text, p_reason,
    jsonb_build_object('role', v_member.role, 'status', v_member.status),
    jsonb_build_object('role', p_role, 'status', p_status)
  );

  return jsonb_build_object(
    'id', v_member.id,
    'user_id', p_user_id,
    'role', p_role,
    'permissions', p_permissions,
    'status', p_status
  );
end;
$$;

revoke execute on function public.update_v5_workspace_member(uuid, uuid, uuid, text, text[], text, text)
  from public, anon, authenticated;
grant execute on function public.update_v5_workspace_member(uuid, uuid, uuid, text, text[], text, text)
  to service_role;

-- Audit history is append-only for the application role.
revoke update, delete, truncate on table public.workspace_audit_events from service_role;
grant select, insert on table public.workspace_audit_events to service_role;

create or replace function public.revoke_v5_workspace_invitation(
  p_workspace_id uuid,
  p_invitation_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invitation public.workspace_invitations%rowtype;
begin
  select * into v_invitation
  from public.workspace_invitations
  where id = p_invitation_id and workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Invitation not found';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception using errcode = '22023', message = 'Only pending invitations can be revoked';
  end if;

  update public.workspace_invitations
  set status = 'revoked', responded_at = timezone('utc', now())
  where id = p_invitation_id;

  insert into public.workspace_audit_events (
    workspace_id, actor_user_id, action, subject_type, subject_id, reason,
    before_summary, after_summary
  )
  values (
    p_workspace_id, p_actor_id, 'workspace.invitation.revoked',
    'workspace_invitation', p_invitation_id::text, p_reason,
    jsonb_build_object('status', v_invitation.status, 'role', v_invitation.role),
    jsonb_build_object('status', 'revoked', 'role', v_invitation.role)
  );
end;
$$;

revoke execute on function public.revoke_v5_workspace_invitation(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.revoke_v5_workspace_invitation(uuid, uuid, uuid, text)
  to service_role;

create or replace function public.set_v5_tournament_approval(
  p_tournament_id uuid,
  p_actor_id uuid,
  p_approval_status text,
  p_reason text,
  p_ip_address text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_actor_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = p_actor_id and role = 'admin' and is_banned = false
  ) into v_actor_is_admin;
  if not v_actor_is_admin then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  if p_approval_status not in ('pending', 'approved', 'rejected') then
    raise exception using errcode = '22023', message = 'Invalid approval status';
  end if;
  if char_length(btrim(p_reason)) < 8 then
    raise exception using errcode = '22023', message = 'Decision reason is required';
  end if;

  select * into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Tournament not found';
  end if;

  update public.tournaments
  set approval_status = p_approval_status,
      approved_at = case when p_approval_status = 'approved' then timezone('utc', now()) else null end,
      approved_by = case when p_approval_status = 'approved' then p_actor_id else null end,
      is_featured = case when p_approval_status = 'approved' then is_featured else false end
  where id = p_tournament_id;

  insert into public.admin_audit_logs (
    admin_id, action, target_type, target_id, details, ip_address
  )
  values (
    p_actor_id,
    'review_tournament',
    'tournament',
    p_tournament_id::text,
    jsonb_build_object(
      'title', v_tournament.title,
      'previousApprovalStatus', v_tournament.approval_status,
      'nextApprovalStatus', p_approval_status,
      'featuredRemoved', v_tournament.is_featured and p_approval_status <> 'approved',
      'reason', btrim(p_reason)
    ),
    nullif(btrim(p_ip_address), '')
  );
end;
$$;

revoke execute on function public.set_v5_tournament_approval(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.set_v5_tournament_approval(uuid, uuid, text, text, text)
  to service_role;
