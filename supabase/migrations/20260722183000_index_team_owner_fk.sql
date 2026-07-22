-- Keep team-owner lookups and owner deletion checks indexed.
create index if not exists idx_teams_owner_id
  on public.teams (owner_id)
  where owner_id is not null;
