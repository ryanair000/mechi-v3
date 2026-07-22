alter table public.match_challenges
  add column if not exists visibility text not null default 'direct';

alter table public.match_challenges
  alter column opponent_id drop not null;

alter table public.match_challenges
  drop constraint if exists match_challenges_visibility_check;

alter table public.match_challenges
  add constraint match_challenges_visibility_check
  check (visibility in ('direct', 'open'));

alter table public.match_challenges
  drop constraint if exists match_challenges_direct_opponent_check;

alter table public.match_challenges
  add constraint match_challenges_direct_opponent_check
  check (visibility = 'open' or opponent_id is not null);

create index if not exists idx_match_challenges_open_pending
  on public.match_challenges(created_at desc)
  where visibility = 'open' and status = 'pending';

alter table public.match_challenges enable row level security;
revoke all on table public.match_challenges from anon, authenticated;
grant all on table public.match_challenges to service_role;
