CREATE OR REPLACE FUNCTION public.check_rate_limit_attempt(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer,
  attempts integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := timezone('utc', now());
  v_window interval := make_interval(secs => p_window_ms::double precision / 1000.0);
  v_window_start timestamptz;
  v_attempts integer;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'rate limit key is required';
  END IF;

  IF p_limit < 1 OR p_window_ms < 1000 THEN
    RAISE EXCEPTION 'invalid rate limit policy';
  END IF;

  INSERT INTO public.rate_limit_attempts (key, attempts, window_start, last_attempt)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
    SET attempts = CASE
        WHEN public.rate_limit_attempts.window_start <= v_now - v_window THEN 1
        ELSE public.rate_limit_attempts.attempts + 1
      END,
      window_start = CASE
        WHEN public.rate_limit_attempts.window_start <= v_now - v_window THEN v_now
        ELSE public.rate_limit_attempts.window_start
      END,
      last_attempt = v_now
  RETURNING public.rate_limit_attempts.attempts, public.rate_limit_attempts.window_start
  INTO v_attempts, v_window_start;

  RETURN QUERY
  SELECT
    v_attempts <= p_limit,
    greatest(p_limit - v_attempts, 0),
    CASE
      WHEN v_attempts <= p_limit THEN 0
      ELSE greatest(ceil(extract(epoch FROM ((v_window_start + v_window) - v_now)))::integer, 1)
    END,
    v_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit_attempt(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit_attempt(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit_attempt(text, integer, integer) TO service_role;
