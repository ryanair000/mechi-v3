create extension if not exists pgcrypto;

create or replace function public.set_marketing_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.campaign_weeks (
  id uuid primary key default gen_random_uuid(),
  week_number int not null unique check (week_number between 1 and 4),
  week_start date not null,
  week_end date not null,
  tournament_game text not null check (tournament_game in ('efootball', 'codm', 'pubgm')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null unique references public.campaign_weeks(id) on delete cascade,
  game text not null check (game in ('efootball', 'codm', 'pubgm')),
  date date not null,
  prize_pool_kes int not null default 1000,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  participant_count int,
  first_place_name text,
  first_place_phone text,
  first_place_kes int default 700,
  first_place_paid boolean not null default false,
  first_place_paid_at timestamptz,
  second_place_name text,
  second_place_phone text,
  second_place_kes int default 300,
  second_place_paid boolean not null default false,
  second_place_paid_at timestamptz,
  winner_screenshot_url text,
  paid boolean not null default false,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bounties (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.campaign_weeks(id) on delete cascade,
  title text not null,
  description text not null,
  trigger_label text not null,
  game text check (game in ('efootball', 'codm', 'pubgm') or game is null),
  prize_kes int not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'claimed', 'cancelled')),
  winner_name text,
  winner_phone text,
  claimed_at timestamptz,
  paid boolean not null default false,
  paid_at timestamptz,
  activated_at timestamptz,
  notes text,
  rolled_over_to_week_id uuid references public.campaign_weeks(id),
  rolled_over_from_bounty_id uuid references public.bounties(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.campaign_weeks(id) on delete cascade,
  scheduled_date date not null,
  day_type text not null check (
    day_type in (
      'monday_announce',
      'thursday_countdown',
      'saturday_winner',
      'wednesday_bounty_update',
      'custom'
    )
  ),
  title text not null,
  description text,
  posted_tiktok boolean not null default false,
  posted_instagram boolean not null default false,
  posted_twitter boolean not null default false,
  posted_whatsapp boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_items_auto_unique
  on public.content_items (week_id, day_type)
  where day_type <> 'custom';

create table if not exists public.ad_spend_entries (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.campaign_weeks(id) on delete cascade,
  platform text not null check (platform in ('meta', 'tiktok', 'twitter')),
  amount_kes int not null,
  description text,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_snapshots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null unique references public.campaign_weeks(id) on delete cascade,
  snapshot_date date not null,
  whatsapp_efootball int,
  whatsapp_codm int,
  whatsapp_pubgm int,
  followers_tiktok int,
  followers_instagram int,
  followers_twitter int,
  mechi_registered int,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_settings (
  singleton boolean primary key default true check (singleton = true),
  total_budget_kes int not null default 15000,
  meta_budget_kes int not null default 8000,
  tiktok_budget_kes int not null default 5000,
  twitter_budget_kes int not null default 2000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.sync_tournament_paid_state()
returns trigger
language plpgsql
as $$
begin
  new.paid = coalesce(new.first_place_paid, false) and coalesce(new.second_place_paid, false);

  if new.paid then
    new.paid_at = greatest(
      coalesce(new.first_place_paid_at, now()),
      coalesce(new.second_place_paid_at, now())
    );
  else
    new.paid_at = null;
  end if;

  return new;
end;
$$;

create or replace function public.seed_marketing_week_assets()
returns trigger
language plpgsql
as $$
begin
  insert into public.tournaments (
    week_id,
    game,
    date,
    prize_pool_kes,
    status,
    first_place_kes,
    second_place_kes
  )
  values (
    new.id,
    new.tournament_game,
    (new.week_start + interval '4 day')::date,
    1000,
    'upcoming',
    700,
    300
  )
  on conflict (week_id) do nothing;

  insert into public.content_items (week_id, scheduled_date, day_type, title, description)
  values
    (
      new.id,
      new.week_start,
      'monday_announce',
      concat('Week ', new.week_number, ' ', initcap(new.tournament_game), ' tournament is live'),
      'Announce the weekly tournament, prize pool, and registration window.'
    ),
    (
      new.id,
      (new.week_start + interval '3 day')::date,
      'thursday_countdown',
      concat('Week ', new.week_number, ' ', initcap(new.tournament_game), ' countdown starts now'),
      'Push late registrations and remind the community about Friday tournament day.'
    ),
    (
      new.id,
      (new.week_start + interval '5 day')::date,
      'saturday_winner',
      concat('Week ', new.week_number, ' ', initcap(new.tournament_game), ' winners recap'),
      'Publish the podium, winners, and social proof after the tournament wraps.'
    )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists campaign_weeks_seed_assets on public.campaign_weeks;
create trigger campaign_weeks_seed_assets
after insert on public.campaign_weeks
for each row
execute function public.seed_marketing_week_assets();

drop trigger if exists tournaments_sync_paid_state on public.tournaments;
create trigger tournaments_sync_paid_state
before insert or update on public.tournaments
for each row
execute function public.sync_tournament_paid_state();

drop trigger if exists tournaments_set_updated_at on public.tournaments;
create trigger tournaments_set_updated_at
before update on public.tournaments
for each row
execute function public.set_marketing_updated_at();

drop trigger if exists bounties_set_updated_at on public.bounties;
create trigger bounties_set_updated_at
before update on public.bounties
for each row
execute function public.set_marketing_updated_at();

drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at
before update on public.content_items
for each row
execute function public.set_marketing_updated_at();

drop trigger if exists marketing_settings_set_updated_at on public.marketing_settings;
create trigger marketing_settings_set_updated_at
before update on public.marketing_settings
for each row
execute function public.set_marketing_updated_at();

alter table public.campaign_weeks enable row level security;
alter table public.tournaments enable row level security;
alter table public.bounties enable row level security;
alter table public.content_items enable row level security;
alter table public.ad_spend_entries enable row level security;
alter table public.community_snapshots enable row level security;
alter table public.marketing_settings enable row level security;
