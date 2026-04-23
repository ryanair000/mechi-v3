create table if not exists public.reward_catalog (
  id                  text primary key,
  game                text not null check (game in ('codm', 'pubgm', 'efootball')),
  title               text not null,
  reward_amount_label text not null,
  cost_kes            integer not null check (cost_kes > 0),
  cost_points         integer not null check (cost_points > 0 and cost_points = (cost_kes * 10)),
  active              boolean not null default true,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

create index if not exists reward_catalog_active_sort_idx
  on public.reward_catalog (active, sort_order asc);

alter table public.reward_catalog enable row level security;

drop policy if exists "authenticated read active reward catalog" on public.reward_catalog;
create policy "authenticated read active reward catalog"
  on public.reward_catalog
  for select
  to authenticated
  using (active = true);

grant select on public.reward_catalog to authenticated;
grant all on public.reward_catalog to service_role;

insert into public.reward_catalog (
  id,
  game,
  title,
  reward_amount_label,
  cost_kes,
  cost_points,
  active,
  sort_order
)
values
  ('codm_30_cp', 'codm', 'CODM 30 CP', '30 CP', 70, 700, true, 10),
  ('codm_80_cp', 'codm', 'CODM 80 CP', '80 CP', 160, 1600, true, 20),
  ('codm_420_cp', 'codm', 'CODM 420 CP', '420 CP', 800, 8000, true, 30),
  ('codm_880_cp', 'codm', 'CODM 880 CP', '880 CP', 1600, 16000, true, 40),
  ('codm_2400_cp', 'codm', 'CODM 2400 CP', '2,400 CP', 3900, 39000, true, 50),
  ('codm_5000_cp', 'codm', 'CODM 5000 CP', '5,000 CP', 7700, 77000, true, 60),
  ('codm_10800_cp', 'codm', 'CODM 10800 CP', '10,800 CP', 15400, 154000, true, 70),
  ('pubgm_60_uc', 'pubgm', 'PUBG Mobile 60 UC', '60 UC', 120, 1200, true, 110),
  ('pubgm_325_uc', 'pubgm', 'PUBG Mobile 325 UC', '325 UC', 600, 6000, true, 120),
  ('pubgm_660_uc', 'pubgm', 'PUBG Mobile 660 UC', '660 UC', 1200, 12000, true, 130),
  ('pubgm_1800_uc', 'pubgm', 'PUBG Mobile 1800 UC', '1,800 UC', 3000, 30000, true, 140),
  ('pubgm_3850_uc', 'pubgm', 'PUBG Mobile 3850 UC', '3,850 UC', 6000, 60000, true, 150),
  ('pubgm_8100_uc', 'pubgm', 'PUBG Mobile 8100 UC', '8,100 UC', 12000, 120000, true, 160),
  ('efootball_137_coins', 'efootball', 'eFootball 137 Coins', '137 Coins', 150, 1500, true, 210),
  ('efootball_315_coins', 'efootball', 'eFootball 315 Coins', '315 Coins', 340, 3400, true, 220),
  ('efootball_578_coins', 'efootball', 'eFootball 578 Coins', '578 Coins', 610, 6100, true, 230),
  ('efootball_788_coins', 'efootball', 'eFootball 788 Coins', '788 Coins', 830, 8300, true, 240),
  ('efootball_1092_coins', 'efootball', 'eFootball 1092 Coins', '1,092 Coins', 1150, 11500, true, 250),
  ('efootball_2237_coins', 'efootball', 'eFootball 2237 Coins', '2,237 Coins', 2300, 23000, true, 260),
  ('efootball_3413_coins', 'efootball', 'eFootball 3413 Coins', '3,413 Coins', 3400, 34000, true, 270),
  ('efootball_5985_coins', 'efootball', 'eFootball 5985 Coins', '5,985 Coins', 5700, 57000, true, 280),
  ('efootball_13440_coins', 'efootball', 'eFootball 13440 Coins', '13,440 Coins', 12000, 120000, true, 290),
  ('efootball_32200_coins', 'efootball', 'eFootball 32200 Coins', '32,200 Coins', 28000, 280000, true, 300)
on conflict (id) do update
set
  game = excluded.game,
  title = excluded.title,
  reward_amount_label = excluded.reward_amount_label,
  cost_kes = excluded.cost_kes,
  cost_points = excluded.cost_points,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

create table if not exists public.reward_redemption_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  catalog_id          text not null references public.reward_catalog(id) on delete restrict,
  game                text not null check (game in ('codm', 'pubgm', 'efootball')),
  reward_amount_label text not null,
  cost_kes            integer not null check (cost_kes > 0),
  cost_points         integer not null check (cost_points > 0),
  mpesa_number        text not null,
  status              text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'rejected')),
  submitted_at        timestamptz not null default timezone('utc', now()),
  processing_at       timestamptz,
  completed_at        timestamptz,
  rejected_at         timestamptz,
  processed_by        uuid references public.profiles(id) on delete set null,
  admin_note          text,
  updated_at          timestamptz not null default timezone('utc', now())
);

create index if not exists reward_redemption_requests_user_submitted_idx
  on public.reward_redemption_requests (user_id, submitted_at desc);

create index if not exists reward_redemption_requests_status_submitted_idx
  on public.reward_redemption_requests (status, submitted_at desc);

alter table public.reward_redemption_requests enable row level security;

drop policy if exists "users read own redemption requests" on public.reward_redemption_requests;
create policy "users read own redemption requests"
  on public.reward_redemption_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.reward_redemption_requests to authenticated;
grant all on public.reward_redemption_requests to service_role;

create table if not exists public.ways_to_earn (
  id          text primary key,
  title       text not null,
  description text not null,
  rp_amount   integer not null,
  category    text not null default 'general',
  frequency   text not null default 'once',
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

alter table public.ways_to_earn enable row level security;

drop policy if exists "authenticated read active earn methods" on public.ways_to_earn;
create policy "authenticated read active earn methods"
  on public.ways_to_earn
  for select
  to authenticated
  using (active = true);

grant select on public.ways_to_earn to authenticated;
grant all on public.ways_to_earn to service_role;

insert into public.ways_to_earn (
  id,
  title,
  description,
  rp_amount,
  category,
  frequency,
  active,
  sort_order
)
values
  ('profile_completion', 'Complete your profile', 'Fill in your username, phone, country, games, and game IDs.', 200, 'general', 'once', true, 20),
  ('first_match_of_day', 'Play your first match of the day', '+30 RP once per calendar day.', 30, 'match', 'daily', true, 30),
  ('streak_three', 'Win 3 in a row', '+75 RP once per day when your streak hits 3.', 75, 'match', 'daily', true, 40),
  ('streak_five', 'Win 5 in a row', '+150 RP once per week when your streak hits 5.', 150, 'match', 'weekly', true, 50),
  ('streak_ten', 'Win 10 in a row', '+400 RP once per week when your streak hits 10.', 400, 'match', 'weekly', true, 55),
  ('ranked_tier_up', 'Advance a rank tier', '+100 RP each time your rank tier increases.', 100, 'match', 'per_event', true, 60),
  ('daily_login', 'Log in today', '+10 RP once per calendar day for any app visit.', 10, 'general', 'daily', true, 70),
  ('share_page_action', 'Share from your Share page', '+25 RP once per day for a verified share action.', 25, 'social', 'daily', true, 80),
  ('affiliate_invite_used', 'Get a signup through your invite code', '+300 RP every time a new player finishes signup with your invite code.', 300, 'growth', 'per_event', true, 90),
  ('invitee_starter', 'Join as an invited player', '+500 RP after you finish your first Mechi match as an invited player.', 500, 'growth', 'once', true, 100),
  ('tournament_win', 'Win a tournament', '+500 RP for winning any Mechi tournament.', 500, 'match', 'per_event', true, 200),
  ('tournament_runner_up', 'Finish 2nd in a tournament', '+200 RP for a runner-up finish.', 200, 'match', 'per_event', true, 210),
  ('tournament_top_four', 'Reach the semi-finals', '+75 RP for a top-4 tournament placement.', 75, 'match', 'per_event', true, 220),
  ('first_tournament_join', 'Join your first tournament', '+100 RP the first time you enter any tournament.', 100, 'match', 'once', true, 230),
  ('season_top_ten', 'Finish top 10 in season rankings', '+1,000 RP per game where you finish in the top 10 at season end.', 1000, 'match', 'per_event', true, 240),
  ('perfect_bo3_sweep', 'Win a clean sweep (3-0 in BO3)', '+50 RP for a flawless best-of-3.', 50, 'match', 'per_event', true, 250),
  ('lobby_first_place', 'Finish 1st in a lobby match', '+30 RP for a first-place finish in any lobby game.', 30, 'match', 'per_event', true, 260),
  ('lobby_win_streak_3', 'Win 3 lobby matches in a row', '+100 RP for 3 consecutive first-place lobby finishes.', 100, 'match', 'daily', true, 270)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  rp_amount = excluded.rp_amount,
  category = excluded.category,
  frequency = excluded.frequency,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

update public.ways_to_earn
set
  active = false,
  updated_at = timezone('utc', now())
where id in ('account_link', 'referral_main', 'chezahub_first_order');
