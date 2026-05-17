CREATE TABLE IF NOT EXISTS public.observability_settings (
  id text PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
  posthog_capture_enabled boolean NOT NULL DEFAULT true,
  sentry_capture_enabled boolean NOT NULL DEFAULT true,
  sentry_replay_on_error_enabled boolean NOT NULL DEFAULT true,
  payment_support_notice text NOT NULL DEFAULT 'M-PESA requires a Kenyan Safaricom number. Outside Kenya, use Paybill, Till, Airtel, card, or contact support.',
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.observability_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read observability settings"
  ON public.observability_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_banned IS NOT TRUE
    )
  );

CREATE POLICY "admins update observability settings"
  ON public.observability_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_banned IS NOT TRUE
    )
  )
  WITH CHECK (id = 'global');

CREATE OR REPLACE FUNCTION public.set_observability_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS observability_settings_set_updated_at ON public.observability_settings;
CREATE TRIGGER observability_settings_set_updated_at
  BEFORE UPDATE ON public.observability_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_observability_settings_updated_at();

INSERT INTO public.observability_settings (id)
VALUES ('global')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, UPDATE ON public.observability_settings TO authenticated;
GRANT ALL ON public.observability_settings TO service_role;
