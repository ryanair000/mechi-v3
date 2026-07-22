-- Activate a subscription, update the profile entitlement, and retire any
-- previous active subscription in one database transaction. The function is
-- intentionally SECURITY INVOKER and callable only by the server service role.

create or replace function public.activate_verified_subscription(
  p_subscription_id uuid,
  p_started_at timestamptz,
  p_expires_at timestamptz,
  p_provider_transaction_id bigint default null,
  p_verified_at timestamptz default null,
  p_currency text default null
)
returns public.subscriptions
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  target public.subscriptions%rowtype;
  evidence_field_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if p_started_at is null or p_expires_at is null or p_expires_at <= p_started_at then
    raise exception 'Invalid subscription activation window' using errcode = '22023';
  end if;

  evidence_field_count :=
    (p_provider_transaction_id is not null)::integer
    + (p_verified_at is not null)::integer
    + (p_currency is not null)::integer;

  if evidence_field_count not in (0, 3) then
    raise exception 'Payment verification evidence must be complete' using errcode = '22023';
  end if;

  if p_currency is not null and p_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid payment currency' using errcode = '22023';
  end if;

  select *
  into target
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;

  if target.status = 'active' then
    if p_provider_transaction_id is not null
      and target.payment_provider_transaction_id is null then
      update public.subscriptions
      set payment_provider_transaction_id = p_provider_transaction_id,
          payment_verified_at = p_verified_at,
          payment_currency = p_currency
      where id = target.id
      returning * into target;
    end if;

    return target;
  end if;

  if target.status not in ('pending', 'failed') then
    raise exception 'Subscription cannot be activated from status %', target.status
      using errcode = '22023';
  end if;

  update public.subscriptions
  set status = 'active',
      started_at = p_started_at,
      expires_at = p_expires_at,
      cancelled_at = null,
      payment_provider_transaction_id = coalesce(
        p_provider_transaction_id,
        payment_provider_transaction_id
      ),
      payment_verified_at = coalesce(p_verified_at, payment_verified_at),
      payment_currency = coalesce(p_currency, payment_currency)
  where id = target.id
  returning * into target;

  update public.profiles
  set plan = target.plan,
      plan_since = p_started_at,
      plan_expires_at = p_expires_at
  where id = target.user_id;

  if not found then
    raise exception 'Subscription profile not found' using errcode = 'P0002';
  end if;

  update public.subscriptions
  set status = 'cancelled',
      cancelled_at = p_started_at
  where user_id = target.user_id
    and id <> target.id
    and status = 'active';

  return target;
end;
$$;

revoke all on function public.activate_verified_subscription(
  uuid,
  timestamptz,
  timestamptz,
  bigint,
  timestamptz,
  text
) from public, anon, authenticated;
grant execute on function public.activate_verified_subscription(
  uuid,
  timestamptz,
  timestamptz,
  bigint,
  timestamptz,
  text
) to service_role;
