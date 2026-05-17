DROP POLICY IF EXISTS "admins read observability settings" ON public.observability_settings;
DROP POLICY IF EXISTS "admins update observability settings" ON public.observability_settings;

CREATE POLICY "admins read observability settings"
  ON public.observability_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
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
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
        AND profiles.is_banned IS NOT TRUE
    )
  )
  WITH CHECK (id = 'global');
