-- Mechi side of the PlayMechi RP -> Cheza Credit bridge.

create schema if not exists private;

create table if not exists public.partner_reward_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  partner text not null check (partner in ('chezahub')),
  reward_kind text not null check (reward_kind in ('cheza_credit')),
  rp_amount integer not null check (rp_amount > 0),
  credit_kes numeric(12, 2) not null check (credit_kes > 0),
  conversion_rate_rp_per_kes integer not null check (conversion_rate_rp_per_kes > 0),
  rate_version text not null,
  status text not null default 'reserved' check (
    status in ('reserved', 'review', 'issued', 'redeemed', 'completed', 'expired', 'voided', 'restored', 'rejected', 'reconciliation_required')
  ),
  idempotency_key uuid not null unique,
  external_voucher_id text unique,
  external_wallet_transaction_id text unique,
  chezahub_user_id uuid,
  expires_at timestamptz,
  redeemed_at timestamptz,
  completed_at timestamptz,
  restored_at timestamptz,
  risk_status text not null default 'clear' check (risk_status in ('clear', 'hold', 'review', 'deny')),
  risk_reasons text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists partner_reward_exports_user_created_idx
  on public.partner_reward_exports (user_id, created_at desc);

create index if not exists partner_reward_exports_status_created_idx
  on public.partner_reward_exports (status, created_at)
  where status in ('reserved', 'review', 'issued', 'redeemed', 'reconciliation_required');

create index if not exists partner_reward_exports_expiry_idx
  on public.partner_reward_exports (expires_at)
  where status = 'issued';

create table if not exists public.partner_reward_callback_events (
  request_id uuid primary key,
  export_id uuid not null references public.partner_reward_exports(id) on delete cascade,
  event_type text not null,
  payload_fingerprint text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists partner_reward_callback_events_export_idx
  on public.partner_reward_callback_events (export_id, created_at desc);

alter table public.partner_reward_exports enable row level security;
alter table public.partner_reward_callback_events enable row level security;

drop policy if exists "Users read own partner reward exports" on public.partner_reward_exports;
create policy "Users read own partner reward exports"
  on public.partner_reward_exports for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.partner_reward_exports from public, anon, authenticated;
revoke all on public.partner_reward_callback_events from public, anon, authenticated;
grant select on public.partner_reward_exports to authenticated;
grant select, insert, update on public.partner_reward_exports to service_role;
grant select, insert on public.partner_reward_callback_events to service_role;

create or replace function private.reserve_chezahub_credit_export(
  p_user_id uuid,
  p_rp_amount integer,
  p_credit_kes numeric,
  p_rate integer,
  p_rate_version text,
  p_idempotency_key uuid,
  p_period_limit_kes numeric,
  p_daily_limit integer,
  p_monthly_budget_kes numeric,
  p_expires_at timestamptz,
  p_chezahub_user_id uuid,
  p_risk_status text default 'clear',
  p_risk_reasons text[] default '{}'::text[],
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_export public.partner_reward_exports%rowtype;
  v_period_credit numeric(12, 2);
  v_monthly_credit numeric(12, 2);
  v_daily_count integer;
  v_reward_result jsonb;
begin
  if p_user_id is null or p_idempotency_key is null then
    raise exception 'User and idempotency key are required';
  end if;
  if p_rp_amount <= 0 or p_credit_kes <= 0 or p_rate <= 0 then
    raise exception 'Reward amount is invalid';
  end if;
  if p_rp_amount <> round(p_credit_kes * p_rate)::integer then
    raise exception 'Reward amount does not match the approved rate';
  end if;
  if p_risk_status not in ('clear', 'hold', 'review', 'deny') then
    raise exception 'Risk status is invalid';
  end if;

  select * into v_export
  from public.partner_reward_exports
  where idempotency_key = p_idempotency_key;
  if found then
    if v_export.user_id <> p_user_id then
      raise exception 'Idempotency key belongs to another user';
    end if;
    if v_export.rp_amount <> p_rp_amount
       or v_export.credit_kes <> round(p_credit_kes, 2)
       or v_export.rate_version <> p_rate_version then
      raise exception 'Idempotency key was already used for a different reward';
    end if;
    return to_jsonb(v_export) || jsonb_build_object('idempotent', true);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 55219));
  perform pg_advisory_xact_lock(55220);

  select * into v_export
  from public.partner_reward_exports
  where idempotency_key = p_idempotency_key;
  if found then
    if v_export.user_id <> p_user_id then
      raise exception 'Idempotency key belongs to another user';
    end if;
    if v_export.rp_amount <> p_rp_amount
       or v_export.credit_kes <> round(p_credit_kes, 2)
       or v_export.rate_version <> p_rate_version then
      raise exception 'Idempotency key was already used for a different reward';
    end if;
    return to_jsonb(v_export) || jsonb_build_object('idempotent', true);
  end if;

  select coalesce(sum(credit_kes), 0) into v_period_credit
  from public.partner_reward_exports
  where user_id = p_user_id
    and created_at >= timezone('utc', now()) - interval '30 days'
    and status in ('reserved', 'review', 'issued', 'redeemed', 'completed', 'reconciliation_required');

  if p_period_limit_kes > 0 and v_period_credit + p_credit_kes > p_period_limit_kes then
    raise exception 'Rolling 30-day Cheza Credit limit exceeded';
  end if;

  select count(*) into v_daily_count
  from public.partner_reward_exports
  where user_id = p_user_id
    and created_at >= timezone('utc', now()) - interval '24 hours'
    and status in ('reserved', 'review', 'issued', 'redeemed', 'completed', 'reconciliation_required');

  if p_daily_limit > 0 and v_daily_count >= p_daily_limit then
    raise exception 'Daily Cheza Credit redemption limit exceeded';
  end if;

  select coalesce(sum(credit_kes), 0) into v_monthly_credit
  from public.partner_reward_exports
  where created_at >= date_trunc('month', timezone('utc', now())) at time zone 'UTC'
    and status in ('reserved', 'review', 'issued', 'redeemed', 'completed', 'reconciliation_required');

  if p_monthly_budget_kes > 0 and v_monthly_credit + p_credit_kes > p_monthly_budget_kes then
    raise exception 'Monthly Cheza Credit issuance budget reached';
  end if;
  if p_risk_status = 'deny' then
    raise exception 'Reward redemption is not available for this account';
  end if;

  insert into public.partner_reward_exports (
    user_id, partner, reward_kind, rp_amount, credit_kes,
    conversion_rate_rp_per_kes, rate_version, status, idempotency_key,
    expires_at, chezahub_user_id, risk_status, risk_reasons, metadata
  ) values (
    p_user_id, 'chezahub', 'cheza_credit', p_rp_amount, round(p_credit_kes, 2),
    p_rate, left(p_rate_version, 100),
    case when p_risk_status in ('hold', 'review') then 'review' else 'reserved' end,
    p_idempotency_key, p_expires_at, p_chezahub_user_id, p_risk_status,
    coalesce(p_risk_reasons, '{}'::text[]), coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_export;

  v_reward_result := public.apply_reward_event(
    p_user_id,
    'reward:partner-credit-reserve:' || v_export.id::text,
    'partner_credit_reservation',
    -p_rp_amount,
    0,
    0,
    'chezahub_credit',
    null,
    null,
    v_export.id::text,
    jsonb_build_object('export_id', v_export.id, 'credit_kes', v_export.credit_kes, 'rate_version', v_export.rate_version)
  );

  return to_jsonb(v_export) || jsonb_build_object('idempotent', false, 'reward_result', v_reward_result);
end;
$$;

create or replace function public.reserve_chezahub_credit_export(
  p_user_id uuid,
  p_rp_amount integer,
  p_credit_kes numeric,
  p_rate integer,
  p_rate_version text,
  p_idempotency_key uuid,
  p_period_limit_kes numeric,
  p_daily_limit integer,
  p_monthly_budget_kes numeric,
  p_expires_at timestamptz,
  p_chezahub_user_id uuid,
  p_risk_status text default 'clear',
  p_risk_reasons text[] default '{}'::text[],
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.reserve_chezahub_credit_export(
    p_user_id, p_rp_amount, p_credit_kes, p_rate, p_rate_version,
    p_idempotency_key, p_period_limit_kes, p_daily_limit, p_monthly_budget_kes,
    p_expires_at, p_chezahub_user_id,
    p_risk_status, p_risk_reasons, p_metadata
  );
$$;

create or replace function private.restore_chezahub_credit_export(
  p_export_id uuid,
  p_reason text,
  p_external_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_export public.partner_reward_exports%rowtype;
  v_reward_result jsonb;
begin
  select * into v_export
  from public.partner_reward_exports
  where id = p_export_id
  for update;

  if not found then
    raise exception 'Reward export not found';
  end if;
  if v_export.status = 'restored' then
    return to_jsonb(v_export) || jsonb_build_object('idempotent', true);
  end if;
  if v_export.status in ('redeemed', 'completed') or v_export.external_wallet_transaction_id is not null then
    raise exception 'Redeemed reward cannot be restored';
  end if;
  if p_external_status not in ('voided', 'expired', 'not_issued') then
    raise exception 'Partner confirmation is required before restoration';
  end if;

  v_reward_result := public.apply_reward_event(
    v_export.user_id,
    'reward:partner-credit-restore:' || v_export.id::text,
    'partner_credit_reservation_reversal',
    v_export.rp_amount,
    0,
    0,
    'chezahub_credit',
    null,
    null,
    v_export.id::text,
    jsonb_build_object('export_id', v_export.id, 'reason', left(coalesce(p_reason, ''), 500), 'external_status', p_external_status)
  );

  update public.partner_reward_exports
  set status = 'restored', restored_at = timezone('utc', now()),
      updated_at = timezone('utc', now()),
      metadata = metadata || jsonb_build_object('restore_reason', left(coalesce(p_reason, ''), 500), 'external_status', p_external_status)
  where id = v_export.id
  returning * into v_export;

  return to_jsonb(v_export) || jsonb_build_object('idempotent', false, 'reward_result', v_reward_result);
end;
$$;

create or replace function public.restore_chezahub_credit_export(
  p_export_id uuid,
  p_reason text,
  p_external_status text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.restore_chezahub_credit_export(p_export_id, p_reason, p_external_status);
$$;

revoke all on function private.reserve_chezahub_credit_export(uuid, integer, numeric, integer, text, uuid, numeric, integer, numeric, timestamptz, uuid, text, text[], jsonb),
  private.restore_chezahub_credit_export(uuid, text, text),
  public.reserve_chezahub_credit_export(uuid, integer, numeric, integer, text, uuid, numeric, integer, numeric, timestamptz, uuid, text, text[], jsonb),
  public.restore_chezahub_credit_export(uuid, text, text)
  from public, anon, authenticated;

grant execute on function private.reserve_chezahub_credit_export(uuid, integer, numeric, integer, text, uuid, numeric, integer, numeric, timestamptz, uuid, text, text[], jsonb),
  private.restore_chezahub_credit_export(uuid, text, text),
  public.reserve_chezahub_credit_export(uuid, integer, numeric, integer, text, uuid, numeric, integer, numeric, timestamptz, uuid, text, text[], jsonb),
  public.restore_chezahub_credit_export(uuid, text, text)
  to service_role;

