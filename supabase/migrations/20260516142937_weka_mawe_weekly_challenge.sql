create table if not exists public.weka_mawe_seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  game text not null default 'efootball_mobile',
  platform text not null default 'mobile',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('draft', 'active', 'closed', 'winner_confirmed')),
  entry_fee_kes integer not null default 99 check (entry_fee_kes >= 0),
  reward_title text not null default 'Original World Cup Jersey',
  reward_description text,
  winner_user_id uuid references public.profiles(id) on delete set null,
  winner_confirmed_at timestamptz,
  finalized_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weka_mawe_seasons_dates_check check (ends_at > starts_at)
);

create table if not exists public.weka_mawe_registrations (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.weka_mawe_seasons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_paid_kes integer not null default 0 check (amount_paid_kes >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'manual_review')),
  payment_reference text unique,
  payment_email text,
  payment_confirmed_at timestamptz,
  registered_at timestamptz not null default now(),
  is_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, user_id)
);

create table if not exists public.weka_mawe_queue (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.weka_mawe_seasons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled', 'expired')),
  joined_at timestamptz not null default now(),
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weka_mawe_matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.weka_mawe_seasons(id) on delete cascade,
  player_one_id uuid not null references public.profiles(id) on delete cascade,
  player_two_id uuid not null references public.profiles(id) on delete cascade,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  room_code text,
  room_notes text,
  status text not null default 'waiting_for_room' check (
    status in ('waiting_for_room', 'room_shared', 'awaiting_results', 'under_review', 'verified', 'disputed', 'void')
  ),
  final_player_one_score integer check (final_player_one_score >= 0),
  final_player_two_score integer check (final_player_two_score >= 0),
  winner_user_id uuid references public.profiles(id) on delete set null,
  matched_at timestamptz not null default now(),
  room_shared_at timestamptz,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weka_mawe_matches_distinct_players check (player_one_id <> player_two_id)
);

create table if not exists public.weka_mawe_result_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.weka_mawe_matches(id) on delete cascade,
  submitted_by_user_id uuid not null references public.profiles(id) on delete cascade,
  player_one_score integer not null check (player_one_score >= 0),
  player_two_score integer not null check (player_two_score >= 0),
  screenshot_url text not null,
  screenshot_public_id text,
  submission_note text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, submitted_by_user_id)
);

create table if not exists public.weka_mawe_reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.weka_mawe_matches(id) on delete cascade,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'corrected', 'voided', 'rejected')),
  review_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  final_player_one_score integer check (final_player_one_score >= 0),
  final_player_two_score integer check (final_player_two_score >= 0),
  resolution_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weka_mawe_seasons_status_dates_idx
  on public.weka_mawe_seasons(status, starts_at desc, ends_at desc);

create index if not exists weka_mawe_registrations_user_idx
  on public.weka_mawe_registrations(user_id, season_id, payment_status);

create index if not exists weka_mawe_queue_waiting_idx
  on public.weka_mawe_queue(season_id, status, joined_at);

create unique index if not exists weka_mawe_queue_one_waiting_per_user_idx
  on public.weka_mawe_queue(user_id)
  where status = 'waiting';

create index if not exists weka_mawe_matches_season_status_idx
  on public.weka_mawe_matches(season_id, status, matched_at desc);

create index if not exists weka_mawe_matches_player_one_idx
  on public.weka_mawe_matches(season_id, player_one_id, status);

create index if not exists weka_mawe_matches_player_two_idx
  on public.weka_mawe_matches(season_id, player_two_id, status);

create index if not exists weka_mawe_result_submissions_match_idx
  on public.weka_mawe_result_submissions(match_id, submitted_at desc);

create index if not exists weka_mawe_reviews_match_idx
  on public.weka_mawe_reviews(match_id, review_status, created_at desc);

alter table public.weka_mawe_seasons enable row level security;
alter table public.weka_mawe_registrations enable row level security;
alter table public.weka_mawe_queue enable row level security;
alter table public.weka_mawe_matches enable row level security;
alter table public.weka_mawe_result_submissions enable row level security;
alter table public.weka_mawe_reviews enable row level security;

revoke all on public.weka_mawe_seasons from anon, authenticated;
revoke all on public.weka_mawe_registrations from anon, authenticated;
revoke all on public.weka_mawe_queue from anon, authenticated;
revoke all on public.weka_mawe_matches from anon, authenticated;
revoke all on public.weka_mawe_result_submissions from anon, authenticated;
revoke all on public.weka_mawe_reviews from anon, authenticated;

grant all on public.weka_mawe_seasons to service_role;
grant all on public.weka_mawe_registrations to service_role;
grant all on public.weka_mawe_queue to service_role;
grant all on public.weka_mawe_matches to service_role;
grant all on public.weka_mawe_result_submissions to service_role;
grant all on public.weka_mawe_reviews to service_role;
