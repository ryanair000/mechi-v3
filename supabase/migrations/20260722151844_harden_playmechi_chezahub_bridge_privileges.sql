-- Enforce least-privilege ACLs for the PlayMechi -> ChezaHub credit bridge.

alter table public.partner_reward_exports enable row level security;
alter table public.partner_reward_callback_events enable row level security;

revoke all on table public.partner_reward_exports
  from public, anon, authenticated, service_role;
revoke all on table public.partner_reward_callback_events
  from public, anon, authenticated, service_role;

grant select on table public.partner_reward_exports to authenticated;
grant select, insert, update on table public.partner_reward_exports to service_role;
grant select, insert on table public.partner_reward_callback_events to service_role;

revoke all on function public.reserve_chezahub_credit_export(
  uuid, integer, numeric, integer, text, uuid, numeric, integer, numeric,
  timestamptz, uuid, text, text[], jsonb
) from public, anon, authenticated;
revoke all on function private.reserve_chezahub_credit_export(
  uuid, integer, numeric, integer, text, uuid, numeric, integer, numeric,
  timestamptz, uuid, text, text[], jsonb
) from public, anon, authenticated;

revoke all on function public.restore_chezahub_credit_export(uuid, text, text)
  from public, anon, authenticated;
revoke all on function private.restore_chezahub_credit_export(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.reserve_chezahub_credit_export(
  uuid, integer, numeric, integer, text, uuid, numeric, integer, numeric,
  timestamptz, uuid, text, text[], jsonb
) to service_role;
grant execute on function private.reserve_chezahub_credit_export(
  uuid, integer, numeric, integer, text, uuid, numeric, integer, numeric,
  timestamptz, uuid, text, text[], jsonb
) to service_role;
grant execute on function public.restore_chezahub_credit_export(uuid, text, text)
  to service_role;
grant execute on function private.restore_chezahub_credit_export(uuid, text, text)
  to service_role;
