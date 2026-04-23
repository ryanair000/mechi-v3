insert into public.ways_to_earn
  (id, title, description, rp_amount, category, frequency, sort_order, active)
values
  (
    'affiliate_invite_used',
    'Get a signup through your invite code',
    '+300 RP every time a new player finishes signup with your invite code.',
    300,
    'social',
    'per_event',
    85,
    true
  )
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  rp_amount = excluded.rp_amount,
  category = excluded.category,
  frequency = excluded.frequency,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();
