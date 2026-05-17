drop table if exists public.weka_mawe_reviews cascade;
drop table if exists public.weka_mawe_result_submissions cascade;
drop table if exists public.weka_mawe_matches cascade;
drop table if exists public.weka_mawe_queue cascade;
drop table if exists public.weka_mawe_check_ins cascade;
drop table if exists public.weka_mawe_bracket_matches cascade;
drop table if exists public.weka_mawe_registrations cascade;
drop table if exists public.weka_mawe_seasons cascade;
drop table if exists public.weka_mawe_editions cascade;
drop table if exists public.weka_mawe_series cascade;

create table public.weka_mawe_series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  status text not null default 'active'
    check (status in ('active', 'paused', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weka_mawe_editions (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.weka_mawe_series(id) on delete cascade,
  slug text not null unique,
  title text not null,
  game text not null default 'efootball',
  host_handle text not null default 'gamer_mastaa19',
  registration_fee_kes integer not null default 100 check (registration_fee_kes >= 0),
  max_players integer not null default 32 check (max_players > 0),
  starts_at timestamptz not null,
  registration_closes_at timestamptz,
  check_in_opens_at timestamptz,
  check_in_closes_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'registration_open', 'check_in_open', 'locked', 'live', 'completed', 'cancelled')),
  bracket_locked boolean not null default false,
  winner_user_id uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weka_mawe_registrations (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.weka_mawe_editions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ign text not null,
  phone text,
  whatsapp_number text,
  payment_status text not null default 'pending_payment'
    check (payment_status in ('pending_payment', 'paid', 'failed', 'refunded', 'manual_review')),
  amount_kes integer not null default 100 check (amount_kes >= 0),
  payment_reference text unique,
  payment_email text,
  payment_access_code text,
  payment_authorization_url text,
  payment_confirmed_at timestamptz,
  registered_at timestamptz not null default now(),
  eligibility_status text not null default 'pending'
    check (eligibility_status in ('pending', 'verified', 'ineligible', 'disqualified')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, user_id)
);

create table public.weka_mawe_check_ins (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.weka_mawe_editions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  registration_id uuid not null references public.weka_mawe_registrations(id) on delete cascade,
  status text not null default 'checked_in'
    check (status in ('checked_in', 'cancelled', 'no_show')),
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, user_id),
  unique (registration_id)
);

create table public.weka_mawe_bracket_matches (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.weka_mawe_editions(id) on delete cascade,
  round_key text not null
    check (round_key in ('round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'final')),
  round_index integer not null check (round_index between 1 and 5),
  match_number integer not null,
  seed_one integer,
  seed_two integer,
  player_one_registration_id uuid references public.weka_mawe_registrations(id) on delete set null,
  player_two_registration_id uuid references public.weka_mawe_registrations(id) on delete set null,
  player_one_user_id uuid references public.profiles(id) on delete set null,
  player_two_user_id uuid references public.profiles(id) on delete set null,
  player_one_score integer check (player_one_score >= 0),
  player_two_score integer check (player_two_score >= 0),
  winner_registration_id uuid references public.weka_mawe_registrations(id) on delete set null,
  winner_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'live', 'completed', 'disputed', 'void')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  next_match_number integer,
  next_player_slot integer check (next_player_slot in (1, 2)),
  recording_expected boolean not null default false,
  recording_status text not null default 'not_required'
    check (recording_status in ('not_required', 'expected', 'received', 'missing')),
  recording_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, round_key, match_number)
);

create table public.weka_mawe_admin_notes (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.weka_mawe_editions(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index weka_mawe_editions_status_starts_idx
  on public.weka_mawe_editions(status, starts_at desc);
create index weka_mawe_registrations_edition_payment_idx
  on public.weka_mawe_registrations(edition_id, payment_status, eligibility_status);
create index weka_mawe_registrations_user_idx
  on public.weka_mawe_registrations(user_id, edition_id);
create index weka_mawe_check_ins_edition_idx
  on public.weka_mawe_check_ins(edition_id, status, checked_in_at);
create index weka_mawe_bracket_matches_edition_round_idx
  on public.weka_mawe_bracket_matches(edition_id, round_index, match_number);

create or replace function public.enforce_weka_mawe_paid_capacity()
returns trigger
language plpgsql
as $$
declare
  confirmed_count integer;
  player_cap integer;
begin
  if new.payment_status = 'paid'
    and (tg_op = 'INSERT' or coalesce(old.payment_status, '') <> 'paid') then
    select max_players into player_cap
    from public.weka_mawe_editions
    where id = new.edition_id;

    select count(*) into confirmed_count
    from public.weka_mawe_registrations
    where edition_id = new.edition_id
      and payment_status = 'paid'
      and eligibility_status <> 'disqualified'
      and id <> new.id;

    if confirmed_count >= coalesce(player_cap, 32) then
      raise exception 'weka_mawe_capacity_reached'
        using detail = format('edition_id=%s max_players=%s', new.edition_id, player_cap);
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_weka_mawe_paid_capacity
before insert or update of payment_status, eligibility_status
on public.weka_mawe_registrations
for each row
execute function public.enforce_weka_mawe_paid_capacity();

alter table public.weka_mawe_series enable row level security;
alter table public.weka_mawe_editions enable row level security;
alter table public.weka_mawe_registrations enable row level security;
alter table public.weka_mawe_check_ins enable row level security;
alter table public.weka_mawe_bracket_matches enable row level security;
alter table public.weka_mawe_admin_notes enable row level security;

revoke all on public.weka_mawe_series from anon, authenticated;
revoke all on public.weka_mawe_editions from anon, authenticated;
revoke all on public.weka_mawe_registrations from anon, authenticated;
revoke all on public.weka_mawe_check_ins from anon, authenticated;
revoke all on public.weka_mawe_bracket_matches from anon, authenticated;
revoke all on public.weka_mawe_admin_notes from anon, authenticated;

grant all on public.weka_mawe_series to service_role;
grant all on public.weka_mawe_editions to service_role;
grant all on public.weka_mawe_registrations to service_role;
grant all on public.weka_mawe_check_ins to service_role;
grant all on public.weka_mawe_bracket_matches to service_role;
grant all on public.weka_mawe_admin_notes to service_role;

insert into public.weka_mawe_series (slug, title, description, status)
values (
  'weka-mawe-weekly-challenge',
  'PlayMechi Weka Mawe Weekly Challenge',
  'Weekly eFootball tournament hosted on Mechi.club.',
  'active'
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  updated_at = now();

insert into public.weka_mawe_editions (
  series_id,
  slug,
  title,
  game,
  host_handle,
  registration_fee_kes,
  max_players,
  starts_at,
  registration_closes_at,
  check_in_opens_at,
  check_in_closes_at,
  status
)
select
  id,
  'weka-mawe-2026-05-24',
  'Weka Mawe Weekly Challenge - 24 May 2026',
  'efootball',
  'gamer_mastaa19',
  100,
  32,
  '2026-05-24T14:00:00+03:00'::timestamptz,
  '2026-05-24T13:30:00+03:00'::timestamptz,
  '2026-05-24T13:00:00+03:00'::timestamptz,
  '2026-05-24T13:55:00+03:00'::timestamptz,
  'registration_open'
from public.weka_mawe_series
where slug = 'weka-mawe-weekly-challenge'
on conflict (slug) do update set
  title = excluded.title,
  game = excluded.game,
  host_handle = excluded.host_handle,
  registration_fee_kes = excluded.registration_fee_kes,
  max_players = excluded.max_players,
  starts_at = excluded.starts_at,
  registration_closes_at = excluded.registration_closes_at,
  check_in_opens_at = excluded.check_in_opens_at,
  check_in_closes_at = excluded.check_in_closes_at,
  status = excluded.status,
  updated_at = now();
