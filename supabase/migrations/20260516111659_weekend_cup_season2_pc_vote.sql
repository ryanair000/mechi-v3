ALTER TABLE public.weekend_cup_ballot_options
  DROP CONSTRAINT IF EXISTS weekend_cup_ballot_options_platform_check;

ALTER TABLE public.weekend_cup_ballot_options
  ADD CONSTRAINT weekend_cup_ballot_options_platform_check
  CHECK (platform IN ('mobile', 'console', 'pc', 'mixed'));

DELETE FROM public.weekend_cup_ballots
WHERE slug = 'weekend-cup-2-console';

INSERT INTO public.weekend_cup_ballots (
  slug,
  title,
  subtitle,
  date_label,
  theme_label,
  cup_order,
  status
)
VALUES (
  'weekend-cup-2-pc',
  'Season 2 PC Games Vote',
  'Pick the headline PC game for Season 2',
  '12-14 June 2026',
  'PC games',
  2,
  'open'
)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  date_label = EXCLUDED.date_label,
  theme_label = EXCLUDED.theme_label,
  cup_order = EXCLUDED.cup_order,
  status = EXCLUDED.status,
  updated_at = timezone('utc', now());

DELETE FROM public.weekend_cup_ballot_options AS option
USING public.weekend_cup_ballots AS ballot
WHERE option.ballot_id = ballot.id
  AND ballot.slug = 'weekend-cup-2-pc'
  AND option.slug NOT IN ('tekken8', 'fc26', 'nba2k26', 'mk11', 'fortnite');

INSERT INTO public.weekend_cup_ballot_options (
  ballot_id,
  slug,
  label,
  platform,
  description,
  is_official
)
VALUES
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-pc'), 'tekken8', 'Tekken 8', 'pc', 'Fast sets, clean rivalries, and a bracket that gets loud quickly.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-pc'), 'fc26', 'EA SPORTS FC 26', 'pc', 'Football rivalry pressure with easy-to-follow matches and instant debate.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-pc'), 'nba2k26', 'NBA 2K26', 'pc', 'Culture play, clutch possessions, and a natural weekend crowd.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-pc'), 'mk11', 'Mortal Kombat 11', 'pc', 'Brutal momentum swings, quick sets, and clean knockout energy.', true),
  ((SELECT id FROM public.weekend_cup_ballots WHERE slug = 'weekend-cup-2-pc'), 'fortnite', 'Fortnite', 'pc', 'Big casual pull, fast clips, and strong squad reach on PC.', true)
ON CONFLICT (ballot_id, slug) DO UPDATE
SET
  label = EXCLUDED.label,
  platform = EXCLUDED.platform,
  description = EXCLUDED.description,
  is_official = EXCLUDED.is_official,
  updated_at = timezone('utc', now());
