-- Durable provider evidence for every paid Mechi product. These fields are
-- written only after the server re-verifies the transaction against Paystack.

alter table public.subscriptions
  add column if not exists payment_provider_transaction_id bigint,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_currency text;

alter table public.tournament_players
  add column if not exists payment_provider_transaction_id bigint,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_currency text;

alter table public.online_tournament_registrations
  add column if not exists payment_provider_transaction_id bigint,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_currency text;

alter table public.weka_mawe_registrations
  add column if not exists payment_provider_transaction_id bigint,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_currency text;

create unique index if not exists subscriptions_provider_transaction_unique
  on public.subscriptions(payment_provider_transaction_id)
  where payment_provider_transaction_id is not null;

create unique index if not exists tournament_players_provider_transaction_unique
  on public.tournament_players(payment_provider_transaction_id)
  where payment_provider_transaction_id is not null;

create unique index if not exists online_registrations_provider_transaction_unique
  on public.online_tournament_registrations(payment_provider_transaction_id)
  where payment_provider_transaction_id is not null;

create unique index if not exists weka_mawe_provider_transaction_unique
  on public.weka_mawe_registrations(payment_provider_transaction_id)
  where payment_provider_transaction_id is not null;

alter table public.subscriptions
  drop constraint if exists subscriptions_payment_currency_check;
alter table public.subscriptions
  add constraint subscriptions_payment_currency_check
  check (payment_currency is null or payment_currency ~ '^[A-Z]{3}$') not valid;
alter table public.subscriptions validate constraint subscriptions_payment_currency_check;

alter table public.tournament_players
  drop constraint if exists tournament_players_payment_currency_check;
alter table public.tournament_players
  add constraint tournament_players_payment_currency_check
  check (payment_currency is null or payment_currency ~ '^[A-Z]{3}$') not valid;
alter table public.tournament_players validate constraint tournament_players_payment_currency_check;

alter table public.online_tournament_registrations
  drop constraint if exists online_registrations_payment_currency_check;
alter table public.online_tournament_registrations
  add constraint online_registrations_payment_currency_check
  check (payment_currency is null or payment_currency ~ '^[A-Z]{3}$') not valid;
alter table public.online_tournament_registrations validate constraint online_registrations_payment_currency_check;

alter table public.weka_mawe_registrations
  drop constraint if exists weka_mawe_payment_currency_check;
alter table public.weka_mawe_registrations
  add constraint weka_mawe_payment_currency_check
  check (payment_currency is null or payment_currency ~ '^[A-Z]{3}$') not valid;
alter table public.weka_mawe_registrations validate constraint weka_mawe_payment_currency_check;
