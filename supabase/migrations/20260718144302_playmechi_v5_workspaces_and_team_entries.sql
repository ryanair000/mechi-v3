-- PlayMechi V5 workspace and generic competition-entry foundation.
-- This migration is intentionally additive. Existing player tournament flows remain valid
-- while the application backfills workspaces and moves to generic solo/team entries.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('player', 'team', 'organizer', 'creator', 'coach', 'sponsor', 'shop')),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('draft', 'active', 'pending_verification', 'restricted', 'suspended', 'archived')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending', 'verified', 'changes_requested', 'rejected', 'expired')),
  is_public boolean not null default false,
  description text,
  avatar_url text,
  cover_url text,
  country text,
  region text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended', 'removed', 'left')),
  permissions text[] not null default '{}',
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invited_user_id uuid references public.profiles(id) on delete cascade,
  invited_email text,
  role text not null,
  permissions text[] not null default '{}',
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (invited_user_id is not null or nullif(btrim(invited_email), '') is not null)
);

create table if not exists public.workspace_preferences (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_route text,
  theme text check (theme in ('light', 'dark')),
  density text check (density in ('compact', 'comfortable')),
  notification_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  game text not null,
  platform text,
  tag text check (tag is null or char_length(tag) between 2 and 8),
  roster_status text not null default 'building' check (roster_status in ('building', 'ready', 'locked', 'restricted', 'archived')),
  captain_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  roster_role text not null default 'member' check (roster_role in ('captain', 'manager', 'starter', 'substitute', 'analyst', 'member')),
  status text not null default 'active' check (status in ('invited', 'active', 'benched', 'suspended', 'left', 'removed')),
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (team_id, user_id)
);

create table if not exists public.team_roster_snapshots (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  roster jsonb not null,
  lock_reason text,
  locked_at timestamptz not null default timezone('utc', now()),
  unlocked_at timestamptz,
  unlocked_by uuid references public.profiles(id) on delete restrict,
  unlock_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.tournaments
  add column if not exists organizer_workspace_id uuid references public.workspaces(id) on delete set null,
  add column if not exists participant_type text not null default 'solo' check (participant_type in ('solo', 'team')),
  add column if not exists team_size integer,
  add column if not exists valuable_reward_exists boolean not null default false,
  add column if not exists reward_description text,
  add column if not exists sponsor_funded_reward_exists boolean not null default false,
  add column if not exists manual_risk_flag_exists boolean not null default false,
  add column if not exists approval_required boolean not null default false,
  add column if not exists approval_reason_codes text[] not null default '{}';

alter table public.tournaments
  drop constraint if exists tournaments_v5_team_size_check;

alter table public.tournaments
  add constraint tournaments_v5_team_size_check
  check (
    (participant_type = 'solo' and team_size is null)
    or (participant_type = 'team' and team_size between 2 and 32)
  ) not valid;

create table if not exists public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  entry_type text not null check (entry_type in ('solo', 'team')),
  user_id uuid references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  roster_snapshot_id uuid references public.team_roster_snapshots(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'pending_payment', 'pending_eligibility', 'confirmed', 'waitlisted', 'checked_in', 'withdrawn', 'disqualified', 'refunded')),
  payment_status text not null default 'not_required' check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  payment_reference text,
  idempotency_key text,
  seed integer,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (entry_type = 'solo' and user_id is not null and team_id is null and roster_snapshot_id is null)
    or (entry_type = 'team' and user_id is null and team_id is not null)
  )
);

create unique index if not exists tournament_entries_solo_unique
  on public.tournament_entries(tournament_id, user_id)
  where entry_type = 'solo' and user_id is not null and status <> 'withdrawn';

create unique index if not exists tournament_entries_team_unique
  on public.tournament_entries(tournament_id, team_id)
  where entry_type = 'team' and team_id is not null and status <> 'withdrawn';

create unique index if not exists tournament_entries_idempotency_unique
  on public.tournament_entries(tournament_id, idempotency_key)
  where idempotency_key is not null;

alter table public.tournament_matches
  add column if not exists entry1_id uuid references public.tournament_entries(id) on delete set null,
  add column if not exists entry2_id uuid references public.tournament_entries(id) on delete set null,
  add column if not exists winner_entry_id uuid references public.tournament_entries(id) on delete set null;

create table if not exists public.workspace_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id text,
  reason text,
  correlation_id uuid not null default gen_random_uuid(),
  before_summary jsonb,
  after_summary jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists workspaces_owner_type_idx on public.workspaces(owner_id, type);
create unique index if not exists workspaces_one_personal_player_idx
  on public.workspaces(owner_id) where type = 'player' and archived_at is null;
create unique index if not exists workspaces_one_personal_creator_idx
  on public.workspaces(owner_id) where type = 'creator' and archived_at is null;
create unique index if not exists workspaces_one_personal_coach_idx
  on public.workspaces(owner_id) where type = 'coach' and archived_at is null;
create index if not exists workspaces_type_status_idx on public.workspaces(type, status);
create index if not exists workspace_members_user_status_idx on public.workspace_members(user_id, status);
create index if not exists workspace_members_workspace_role_idx on public.workspace_members(workspace_id, role);
create index if not exists workspace_invitations_user_status_idx on public.workspace_invitations(invited_user_id, status);
create index if not exists workspace_invitations_workspace_status_idx on public.workspace_invitations(workspace_id, status);
create index if not exists teams_captain_idx on public.teams(captain_user_id);
create index if not exists team_members_user_status_idx on public.team_members(user_id, status);
create index if not exists team_roster_snapshots_team_idx on public.team_roster_snapshots(team_id, locked_at desc);
create index if not exists tournament_entries_tournament_status_idx on public.tournament_entries(tournament_id, status);
create index if not exists tournament_entries_user_status_idx on public.tournament_entries(user_id, status) where user_id is not null;
create index if not exists tournament_entries_team_status_idx on public.tournament_entries(team_id, status) where team_id is not null;
create index if not exists tournaments_organizer_workspace_idx on public.tournaments(organizer_workspace_id);
create index if not exists tournament_matches_entry1_idx on public.tournament_matches(entry1_id);
create index if not exists tournament_matches_entry2_idx on public.tournament_matches(entry2_id);
create index if not exists workspace_audit_workspace_created_idx on public.workspace_audit_events(workspace_id, created_at desc);
create index if not exists workspace_audit_actor_created_idx on public.workspace_audit_events(actor_user_id, created_at desc);
create index if not exists workspace_audit_correlation_idx on public.workspace_audit_events(correlation_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.workspace_preferences enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_roster_snapshots enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.workspace_audit_events enable row level security;

-- Direct Data API access is read-only and deliberately narrow. Application mutations use
-- authenticated server endpoints that validate the custom Mechi session and workspace permission.
grant select on public.workspaces, public.workspace_members, public.workspace_invitations,
  public.workspace_preferences, public.teams, public.team_members, public.team_roster_snapshots,
  public.tournament_entries to authenticated;
grant all on public.workspaces, public.workspace_members, public.workspace_invitations,
  public.workspace_preferences, public.teams, public.team_members, public.team_roster_snapshots,
  public.tournament_entries, public.workspace_audit_events to service_role;

drop policy if exists "v5 public workspaces are visible" on public.workspaces;
create policy "v5 public workspaces are visible"
  on public.workspaces for select to anon, authenticated
  using (is_public = true and status = 'active');

drop policy if exists "v5 members can view their workspaces" on public.workspaces;
create policy "v5 members can view their workspaces"
  on public.workspaces for select to authenticated
  using (
    owner_id = (select auth.uid())
    or id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

drop policy if exists "v5 users can view own memberships" on public.workspace_members;
create policy "v5 users can view own memberships"
  on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "v5 users can view own invitations" on public.workspace_invitations;
create policy "v5 users can view own invitations"
  on public.workspace_invitations for select to authenticated
  using (invited_user_id = (select auth.uid()) or invited_by = (select auth.uid()));

drop policy if exists "v5 users can view own workspace preferences" on public.workspace_preferences;
create policy "v5 users can view own workspace preferences"
  on public.workspace_preferences for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "v5 team members can view teams" on public.teams;
create policy "v5 team members can view teams"
  on public.teams for select to authenticated
  using (
    captain_user_id = (select auth.uid())
    or id in (
      select team_id from public.team_members
      where user_id = (select auth.uid()) and status in ('active', 'benched')
    )
  );

drop policy if exists "v5 users can view own team memberships" on public.team_members;
create policy "v5 users can view own team memberships"
  on public.team_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "v5 team members can view roster snapshots" on public.team_roster_snapshots;
create policy "v5 team members can view roster snapshots"
  on public.team_roster_snapshots for select to authenticated
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = (select auth.uid()) and status in ('active', 'benched')
    )
  );

drop policy if exists "v5 users can view own tournament entries" on public.tournament_entries;
create policy "v5 users can view own tournament entries"
  on public.tournament_entries for select to authenticated
  using (
    user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or team_id in (
      select team_id from public.team_members
      where user_id = (select auth.uid()) and status in ('active', 'benched')
    )
  );

comment on table public.workspaces is 'V5 role-aware operating contexts. One profile may belong to multiple workspaces.';
comment on table public.tournament_entries is 'Generic solo or team tournament participation. Legacy tournament_players remains during backfill.';
comment on table public.workspace_audit_events is 'Append-only audit records. No direct anon/authenticated grants or policies.';
