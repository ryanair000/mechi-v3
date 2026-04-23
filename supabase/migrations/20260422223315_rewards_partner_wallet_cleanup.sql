alter table if exists public.reward_redemptions
  drop constraint if exists reward_redemptions_reward_type_check;

alter table if exists public.reward_redemptions
  add constraint reward_redemptions_reward_type_check
  check (reward_type in ('discount_code', 'reward_claim', 'mechi_perk'));

update public.ways_to_earn
set
  title = 'ChezaHub wallet ready automatically',
  description = 'Eligible partner rewards create or attach your ChezaHub wallet automatically.',
  rp_amount = 0,
  active = false
where id = 'account_link';

update public.ways_to_earn
set description = '+500 RP after you finish your first Mechi match as an invited player.'
where id = 'invitee_starter';
