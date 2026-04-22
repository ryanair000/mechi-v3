-- =============================================
-- PROFILES: New game columns for newly ranked games
-- =============================================
alter table public.profiles
  add column if not exists rating_rocketleague  integer not null default 500,
  add column if not exists wins_rocketleague    integer not null default 0,
  add column if not exists losses_rocketleague  integer not null default 0,
  add column if not exists rating_mariokart     integer not null default 500,
  add column if not exists wins_mariokart       integer not null default 0,
  add column if not exists losses_mariokart     integer not null default 0,
  add column if not exists rating_smashbros     integer not null default 500,
  add column if not exists wins_smashbros       integer not null default 0,
  add column if not exists losses_smashbros     integer not null default 0,
  add column if not exists rating_cs2           integer not null default 500,
  add column if not exists wins_cs2             integer not null default 0,
  add column if not exists losses_cs2           integer not null default 0,
  add column if not exists rating_valorant      integer not null default 500,
  add column if not exists wins_valorant        integer not null default 0,
  add column if not exists losses_valorant      integer not null default 0;

-- Lobby score tracking for non-ranked games
alter table public.profiles
  add column if not exists lobby_score_codm      integer not null default 0,
  add column if not exists lobby_score_pubgm     integer not null default 0,
  add column if not exists lobby_score_freefire  integer not null default 0,
  add column if not exists lobby_score_fortnite  integer not null default 0;

-- Ranking system state
alter table public.profiles
  add column if not exists placement_matches  jsonb not null default '{}',
  add column if not exists rank_protection    jsonb not null default '{}';

-- Match notes
alter table public.matches
  add column if not exists notes text;

-- =============================================
-- RANK SEASONS
-- =============================================
create table if not exists public.rank_seasons (
  id            serial primary key,
  season_number integer not null,
  game          text not null,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  peak_rating   integer not null,
  final_rating  integer not null,
  peak_tier     text not null,
  final_tier    text not null,
  matches       integer not null default 0,
  wins          integer not null default 0,
  ended_at      timestamptz not null default now()
);
create index if not exists rank_seasons_user_game_idx
  on public.rank_seasons(user_id, game, season_number);

alter table public.rank_seasons enable row level security;
create policy "users read own seasons" on public.rank_seasons
  for select to authenticated using (auth.uid() = user_id);

-- =============================================
-- WAYS TO EARN (admin-managed, replaces hardcoded array)
-- =============================================
create table if not exists public.ways_to_earn (
  id          text primary key,
  title       text not null,
  description text not null,
  rp_amount   integer not null,
  category    text not null default 'general',
  frequency   text not null default 'once',
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.ways_to_earn enable row level security;
create policy "authenticated read active earn methods" on public.ways_to_earn
  for select to authenticated using (active = true);

insert into public.ways_to_earn
  (id, title, description, rp_amount, category, frequency, sort_order)
values
  ('account_link',         'Link ChezaHub',                       'One-time bonus when you link your ChezaHub account.',                   200,  'chezahub', 'once',      10),
  ('profile_completion',   'Complete your profile',               'Fill in username, phone, country, games, and game IDs.',                200,  'general',  'once',      20),
  ('first_match_of_day',   'Play your first match of the day',    '+30 RP once per calendar day.',                                          30,  'match',    'daily',     30),
  ('streak_three',         'Win 3 in a row',                      '+75 RP once per day when your streak hits 3.',                           75,  'match',    'daily',     40),
  ('streak_five',          'Win 5 in a row',                      '+150 RP once per week when your streak hits 5.',                        150,  'match',    'weekly',    50),
  ('streak_ten',           'Win 10 in a row',                     '+400 RP once per week when your streak hits 10.',                       400,  'match',    'weekly',    55),
  ('ranked_tier_up',       'Advance a rank tier',                 '+100 RP each time your rank tier increases.',                           100,  'match',    'per_event', 60),
  ('daily_login',          'Log in today',                        '+10 RP once per calendar day for any app visit.',                        10,  'general',  'daily',     70),
  ('share_page_action',    'Share from your Share page',          '+25 RP once per day for a verified share action.',                       25,  'social',   'daily',     80),
  ('invitee_starter',      'Join as an invited player',           '+500 RP after linking ChezaHub and finishing your first match.',        500,  'general',  'once',      90),
  ('referral_main',        'Refer a buyer',                       '+3,000 RP when your invite completes a ChezaHub order >= KES 2,000.', 3000, 'chezahub', 'per_event', 100),
  ('chezahub_first_order', 'Place your first ChezaHub order',     '+250 RP when you complete your first paid ChezaHub order.',             250,  'chezahub', 'once',      110),
  ('tournament_win',       'Win a tournament',                    '+500 RP for winning any Mechi tournament.',                             500,  'match',    'per_event', 200),
  ('tournament_runner_up', 'Finish 2nd in a tournament',          '+200 RP for a runner-up finish.',                                      200,  'match',    'per_event', 210),
  ('tournament_top_four',  'Reach the semi-finals',               '+75 RP for a top-4 tournament placement.',                              75,  'match',    'per_event', 220),
  ('first_tournament_join','Join your first tournament',          '+100 RP the first time you enter any tournament.',                     100,  'match',    'once',      230),
  ('season_top_ten',       'Finish top 10 in season rankings',    '+1,000 RP per game where you finish in the top 10 at season end.',   1000,  'match',    'per_event', 240),
  ('perfect_bo3_sweep',    'Win a clean sweep (3-0 in BO3)',      '+50 RP for a flawless best-of-3.',                                      50,  'match',    'per_event', 250),
  ('lobby_first_place',    'Finish 1st in a lobby match',         '+30 RP for a first-place finish in any lobby game.',                    30,  'match',    'per_event', 260),
  ('lobby_win_streak_3',   'Win 3 lobby matches in a row',        '+100 RP for 3 consecutive first-place lobby finishes.',                100,  'match',    'daily',     270)
on conflict (id) do nothing;

-- =============================================
-- REWARD CATALOG CACHE
-- =============================================
create table if not exists public.reward_catalog_cache (
  id                          text primary key,
  title                       text not null,
  description                 text not null,
  reward_type                 text not null,
  points_cost                 integer not null,
  phase                       text not null default 'live',
  active                      boolean not null default true,
  expires_in_hours            integer,
  discount_amount_kes         integer,
  max_order_coverage_percent  integer,
  sku_name                    text,
  margin_class                text,
  source                      text not null default 'chezahub',
  synced_at                   timestamptz,
  sort_order                  integer not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

alter table public.reward_catalog_cache enable row level security;
create policy "authenticated read active catalog" on public.reward_catalog_cache
  for select to authenticated using (active = true);

insert into public.reward_catalog_cache
  (id, title, description, reward_type, points_cost, source, sort_order)
values
  ('mechi_pro_7day',          '7-Day Pro Trial',           'Unlock Pro features for 7 days. Applied instantly to your account.',     'mechi_perk', 800,  'mechi_native', 10),
  ('mechi_priority_queue',    'Priority Matchmaking Pass', 'Skip to the top of the matchmaking queue for 24 hours.',                 'mechi_perk', 300,  'mechi_native', 20),
  ('mechi_badge_trailblazer', 'Trailblazer Badge',         'Permanent cosmetic badge on your public profile. Early adopter.',       'mechi_perk', 500,  'mechi_native', 30),
  ('mechi_badge_centurion',   'Centurion Badge',           'Permanent badge: 100+ matches played milestone.',                       'mechi_perk', 1500, 'mechi_native', 40)
on conflict (id) do nothing;

-- =============================================
-- PROFILE BADGES
-- =============================================
create table if not exists public.profile_badges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  badge_id   text not null,
  awarded_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

alter table public.profile_badges enable row level security;
create policy "users read own badges" on public.profile_badges
  for select to authenticated using (auth.uid() = user_id);
create policy "service insert badges" on public.profile_badges
  for insert to service_role with check (true);

-- =============================================
-- TOURNAMENTS: new columns
-- =============================================
alter table public.tournaments
  add column if not exists format         text not null default 'single_elimination',
  add column if not exists platform       text,
  add column if not exists region         text,
  add column if not exists max_rounds     integer,
  add column if not exists current_round  integer not null default 0,
  add column if not exists rules          text;
