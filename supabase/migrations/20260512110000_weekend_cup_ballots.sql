CREATE TABLE IF NOT EXISTS public.weekend_cup_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text NOT NULL,
  date_label text NOT NULL,
  theme_label text NOT NULL,
  cup_order integer NOT NULL CHECK (cup_order > 0),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'review', 'locked')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.weekend_cup_ballot_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES public.weekend_cup_ballots(id) ON DELETE CASCADE,
  slug text NOT NULL,
  label text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('mobile', 'console', 'mixed')),
  description text,
  is_official boolean NOT NULL DEFAULT false,
  suggested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  suggestion_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (ballot_id, slug)
);

CREATE TABLE IF NOT EXISTS public.weekend_cup_ballot_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES public.weekend_cup_ballots(id) ON DELETE CASCADE,
  ballot_option_id uuid NOT NULL REFERENCES public.weekend_cup_ballot_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (ballot_option_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_weekend_cup_ballots_order
  ON public.weekend_cup_ballots(cup_order, created_at);

CREATE INDEX IF NOT EXISTS idx_weekend_cup_ballot_options_ballot
  ON public.weekend_cup_ballot_options(ballot_id, created_at);

CREATE INDEX IF NOT EXISTS idx_weekend_cup_ballot_votes_ballot
  ON public.weekend_cup_ballot_votes(ballot_id, created_at);

CREATE INDEX IF NOT EXISTS idx_weekend_cup_ballot_votes_user
  ON public.weekend_cup_ballot_votes(user_id, created_at DESC);

INSERT INTO public.weekend_cup_ballots (
  slug,
  title,
  subtitle,
  date_label,
  theme_label,
  cup_order,
  status
)
VALUES
  ('weekend-cup-1-mobile', 'Weekend Cup 1', 'Mobile Games Cup', '29-31 May 2026', 'Weekend 1', 1, 'open'),
  ('weekend-cup-2-console', 'Weekend Cup 2', 'Console Games Cup', '12-14 June 2026', 'Weekend 2', 2, 'open'),
  ('weekend-cup-3-mixed', 'Weekend Cup 3', 'Mixed Games Cup', '26-28 June 2026', 'Weekend 3', 3, 'review')
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  date_label = EXCLUDED.date_label,
  theme_label = EXCLUDED.theme_label,
  cup_order = EXCLUDED.cup_order,
  status = EXCLUDED.status,
  updated_at = timezone('utc', now());

INSERT INTO public.weekend_cup_ballot_options (
  ballot_id,
  slug,
  label,
  platform,
  description,
  is_official
)
VALUES
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-1-mobile'), 'efootball', 'eFootball', 'mobile', '1v1 bracket pressure with clean Sunday finals energy.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-1-mobile'), 'free-fire', 'Free Fire', 'mobile', 'Fast lobbies, quick smoke, huge casual pull.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-1-mobile'), 'pubgm', 'PUBG Mobile', 'mobile', 'Classic BR sweat, strong squads, big room potential.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-1-mobile'), 'codm', 'Call of Duty: Mobile', 'mobile', 'High-speed BR action with creator-friendly highlights.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-console'), 'fortnite', 'Fortnite', 'console', 'Big casual pull, clean clips, and strong community reach.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-console'), 'ea-sports-fc-26', 'EA SPORTS FC 26', 'console', 'Easy to follow, easy to stream, always gets debate moving.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-console'), 'mortal-kombat', 'Mortal Kombat', 'console', 'Fast sets, loud moments, strong local comp energy.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-console'), 'nba-2k26', 'NBA 2K26', 'console', 'Strong culture play with a natural weekend crowd.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-console'), 'warzone', 'Call of Duty: Warzone', 'console', 'Bigger BR names, bigger stream moments.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-3-mixed'), 'mixed-mobile-console', 'Mixed format picks', 'mixed', 'The final mix pulls the strongest-supported mobile and console titles.', true)
ON CONFLICT (ballot_id, slug) DO UPDATE
SET
  label = EXCLUDED.label,
  platform = EXCLUDED.platform,
  description = EXCLUDED.description,
  is_official = EXCLUDED.is_official,
  updated_at = timezone('utc', now());

ALTER TABLE public.weekend_cup_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekend_cup_ballot_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekend_cup_ballot_votes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.weekend_cup_ballots TO service_role;
GRANT ALL ON public.weekend_cup_ballot_options TO service_role;
GRANT ALL ON public.weekend_cup_ballot_votes TO service_role;

REVOKE ALL ON public.weekend_cup_ballots FROM anon, authenticated;
REVOKE ALL ON public.weekend_cup_ballot_options FROM anon, authenticated;
REVOKE ALL ON public.weekend_cup_ballot_votes FROM anon, authenticated;
