alter table public.tournaments
  add column if not exists scheduled_for timestamptz;

update public.tournaments
set scheduled_for = started_at
where scheduled_for is null
  and started_at is not null;

create index if not exists idx_tournaments_status_scheduled_for
  on public.tournaments (status, scheduled_for asc);
