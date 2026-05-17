CREATE TABLE IF NOT EXISTS public.tanzania_tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  whatsapp_number text,
  email text,
  in_game_username text NOT NULL,
  konami_id text,
  city text,
  payment_status text NOT NULL DEFAULT 'pending_payment'
    CHECK (payment_status IN ('pending_payment', 'paid', 'manual_review', 'rejected')),
  payment_reference text,
  payment_note text,
  admin_note text,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_slug, phone),
  UNIQUE (event_slug, in_game_username)
);

CREATE INDEX IF NOT EXISTS idx_tanzania_tournament_registrations_event_created
  ON public.tanzania_tournament_registrations(event_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tanzania_tournament_registrations_payment_status
  ON public.tanzania_tournament_registrations(event_slug, payment_status, created_at DESC);

ALTER TABLE public.tanzania_tournament_registrations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tanzania_tournament_registrations TO service_role;
REVOKE ALL ON public.tanzania_tournament_registrations FROM anon, authenticated;
