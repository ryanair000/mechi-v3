-- Mechi V5 Gamer Passport Phase 7: platform connections and ecosystem scale.
-- All provider calls, token operations, imports, and scoped API reads are server-mediated.

CREATE TABLE IF NOT EXISTS public.passport_provider_catalog (
  provider_key text PRIMARY KEY,
  label text NOT NULL,
  connection_method text NOT NULL CHECK (connection_method IN ('openid', 'oauth2', 'api_key', 'manual_verification')),
  capability_scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('available', 'planned', 'paused', 'retired')),
  attribution_label text NOT NULL,
  terms_url text,
  privacy_url text,
  cache_ttl_seconds integer NOT NULL DEFAULT 3600 CHECK (cache_ttl_seconds BETWEEN 60 AND 604800),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_provider_key_format CHECK (provider_key ~ '^[a-z][a-z0-9_]{1,31}$'),
  CONSTRAINT passport_provider_urls_https CHECK (
    (terms_url IS NULL OR terms_url ~ '^https://') AND (privacy_url IS NULL OR privacy_url ~ '^https://')
  )
);

CREATE TABLE IF NOT EXISTS public.passport_provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_key text NOT NULL REFERENCES public.passport_provider_catalog(provider_key) ON DELETE RESTRICT,
  provider_account_id text NOT NULL,
  account_label text NOT NULL DEFAULT '',
  account_url text,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'syncing', 'error', 'reauthorization_required', 'revoked')),
  granted_scopes text[] NOT NULL DEFAULT '{}',
  encrypted_access_token text,
  encrypted_refresh_token text,
  secret_version smallint NOT NULL DEFAULT 1 CHECK (secret_version BETWEEN 1 AND 100),
  token_expires_at timestamptz,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_sync_started_at timestamptz,
  last_synced_at timestamptz,
  last_sync_status text NOT NULL DEFAULT 'never' CHECK (last_sync_status IN ('never', 'running', 'success', 'partial', 'error')),
  last_error_code text,
  last_error_message text,
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_provider_connection_user_unique UNIQUE (user_id, provider_key),
  CONSTRAINT passport_provider_account_unique UNIQUE (provider_key, provider_account_id),
  CONSTRAINT passport_provider_account_url_https CHECK (account_url IS NULL OR account_url ~ '^https://'),
  CONSTRAINT passport_provider_connection_metadata_object CHECK (jsonb_typeof(provider_metadata) = 'object'),
  CONSTRAINT passport_provider_connection_encrypted_tokens CHECK (
    (encrypted_access_token IS NULL OR encrypted_access_token ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$')
    AND (encrypted_refresh_token IS NULL OR encrypted_refresh_token ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$')
  ),
  CONSTRAINT passport_provider_connection_revocation CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL AND encrypted_access_token IS NULL AND encrypted_refresh_token IS NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_connection_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_key text NOT NULL REFERENCES public.passport_provider_catalog(provider_key) ON DELETE CASCADE,
  state_hash text NOT NULL UNIQUE,
  requested_scopes text[] NOT NULL DEFAULT '{}',
  return_path text NOT NULL DEFAULT '/passport/connections',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_connection_state_hash_format CHECK (state_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT passport_connection_return_path CHECK (return_path ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  CONSTRAINT passport_connection_intent_expiry CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.passport_provider_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.passport_provider_connections(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'error', 'cancelled')),
  provider_cursor text,
  fetched_count integer NOT NULL DEFAULT 0 CHECK (fetched_count >= 0),
  staged_count integer NOT NULL DEFAULT 0 CHECK (staged_count >= 0),
  changed_count integer NOT NULL DEFAULT 0 CHECK (changed_count >= 0),
  removed_count integer NOT NULL DEFAULT 0 CHECK (removed_count >= 0),
  error_code text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  CONSTRAINT passport_provider_sync_idempotent UNIQUE (connection_id, idempotency_key),
  CONSTRAINT passport_provider_sync_completion CHECK ((status = 'running' AND completed_at IS NULL) OR (status <> 'running' AND completed_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.passport_external_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.passport_provider_connections(id) ON DELETE CASCADE,
  provider_item_type text NOT NULL CHECK (provider_item_type IN ('game', 'achievement', 'play_history', 'creator_channel', 'event')),
  provider_item_id text NOT NULL,
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text NOT NULL,
  remote_updated_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  import_state text NOT NULL DEFAULT 'staged' CHECK (import_state IN ('staged', 'imported', 'hidden', 'conflict', 'remote_removed')),
  matched_catalog_game_id uuid REFERENCES public.passport_game_catalog(id) ON DELETE SET NULL,
  passport_game_entry_id uuid REFERENCES public.passport_game_entries(id) ON DELETE SET NULL,
  conflict_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_external_item_unique UNIQUE (connection_id, provider_item_type, provider_item_id),
  CONSTRAINT passport_external_item_payload_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT passport_external_item_conflict_object CHECK (jsonb_typeof(conflict_details) = 'object'),
  CONSTRAINT passport_external_item_payload_hash_format CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT passport_external_item_state_dates CHECK (
    (import_state <> 'imported' OR imported_at IS NOT NULL)
    AND (import_state <> 'hidden' OR hidden_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_import_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_item_id uuid NOT NULL REFERENCES public.passport_external_items(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('staged', 'accepted', 'merged', 'hidden', 'restored', 'remote_removed', 'connection_erased')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_import_event_details_object CHECK (jsonb_typeof(details) = 'object')
);

CREATE TABLE IF NOT EXISTS public.passport_developer_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  rate_limit_per_hour integer NOT NULL DEFAULT 120 CHECK (rate_limit_per_hour BETWEEN 10 AND 1000),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_developer_token_label_length CHECK (char_length(label) BETWEEN 2 AND 60),
  CONSTRAINT passport_developer_token_prefix_format CHECK (token_prefix ~ '^mcp_[A-Za-z0-9_-]{8}$'),
  CONSTRAINT passport_developer_token_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT passport_developer_token_scopes CHECK (scopes <@ ARRAY['passport.summary:read', 'passport.games:read', 'passport.competition:read', 'passport.events:read', 'passport.achievements:read', 'webhooks:manage']::text[])
);

CREATE TABLE IF NOT EXISTS public.passport_developer_api_events (
  id bigserial PRIMARY KEY,
  token_id uuid NOT NULL REFERENCES public.passport_developer_tokens(id) ON DELETE CASCADE,
  request_fingerprint text NOT NULL,
  route_key text NOT NULL,
  response_status smallint NOT NULL CHECK (response_status BETWEEN 100 AND 599),
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.passport_ecosystem_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('passport.updated', 'game.imported', 'achievement.issued', 'achievement.revoked', 'event.credential_issued', 'event.credential_revoked')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_ecosystem_event_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE TABLE IF NOT EXISTS public.passport_webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  developer_token_id uuid NOT NULL REFERENCES public.passport_developer_tokens(id) ON DELETE CASCADE,
  endpoint_url text NOT NULL,
  encrypted_signing_secret text NOT NULL,
  event_types text[] NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_webhook_endpoint_https CHECK (endpoint_url ~ '^https://'),
  CONSTRAINT passport_webhook_secret_encrypted CHECK (encrypted_signing_secret ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  CONSTRAINT passport_webhook_event_types CHECK (event_types <@ ARRAY['passport.updated', 'game.imported', 'achievement.issued', 'achievement.revoked', 'event.credential_issued', 'event.credential_revoked']::text[]),
  CONSTRAINT passport_webhook_user_endpoint_unique UNIQUE (user_id, endpoint_url)
);

CREATE TABLE IF NOT EXISTS public.passport_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.passport_webhook_subscriptions(id) ON DELETE CASCADE,
  ecosystem_event_id uuid NOT NULL REFERENCES public.passport_ecosystem_events(id) ON DELETE CASCADE,
  attempt smallint NOT NULL DEFAULT 1 CHECK (attempt BETWEEN 1 AND 10),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivering', 'delivered', 'retry', 'failed', 'cancelled')),
  response_status smallint CHECK (response_status BETWEEN 100 AND 599),
  response_excerpt text,
  next_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_webhook_delivery_attempt_unique UNIQUE (subscription_id, ecosystem_event_id, attempt),
  CONSTRAINT passport_webhook_response_excerpt_length CHECK (char_length(coalesce(response_excerpt, '')) <= 500)
);

CREATE TABLE IF NOT EXISTS public.passport_partner_issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  organization_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  allowed_scopes text[] NOT NULL DEFAULT '{}',
  allowed_event_keys text[] NOT NULL DEFAULT '{}',
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_partner_name_length CHECK (char_length(organization_name) BETWEEN 2 AND 100),
  CONSTRAINT passport_partner_scopes CHECK (allowed_scopes <@ ARRAY['event_credentials:issue', 'event_credentials:revoke', 'achievements:issue', 'webhooks:receive']::text[]),
  CONSTRAINT passport_partner_approval_state CHECK ((status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR status <> 'approved')
);

CREATE TABLE IF NOT EXISTS public.passport_partner_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_issuer_id uuid NOT NULL REFERENCES public.passport_partner_issuers(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_partner_key_prefix_format CHECK (key_prefix ~ '^mpk_[A-Za-z0-9_-]{8}$'),
  CONSTRAINT passport_partner_key_hash_format CHECK (key_hash ~ '^[0-9a-f]{64}$')
);

CREATE TABLE IF NOT EXISTS public.passport_partner_issuance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_issuer_id uuid NOT NULL REFERENCES public.passport_partner_issuers(id) ON DELETE CASCADE,
  partner_api_key_id uuid NOT NULL REFERENCES public.passport_partner_api_keys(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  subject_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issuance_type text NOT NULL CHECK (issuance_type IN ('event_credential', 'achievement')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'issued', 'revoked')),
  issued_credential_id uuid REFERENCES public.passport_event_credentials(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_partner_issuance_idempotent UNIQUE (partner_issuer_id, idempotency_key),
  CONSTRAINT passport_partner_issuance_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS passport_provider_connections_user_status_idx ON public.passport_provider_connections(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS passport_connection_intents_user_expiry_idx ON public.passport_connection_intents(user_id, expires_at DESC) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_provider_sync_runs_connection_started_idx ON public.passport_provider_sync_runs(connection_id, started_at DESC);
CREATE INDEX IF NOT EXISTS passport_external_items_connection_state_idx ON public.passport_external_items(connection_id, import_state, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS passport_external_items_catalog_idx ON public.passport_external_items(matched_catalog_game_id) WHERE matched_catalog_game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_external_items_entry_idx ON public.passport_external_items(passport_game_entry_id) WHERE passport_game_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_import_events_user_created_idx ON public.passport_import_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_import_events_external_item_idx ON public.passport_import_events(external_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_developer_tokens_user_active_idx ON public.passport_developer_tokens(user_id, created_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_developer_api_events_token_time_idx ON public.passport_developer_api_events(token_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS passport_ecosystem_events_user_time_idx ON public.passport_ecosystem_events(user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_ecosystem_events_type_time_idx ON public.passport_ecosystem_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS passport_webhook_subscriptions_token_idx ON public.passport_webhook_subscriptions(developer_token_id);
CREATE INDEX IF NOT EXISTS passport_webhook_subscriptions_active_events_idx ON public.passport_webhook_subscriptions USING gin(event_types) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS passport_webhook_deliveries_pending_idx ON public.passport_webhook_deliveries(next_attempt_at, created_at) WHERE status IN ('pending', 'retry');
CREATE INDEX IF NOT EXISTS passport_webhook_deliveries_event_idx ON public.passport_webhook_deliveries(ecosystem_event_id);
CREATE INDEX IF NOT EXISTS passport_partner_issuers_owner_idx ON public.passport_partner_issuers(owner_user_id, status);
CREATE INDEX IF NOT EXISTS passport_partner_issuers_approver_idx ON public.passport_partner_issuers(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_partner_api_keys_issuer_idx ON public.passport_partner_api_keys(partner_issuer_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_partner_issuance_subject_idx ON public.passport_partner_issuance_requests(subject_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_partner_issuance_key_idx ON public.passport_partner_issuance_requests(partner_api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_partner_issuance_review_idx ON public.passport_partner_issuance_requests(status, created_at) WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS passport_partner_issuance_credential_idx ON public.passport_partner_issuance_requests(issued_credential_id) WHERE issued_credential_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_partner_issuance_reviewer_idx ON public.passport_partner_issuance_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;

DROP TRIGGER IF EXISTS passport_provider_catalog_set_updated_at ON public.passport_provider_catalog;
CREATE TRIGGER passport_provider_catalog_set_updated_at BEFORE UPDATE ON public.passport_provider_catalog FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_provider_connections_set_updated_at ON public.passport_provider_connections;
CREATE TRIGGER passport_provider_connections_set_updated_at BEFORE UPDATE ON public.passport_provider_connections FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_external_items_set_updated_at ON public.passport_external_items;
CREATE TRIGGER passport_external_items_set_updated_at BEFORE UPDATE ON public.passport_external_items FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_webhook_subscriptions_set_updated_at ON public.passport_webhook_subscriptions;
CREATE TRIGGER passport_webhook_subscriptions_set_updated_at BEFORE UPDATE ON public.passport_webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_webhook_deliveries_set_updated_at ON public.passport_webhook_deliveries;
CREATE TRIGGER passport_webhook_deliveries_set_updated_at BEFORE UPDATE ON public.passport_webhook_deliveries FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_partner_issuers_set_updated_at ON public.passport_partner_issuers;
CREATE TRIGGER passport_partner_issuers_set_updated_at BEFORE UPDATE ON public.passport_partner_issuers FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_partner_issuance_requests_set_updated_at ON public.passport_partner_issuance_requests;
CREATE TRIGGER passport_partner_issuance_requests_set_updated_at BEFORE UPDATE ON public.passport_partner_issuance_requests FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_provider_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_connection_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_provider_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_external_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_import_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_developer_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_developer_api_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_ecosystem_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_partner_issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_partner_issuance_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.passport_provider_catalog, public.passport_provider_connections,
  public.passport_connection_intents, public.passport_provider_sync_runs, public.passport_external_items,
  public.passport_import_events, public.passport_developer_tokens, public.passport_developer_api_events,
  public.passport_ecosystem_events, public.passport_webhook_subscriptions, public.passport_webhook_deliveries,
  public.passport_partner_issuers, public.passport_partner_api_keys, public.passport_partner_issuance_requests
FROM anon, authenticated;
GRANT ALL ON TABLE public.passport_provider_catalog, public.passport_provider_connections,
  public.passport_connection_intents, public.passport_provider_sync_runs, public.passport_external_items,
  public.passport_import_events, public.passport_developer_tokens, public.passport_developer_api_events,
  public.passport_ecosystem_events, public.passport_webhook_subscriptions, public.passport_webhook_deliveries,
  public.passport_partner_issuers, public.passport_partner_api_keys, public.passport_partner_issuance_requests
TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.passport_developer_api_events_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.consume_passport_developer_api_request(
  p_token_hash text,
  p_route_key text,
  p_request_fingerprint text
) RETURNS TABLE (
  outcome text,
  token_id uuid,
  user_id uuid,
  granted_scopes text[],
  event_id bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_token public.passport_developer_tokens%ROWTYPE;
  v_recent integer;
BEGIN
  SELECT * INTO v_token
  FROM public.passport_developer_tokens token
  WHERE token.token_hash = p_token_hash
    AND token.revoked_at IS NULL
    AND (token.expires_at IS NULL OR token.expires_at > timezone('utc', now()))
  FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::uuid, '{}'::text[], NULL::bigint; RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_token.id::text, 0));
  SELECT count(*) INTO v_recent FROM public.passport_developer_api_events event
  WHERE event.token_id = v_token.id AND event.occurred_at >= timezone('utc', now()) - interval '1 hour';
  IF v_recent >= v_token.rate_limit_per_hour THEN RETURN QUERY SELECT 'rate_limited'::text, v_token.id, v_token.user_id, v_token.scopes, NULL::bigint; RETURN; END IF;
  INSERT INTO public.passport_developer_api_events(token_id, request_fingerprint, route_key, response_status)
  VALUES (v_token.id, left(p_request_fingerprint, 64), left(p_route_key, 100), 102)
  RETURNING id INTO event_id;
  UPDATE public.passport_developer_tokens SET last_used_at = timezone('utc', now()) WHERE id = v_token.id;
  RETURN QUERY SELECT 'allowed'::text, v_token.id, v_token.user_id, v_token.scopes, event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_passport_developer_api_request(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_passport_developer_api_request(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_passport_webhook_deliveries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.passport_webhook_deliveries(subscription_id, ecosystem_event_id, next_attempt_at)
  SELECT subscription.id, NEW.id, timezone('utc', now())
  FROM public.passport_webhook_subscriptions subscription
  WHERE subscription.user_id = NEW.user_id
    AND subscription.status = 'active'
    AND subscription.event_types @> ARRAY[NEW.event_type]::text[]
  ON CONFLICT (subscription_id, ecosystem_event_id, attempt) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_passport_webhook_deliveries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_passport_webhook_deliveries() TO service_role;
DROP TRIGGER IF EXISTS passport_ecosystem_events_queue_webhooks ON public.passport_ecosystem_events;
CREATE TRIGGER passport_ecosystem_events_queue_webhooks AFTER INSERT ON public.passport_ecosystem_events FOR EACH ROW EXECUTE FUNCTION public.queue_passport_webhook_deliveries();

CREATE OR REPLACE FUNCTION public.project_passport_profile_ecosystem_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.passport_ecosystem_events(event_key, user_id, event_type, payload, occurred_at)
  VALUES (
    'passport.updated:' || NEW.user_id::text || ':' || extract(epoch from NEW.updated_at)::bigint::text,
    NEW.user_id,
    'passport.updated',
    '{}'::jsonb,
    NEW.updated_at
  )
  ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.project_passport_profile_ecosystem_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_passport_profile_ecosystem_event() TO service_role;
DROP TRIGGER IF EXISTS passport_profiles_ecosystem_event ON public.passport_profiles;
CREATE TRIGGER passport_profiles_ecosystem_event AFTER UPDATE ON public.passport_profiles FOR EACH ROW EXECUTE FUNCTION public.project_passport_profile_ecosystem_event();

CREATE OR REPLACE FUNCTION public.project_passport_achievement_ecosystem_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_type text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.revoked_at IS NOT DISTINCT FROM NEW.revoked_at THEN RETURN NEW; END IF;
  v_type := CASE WHEN NEW.revoked_at IS NULL THEN 'achievement.issued' ELSE 'achievement.revoked' END;
  INSERT INTO public.passport_ecosystem_events(event_key, user_id, event_type, payload, occurred_at)
  VALUES (v_type || ':' || NEW.id::text || ':' || extract(epoch from coalesce(NEW.revoked_at, NEW.last_evaluated_at))::bigint::text,
    NEW.user_id, v_type, jsonb_build_object('achievement_key', NEW.achievement_key, 'award_id', NEW.id),
    coalesce(NEW.revoked_at, NEW.issued_at))
  ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.project_passport_achievement_ecosystem_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_passport_achievement_ecosystem_event() TO service_role;
DROP TRIGGER IF EXISTS passport_achievement_awards_ecosystem_event ON public.passport_achievement_awards;
CREATE TRIGGER passport_achievement_awards_ecosystem_event AFTER INSERT OR UPDATE OF revoked_at ON public.passport_achievement_awards FOR EACH ROW EXECUTE FUNCTION public.project_passport_achievement_ecosystem_event();

CREATE OR REPLACE FUNCTION public.project_passport_credential_ecosystem_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_type text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.credential_state IS NOT DISTINCT FROM NEW.credential_state THEN RETURN NEW; END IF;
  v_type := CASE WHEN NEW.credential_state = 'active' THEN 'event.credential_issued' ELSE 'event.credential_revoked' END;
  INSERT INTO public.passport_ecosystem_events(event_key, user_id, event_type, payload, occurred_at)
  VALUES (v_type || ':' || NEW.id::text || ':' || extract(epoch from coalesce(NEW.revoked_at, NEW.issued_at))::bigint::text,
    NEW.user_id, v_type, jsonb_build_object('credential_id', NEW.id, 'event_key', NEW.event_key, 'stamp_type', NEW.stamp_type),
    coalesce(NEW.revoked_at, NEW.issued_at))
  ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.project_passport_credential_ecosystem_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_passport_credential_ecosystem_event() TO service_role;
DROP TRIGGER IF EXISTS passport_event_credentials_ecosystem_event ON public.passport_event_credentials;
CREATE TRIGGER passport_event_credentials_ecosystem_event AFTER INSERT OR UPDATE OF credential_state ON public.passport_event_credentials FOR EACH ROW EXECUTE FUNCTION public.project_passport_credential_ecosystem_event();

INSERT INTO public.passport_provider_catalog(provider_key, label, connection_method, capability_scopes, status, attribution_label, terms_url, privacy_url, cache_ttl_seconds) VALUES
  ('steam', 'Steam', 'openid', ARRAY['identity:read', 'library:read', 'play_history:read'], 'available', 'Data provided by Steam', 'https://store.steampowered.com/subscriber_agreement/', 'https://store.steampowered.com/privacy_agreement/', 3600),
  ('twitch', 'Twitch', 'oauth2', ARRAY['identity:read', 'creator_channel:read'], 'planned', 'Data provided by Twitch', 'https://www.twitch.tv/p/en/legal/terms-of-service/', 'https://www.twitch.tv/p/en/legal/privacy-notice/', 3600),
  ('youtube', 'YouTube', 'oauth2', ARRAY['identity:read', 'creator_channel:read'], 'planned', 'Data provided by YouTube', 'https://www.youtube.com/t/terms', 'https://policies.google.com/privacy', 3600),
  ('xbox', 'Xbox', 'oauth2', ARRAY['identity:read', 'library:read', 'achievements:read'], 'planned', 'Data provided by Xbox', 'https://www.microsoft.com/servicesagreement', 'https://privacy.microsoft.com/privacystatement', 3600),
  ('psn', 'PlayStation Network', 'oauth2', ARRAY['identity:read', 'library:read', 'achievements:read'], 'planned', 'Data provided by PlayStation', 'https://www.playstation.com/legal/psn-terms-of-service/', 'https://www.playstation.com/legal/privacy-policy/', 3600),
  ('nintendo', 'Nintendo Account', 'oauth2', ARRAY['identity:read'], 'planned', 'Data provided by Nintendo', 'https://accounts.nintendo.com/term/eula/', 'https://www.nintendo.com/privacy-policy/', 3600)
ON CONFLICT (provider_key) DO UPDATE SET
  label = EXCLUDED.label,
  connection_method = EXCLUDED.connection_method,
  capability_scopes = EXCLUDED.capability_scopes,
  status = EXCLUDED.status,
  attribution_label = EXCLUDED.attribution_label,
  terms_url = EXCLUDED.terms_url,
  privacy_url = EXCLUDED.privacy_url,
  cache_ttl_seconds = EXCLUDED.cache_ttl_seconds;
