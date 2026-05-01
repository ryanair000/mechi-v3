CREATE TABLE IF NOT EXISTS public.online_tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm', 'efootball')),
  in_game_username text NOT NULL,
  phone text,
  whatsapp_number text,
  email text,
  instagram_username text,
  youtube_name text,
  followed_instagram boolean NOT NULL DEFAULT false,
  subscribed_youtube boolean NOT NULL DEFAULT false,
  available_at_8pm boolean NOT NULL DEFAULT false,
  accepted_rules boolean NOT NULL DEFAULT false,
  reward_eligible boolean NOT NULL DEFAULT false,
  eligibility_status text NOT NULL DEFAULT 'pending'
    CHECK (eligibility_status IN ('pending', 'verified', 'ineligible', 'disqualified')),
  check_in_status text NOT NULL DEFAULT 'registered'
    CHECK (check_in_status IN ('registered', 'checked_in', 'no_show')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_slug, user_id, game)
);

CREATE INDEX IF NOT EXISTS idx_online_tournament_registrations_event_game
  ON public.online_tournament_registrations(event_slug, game, created_at);

CREATE INDEX IF NOT EXISTS idx_online_tournament_registrations_user_event
  ON public.online_tournament_registrations(user_id, event_slug);

CREATE INDEX IF NOT EXISTS idx_online_tournament_registrations_eligibility
  ON public.online_tournament_registrations(event_slug, eligibility_status);

GRANT ALL ON public.online_tournament_registrations TO service_role;
REVOKE ALL ON public.online_tournament_registrations FROM anon, authenticated;
