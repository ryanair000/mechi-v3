CREATE TABLE IF NOT EXISTS public.online_tournament_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm')),
  match_number integer NOT NULL CHECK (match_number BETWEEN 1 AND 3),
  title text,
  map_name text,
  room_id text,
  room_password text,
  instructions text,
  starts_at timestamptz,
  release_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'released', 'locked', 'completed', 'cancelled')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_slug, game, match_number)
);

CREATE TABLE IF NOT EXISTS public.online_tournament_fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL DEFAULT 'efootball' CHECK (game = 'efootball'),
  round text NOT NULL
    CHECK (round IN ('round_of_16', 'quarterfinal', 'semifinal', 'final', 'bronze')),
  round_label text NOT NULL,
  slot integer NOT NULL CHECK (slot >= 0),
  player1_registration_id uuid REFERENCES public.online_tournament_registrations(id) ON DELETE SET NULL,
  player2_registration_id uuid REFERENCES public.online_tournament_registrations(id) ON DELETE SET NULL,
  player1_score integer CHECK (player1_score IS NULL OR player1_score >= 0),
  player2_score integer CHECK (player2_score IS NULL OR player2_score >= 0),
  winner_registration_id uuid REFERENCES public.online_tournament_registrations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'completed', 'disputed', 'bye')),
  screenshot_url text,
  screenshot_public_id text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_slug, game, round, slot)
);

CREATE TABLE IF NOT EXISTS public.online_tournament_result_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm', 'efootball')),
  registration_id uuid REFERENCES public.online_tournament_registrations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.online_tournament_rooms(id) ON DELETE SET NULL,
  fixture_id uuid REFERENCES public.online_tournament_fixtures(id) ON DELETE SET NULL,
  match_number integer CHECK (match_number IS NULL OR match_number BETWEEN 1 AND 3),
  kills integer CHECK (kills IS NULL OR kills >= 0),
  placement integer CHECK (placement IS NULL OR placement > 0),
  player1_score integer CHECK (player1_score IS NULL OR player1_score >= 0),
  player2_score integer CHECK (player2_score IS NULL OR player2_score >= 0),
  reported_winner_registration_id uuid REFERENCES public.online_tournament_registrations(id) ON DELETE SET NULL,
  screenshot_url text,
  screenshot_public_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected', 'disputed')),
  admin_note text,
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.online_tournament_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm', 'efootball')),
  result_submission_id uuid REFERENCES public.online_tournament_result_submissions(id) ON DELETE SET NULL,
  fixture_id uuid REFERENCES public.online_tournament_fixtures(id) ON DELETE SET NULL,
  opened_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.online_tournament_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  game text NOT NULL CHECK (game IN ('pubgm', 'codm', 'efootball')),
  placement integer NOT NULL CHECK (placement BETWEEN 1 AND 3),
  registration_id uuid REFERENCES public.online_tournament_registrations(id) ON DELETE SET NULL,
  prize_label text NOT NULL,
  prize_value_kes integer CHECK (prize_value_kes IS NULL OR prize_value_kes >= 0),
  reward_type text NOT NULL CHECK (reward_type IN ('cash', 'uc', 'cp', 'coins')),
  eligibility_status text NOT NULL DEFAULT 'pending'
    CHECK (eligibility_status IN ('pending', 'eligible', 'ineligible')),
  payout_status text NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'approved', 'paid', 'failed', 'ineligible')),
  payout_ref text,
  admin_note text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_slug, game, placement)
);

CREATE INDEX IF NOT EXISTS idx_online_tournament_rooms_event_game
  ON public.online_tournament_rooms(event_slug, game, match_number);
CREATE INDEX IF NOT EXISTS idx_online_tournament_fixtures_event_game
  ON public.online_tournament_fixtures(event_slug, game, round, slot);
CREATE INDEX IF NOT EXISTS idx_online_tournament_fixtures_players
  ON public.online_tournament_fixtures(player1_registration_id, player2_registration_id);
CREATE INDEX IF NOT EXISTS idx_online_tournament_results_event_game
  ON public.online_tournament_result_submissions(event_slug, game, match_number, status);
CREATE INDEX IF NOT EXISTS idx_online_tournament_results_registration
  ON public.online_tournament_result_submissions(registration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_tournament_disputes_status
  ON public.online_tournament_disputes(event_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_tournament_payouts_event_game
  ON public.online_tournament_payouts(event_slug, game, placement);

ALTER TABLE public.online_tournament_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_tournament_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_tournament_result_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_tournament_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_tournament_payouts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.online_tournament_rooms TO service_role;
GRANT ALL ON public.online_tournament_fixtures TO service_role;
GRANT ALL ON public.online_tournament_result_submissions TO service_role;
GRANT ALL ON public.online_tournament_disputes TO service_role;
GRANT ALL ON public.online_tournament_payouts TO service_role;

REVOKE ALL ON public.online_tournament_rooms FROM anon, authenticated;
REVOKE ALL ON public.online_tournament_fixtures FROM anon, authenticated;
REVOKE ALL ON public.online_tournament_result_submissions FROM anon, authenticated;
REVOKE ALL ON public.online_tournament_disputes FROM anon, authenticated;
REVOKE ALL ON public.online_tournament_payouts FROM anon, authenticated;
