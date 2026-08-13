-- Mechi V5 Gamer Passport Phase 8: launch readiness and controlled operations.
-- Queue claiming and finalization are transactional; external HTTP remains in the app worker.

ALTER TABLE public.passport_webhook_deliveries
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS error_code text;

ALTER TABLE public.passport_webhook_deliveries
  DROP CONSTRAINT IF EXISTS passport_webhook_delivery_duration_range;
ALTER TABLE public.passport_webhook_deliveries
  ADD CONSTRAINT passport_webhook_delivery_duration_range
  CHECK (duration_ms IS NULL OR duration_ms BETWEEN 0 AND 60000);

ALTER TABLE public.passport_webhook_deliveries
  DROP CONSTRAINT IF EXISTS passport_webhook_delivery_error_code_length;
ALTER TABLE public.passport_webhook_deliveries
  ADD CONSTRAINT passport_webhook_delivery_error_code_length
  CHECK (error_code IS NULL OR char_length(error_code) BETWEEN 2 AND 80);

ALTER TABLE public.passport_webhook_subscriptions
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_reason text;

ALTER TABLE public.passport_webhook_subscriptions
  DROP CONSTRAINT IF EXISTS passport_webhook_paused_reason_length;
ALTER TABLE public.passport_webhook_subscriptions
  ADD CONSTRAINT passport_webhook_paused_reason_length
  CHECK (paused_reason IS NULL OR char_length(paused_reason) BETWEEN 2 AND 200);

CREATE TABLE IF NOT EXISTS public.passport_operation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN ('webhook_delivery', 'retention_cleanup')),
  trigger_source text NOT NULL CHECK (trigger_source IN ('cron', 'admin', 'test')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  claimed_count integer NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
  succeeded_count integer NOT NULL DEFAULT 0 CHECK (succeeded_count >= 0),
  retried_count integer NOT NULL DEFAULT 0 CHECK (retried_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  finished_at timestamptz,
  CONSTRAINT passport_operation_details_object CHECK (jsonb_typeof(details) = 'object'),
  CONSTRAINT passport_operation_finished_state CHECK (
    (status = 'running' AND finished_at IS NULL)
    OR (status <> 'running' AND finished_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS passport_webhook_deliveries_stale_claim_idx
  ON public.passport_webhook_deliveries(claimed_at)
  WHERE status = 'delivering';
CREATE INDEX IF NOT EXISTS passport_operation_runs_type_started_idx
  ON public.passport_operation_runs(operation_type, started_at DESC);
CREATE INDEX IF NOT EXISTS passport_operation_runs_active_idx
  ON public.passport_operation_runs(started_at)
  WHERE status = 'running';

ALTER TABLE public.passport_operation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.passport_operation_runs FROM anon, authenticated;
GRANT ALL ON TABLE public.passport_operation_runs TO service_role;

CREATE OR REPLACE FUNCTION public.claim_passport_webhook_deliveries(p_batch_size integer DEFAULT 12)
RETURNS TABLE (
  delivery_id uuid,
  subscription_id uuid,
  ecosystem_event_id uuid,
  delivery_attempt smallint,
  owner_user_id uuid,
  endpoint_url text,
  encrypted_signing_secret text,
  event_type text,
  event_payload jsonb,
  event_occurred_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT delivery.id
    FROM public.passport_webhook_deliveries delivery
    JOIN public.passport_webhook_subscriptions subscription ON subscription.id = delivery.subscription_id
    WHERE subscription.status = 'active'
      AND (
        (delivery.status IN ('pending', 'retry') AND coalesce(delivery.next_attempt_at, delivery.created_at) <= timezone('utc', now()))
        OR (delivery.status = 'delivering' AND delivery.claimed_at < timezone('utc', now()) - interval '5 minutes')
      )
    ORDER BY coalesce(delivery.next_attempt_at, delivery.created_at), delivery.created_at
    LIMIT greatest(1, least(coalesce(p_batch_size, 12), 50))
    FOR UPDATE OF delivery SKIP LOCKED
  ), claimed AS (
    UPDATE public.passport_webhook_deliveries delivery
    SET status = 'delivering', claimed_at = timezone('utc', now()), updated_at = timezone('utc', now())
    FROM candidates
    WHERE delivery.id = candidates.id
    RETURNING delivery.*
  )
  SELECT claimed.id, claimed.subscription_id, claimed.ecosystem_event_id, claimed.attempt,
    subscription.user_id, subscription.endpoint_url, subscription.encrypted_signing_secret,
    event.event_type, event.payload, event.occurred_at
  FROM claimed
  JOIN public.passport_webhook_subscriptions subscription ON subscription.id = claimed.subscription_id
  JOIN public.passport_ecosystem_events event ON event.id = claimed.ecosystem_event_id;
$$;
REVOKE ALL ON FUNCTION public.claim_passport_webhook_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_passport_webhook_deliveries(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_passport_webhook_delivery(
  p_delivery_id uuid,
  p_outcome text,
  p_response_status integer DEFAULT NULL,
  p_response_excerpt text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_retry_at timestamptz DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_delivery public.passport_webhook_deliveries%ROWTYPE;
  v_subscription public.passport_webhook_subscriptions%ROWTYPE;
  v_failure_count integer;
BEGIN
  IF p_outcome NOT IN ('delivered', 'retry', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Unsupported webhook delivery outcome';
  END IF;

  SELECT * INTO v_delivery
  FROM public.passport_webhook_deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;
  IF NOT FOUND OR v_delivery.status <> 'delivering' THEN RETURN 'stale'; END IF;

  SELECT * INTO v_subscription
  FROM public.passport_webhook_subscriptions
  WHERE id = v_delivery.subscription_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN 'stale'; END IF;

  IF p_outcome = 'delivered' THEN
    UPDATE public.passport_webhook_deliveries
    SET status = 'delivered', response_status = p_response_status, response_excerpt = left(p_response_excerpt, 500),
      duration_ms = least(greatest(p_duration_ms, 0), 60000), error_code = NULL,
      delivered_at = timezone('utc', now()), next_attempt_at = NULL, updated_at = timezone('utc', now())
    WHERE id = v_delivery.id;
    UPDATE public.passport_webhook_subscriptions
    SET failure_count = 0, last_success_at = timezone('utc', now()), paused_at = NULL, paused_reason = NULL,
      updated_at = timezone('utc', now())
    WHERE id = v_subscription.id;
    RETURN 'delivered';
  END IF;

  v_failure_count := v_subscription.failure_count + 1;
  UPDATE public.passport_webhook_deliveries
  SET status = CASE WHEN p_outcome = 'cancelled' THEN 'cancelled' ELSE 'failed' END,
    response_status = p_response_status, response_excerpt = left(p_response_excerpt, 500),
    duration_ms = least(greatest(p_duration_ms, 0), 60000), error_code = left(p_error_code, 80),
    next_attempt_at = NULL, updated_at = timezone('utc', now())
  WHERE id = v_delivery.id;

  UPDATE public.passport_webhook_subscriptions
  SET failure_count = v_failure_count, last_failure_at = timezone('utc', now()),
    status = CASE WHEN v_failure_count >= 8 THEN 'paused' ELSE status END,
    paused_at = CASE WHEN v_failure_count >= 8 THEN timezone('utc', now()) ELSE paused_at END,
    paused_reason = CASE WHEN v_failure_count >= 8 THEN 'Automatically paused after eight consecutive delivery failures' ELSE paused_reason END,
    updated_at = timezone('utc', now())
  WHERE id = v_subscription.id;

  IF p_outcome = 'retry' AND v_delivery.attempt < 8 AND v_failure_count < 8 AND v_subscription.status = 'active' THEN
    INSERT INTO public.passport_webhook_deliveries(
      subscription_id, ecosystem_event_id, attempt, status, next_attempt_at
    ) VALUES (
      v_delivery.subscription_id, v_delivery.ecosystem_event_id, v_delivery.attempt + 1, 'retry',
      greatest(coalesce(p_retry_at, timezone('utc', now()) + interval '5 minutes'), timezone('utc', now()) + interval '5 seconds')
    )
    ON CONFLICT (subscription_id, ecosystem_event_id, attempt) DO NOTHING;
    RETURN 'retry_scheduled';
  END IF;

  RETURN CASE WHEN p_outcome = 'cancelled' THEN 'cancelled' ELSE 'failed' END;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_passport_webhook_delivery(uuid, text, integer, text, integer, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_passport_webhook_delivery(uuid, text, integer, text, integer, text, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_passport_operational_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_intents integer := 0;
  v_sync_runs integer := 0;
  v_api_events integer := 0;
  v_deliveries integer := 0;
  v_ecosystem_events integer := 0;
  v_operation_runs integer := 0;
BEGIN
  DELETE FROM public.passport_connection_intents
  WHERE expires_at < timezone('utc', now()) - interval '7 days';
  GET DIAGNOSTICS v_intents = ROW_COUNT;

  DELETE FROM public.passport_provider_sync_runs
  WHERE started_at < timezone('utc', now()) - interval '180 days';
  GET DIAGNOSTICS v_sync_runs = ROW_COUNT;

  DELETE FROM public.passport_developer_api_events
  WHERE occurred_at < timezone('utc', now()) - interval '90 days';
  GET DIAGNOSTICS v_api_events = ROW_COUNT;

  DELETE FROM public.passport_webhook_deliveries
  WHERE status IN ('delivered', 'failed', 'cancelled')
    AND updated_at < timezone('utc', now()) - interval '30 days';
  GET DIAGNOSTICS v_deliveries = ROW_COUNT;

  DELETE FROM public.passport_ecosystem_events event
  WHERE event.created_at < timezone('utc', now()) - interval '180 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.passport_webhook_deliveries delivery
      WHERE delivery.ecosystem_event_id = event.id
        AND delivery.status IN ('pending', 'retry', 'delivering')
    );
  GET DIAGNOSTICS v_ecosystem_events = ROW_COUNT;

  DELETE FROM public.passport_operation_runs
  WHERE started_at < timezone('utc', now()) - interval '180 days';
  GET DIAGNOSTICS v_operation_runs = ROW_COUNT;

  RETURN jsonb_build_object(
    'connection_intents', v_intents,
    'sync_runs', v_sync_runs,
    'developer_api_events', v_api_events,
    'webhook_deliveries', v_deliveries,
    'ecosystem_events', v_ecosystem_events,
    'operation_runs', v_operation_runs
  );
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_passport_operational_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_passport_operational_data() TO service_role;
