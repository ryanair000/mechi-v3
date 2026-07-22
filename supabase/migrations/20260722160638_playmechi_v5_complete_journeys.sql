-- Durable V5 work records shared by organizer, creator, coach, sponsor and shop journeys.
-- Team-specific membership, roster snapshots and tournament entries live in the preceding migration.

create table if not exists public.workspace_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('task','content','guide','analysis','brief','campaign','venue_fact','staff_note','document')),
  title text not null check (char_length(title) between 2 and 160),
  body text,
  status text not null default 'draft' check (status in ('draft','ready','in_progress','submitted','approved','changes_requested','completed','cancelled','archived')),
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create table if not exists public.workspace_announcements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 140),
  body text not null check (char_length(body) between 2 and 4000),
  audience text not null default 'members' check (audience in ('members','participants','staff','public')),
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_verification_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','changes_requested','rejected','cancelled')),
  evidence jsonb not null default '[]'::jsonb,
  request_note text,
  review_note text,
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_finance_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  kind text not null check (kind in ('budget','sponsorship','expense','prize','payout','refund','fee')),
  status text not null default 'draft' check (status in ('draft','pending','approved','paid','failed','refunded','cancelled')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'KES' check (char_length(currency) = 3),
  reference text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workspace_items_workspace_status_idx on public.workspace_items(workspace_id, status, created_at desc);
create index if not exists workspace_items_assigned_status_idx on public.workspace_items(assigned_to, status) where assigned_to is not null;
create index if not exists workspace_items_created_by_idx on public.workspace_items(created_by);
create index if not exists workspace_announcements_workspace_created_idx on public.workspace_announcements(workspace_id, created_at desc);
create index if not exists workspace_announcements_tournament_idx on public.workspace_announcements(tournament_id) where tournament_id is not null;
create index if not exists workspace_announcements_created_by_idx on public.workspace_announcements(created_by);
create index if not exists workspace_verification_workspace_status_idx on public.workspace_verification_requests(workspace_id, status, created_at desc);
create index if not exists workspace_verification_requested_by_idx on public.workspace_verification_requests(requested_by);
create index if not exists workspace_verification_reviewed_by_idx on public.workspace_verification_requests(reviewed_by) where reviewed_by is not null;
create index if not exists workspace_finance_workspace_status_idx on public.workspace_finance_records(workspace_id, status, created_at desc);
create index if not exists workspace_finance_tournament_idx on public.workspace_finance_records(tournament_id) where tournament_id is not null;
create index if not exists workspace_finance_created_by_idx on public.workspace_finance_records(created_by);

alter table public.workspace_items enable row level security;
alter table public.workspace_announcements enable row level security;
alter table public.workspace_verification_requests enable row level security;
alter table public.workspace_finance_records enable row level security;

revoke all on public.workspace_items, public.workspace_announcements,
  public.workspace_verification_requests, public.workspace_finance_records from anon, authenticated;
grant all on public.workspace_items, public.workspace_announcements,
  public.workspace_verification_requests, public.workspace_finance_records to service_role;

comment on table public.workspace_items is 'Durable permission-scoped work for V5 role journeys.';
comment on table public.workspace_announcements is 'Draft and published workspace or tournament communications.';
comment on table public.workspace_verification_requests is 'Evidence and review trail for public workspace verification.';
comment on table public.workspace_finance_records is 'Workspace financial planning and evidence; payment provider ledgers remain authoritative.';
