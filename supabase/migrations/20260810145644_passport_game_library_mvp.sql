-- Mechi V5 / PlayMechi Gamer Passport - Phase 2 game-library MVP.
--
-- Mechi authenticates with its own signed JWT and performs all database work
-- through server-side service-role clients. These tables are intentionally
-- unavailable to anon/authenticated Data API roles. Public reads are projected
-- and privacy-filtered by the application.

CREATE TABLE IF NOT EXISTS public.passport_game_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  canonical_game_id uuid REFERENCES public.passport_game_catalog(id) ON DELETE SET NULL,
  title text NOT NULL,
  edition_title text,
  release_year smallint,
  cover_url text,
  platforms text[] NOT NULL DEFAULT '{}',
  genres text[] NOT NULL DEFAULT '{}',
  modes text[] NOT NULL DEFAULT '{}',
  game_kind text NOT NULL DEFAULT 'base_game',
  search_aliases text[] NOT NULL DEFAULT '{}',
  provider text NOT NULL DEFAULT 'mechi',
  provider_id text,
  provider_url text,
  provider_attribution text,
  resolution_status text NOT NULL DEFAULT 'approved',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_game_catalog_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT passport_game_catalog_title_length
    CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT passport_game_catalog_release_year_range
    CHECK (release_year IS NULL OR release_year BETWEEN 1970 AND 2100),
  CONSTRAINT passport_game_catalog_platforms_allowed CHECK (
    platforms <@ ARRAY['ps', 'xbox', 'nintendo', 'mobile', 'pc']::text[]
  ),
  CONSTRAINT passport_game_catalog_kind_allowed CHECK (
    game_kind IN ('base_game', 'edition', 'remaster', 'remake', 'dlc')
  ),
  CONSTRAINT passport_game_catalog_resolution_allowed CHECK (
    resolution_status IN ('approved', 'pending_review', 'merged', 'hidden')
  ),
  CONSTRAINT passport_game_catalog_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT passport_game_catalog_not_self_canonical CHECK (canonical_game_id IS NULL OR canonical_game_id <> id)
);

CREATE TABLE IF NOT EXISTS public.passport_game_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  catalog_game_id uuid NOT NULL REFERENCES public.passport_game_catalog(id) ON DELETE RESTRICT,
  platform text NOT NULL DEFAULT 'unspecified',
  play_status text NOT NULL DEFAULT 'backlog',
  started_on date,
  completed_on date,
  rating smallint,
  hours_played numeric(8,1),
  short_review text NOT NULL DEFAULT '',
  contains_spoilers boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'public',
  screenshot_url text,
  screenshot_public_id text,
  source_type text NOT NULL DEFAULT 'manual',
  source_key text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_game_entries_platform_allowed CHECK (
    platform IN ('unspecified', 'ps', 'xbox', 'nintendo', 'mobile', 'pc')
  ),
  CONSTRAINT passport_game_entries_status_allowed CHECK (
    play_status IN ('playing', 'completed', 'backlog', 'paused', 'dropped', 'replaying')
  ),
  CONSTRAINT passport_game_entries_rating_range CHECK (rating IS NULL OR rating BETWEEN 1 AND 10),
  CONSTRAINT passport_game_entries_hours_range CHECK (
    hours_played IS NULL OR hours_played BETWEEN 0 AND 100000
  ),
  CONSTRAINT passport_game_entries_review_length CHECK (char_length(short_review) <= 500),
  CONSTRAINT passport_game_entries_visibility_allowed CHECK (
    visibility IN ('public', 'friends', 'private')
  ),
  CONSTRAINT passport_game_entries_source_allowed CHECK (
    source_type IN ('manual', 'mechi_projected', 'platform_synced', 'admin')
  ),
  CONSTRAINT passport_game_entries_dates_ordered CHECK (
    completed_on IS NULL OR started_on IS NULL OR completed_on >= started_on
  ),
  CONSTRAINT passport_game_entries_unique_platform UNIQUE (user_id, catalog_game_id, platform)
);

CREATE TABLE IF NOT EXISTS public.passport_game_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_title text NOT NULL,
  requested_platform text,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  resolved_catalog_game_id uuid REFERENCES public.passport_game_catalog(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_game_requests_title_length CHECK (char_length(requested_title) BETWEEN 2 AND 120),
  CONSTRAINT passport_game_requests_notes_length CHECK (char_length(notes) <= 500),
  CONSTRAINT passport_game_requests_platform_allowed CHECK (
    requested_platform IS NULL OR requested_platform IN ('ps', 'xbox', 'nintendo', 'mobile', 'pc')
  ),
  CONSTRAINT passport_game_requests_status_allowed CHECK (
    status IN ('open', 'reviewing', 'resolved', 'duplicate', 'rejected')
  ),
  CONSTRAINT passport_game_requests_resolution_complete CHECK (
    status NOT IN ('resolved', 'duplicate') OR resolved_catalog_game_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS passport_game_catalog_title_idx
  ON public.passport_game_catalog(lower(title));
CREATE INDEX IF NOT EXISTS passport_game_catalog_aliases_idx
  ON public.passport_game_catalog USING gin(search_aliases);
CREATE INDEX IF NOT EXISTS passport_game_catalog_platforms_idx
  ON public.passport_game_catalog USING gin(platforms);
CREATE INDEX IF NOT EXISTS passport_game_catalog_genres_idx
  ON public.passport_game_catalog USING gin(genres);
CREATE INDEX IF NOT EXISTS passport_game_entries_user_status_idx
  ON public.passport_game_entries(user_id, play_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS passport_game_entries_public_idx
  ON public.passport_game_entries(user_id, updated_at DESC)
  WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS passport_game_entries_featured_idx
  ON public.passport_game_entries(user_id, updated_at DESC)
  WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS passport_game_requests_open_idx
  ON public.passport_game_requests(created_at ASC)
  WHERE status IN ('open', 'reviewing');

CREATE OR REPLACE FUNCTION public.enforce_passport_featured_game_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_featured AND (TG_OP = 'INSERT' OR OLD.is_featured IS DISTINCT FROM true) THEN
    IF (
      SELECT count(*)
      FROM public.passport_game_entries entry
      WHERE entry.user_id = NEW.user_id
        AND entry.is_featured = true
        AND entry.id <> NEW.id
    ) >= 5 THEN
      RAISE EXCEPTION 'A Passport can feature at most five games'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_passport_featured_game_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_passport_featured_game_limit() TO service_role;

DROP TRIGGER IF EXISTS passport_game_entries_featured_limit ON public.passport_game_entries;
CREATE TRIGGER passport_game_entries_featured_limit
  BEFORE INSERT OR UPDATE OF is_featured ON public.passport_game_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_passport_featured_game_limit();

DROP TRIGGER IF EXISTS passport_game_catalog_set_updated_at ON public.passport_game_catalog;
CREATE TRIGGER passport_game_catalog_set_updated_at
  BEFORE UPDATE ON public.passport_game_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

DROP TRIGGER IF EXISTS passport_game_entries_set_updated_at ON public.passport_game_entries;
CREATE TRIGGER passport_game_entries_set_updated_at
  BEFORE UPDATE ON public.passport_game_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

DROP TRIGGER IF EXISTS passport_game_requests_set_updated_at ON public.passport_game_requests;
CREATE TRIGGER passport_game_requests_set_updated_at
  BEFORE UPDATE ON public.passport_game_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_game_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_game_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_game_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.passport_game_catalog,
  public.passport_game_entries,
  public.passport_game_requests
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.passport_game_catalog,
  public.passport_game_entries,
  public.passport_game_requests
TO service_role;

ALTER TABLE public.passport_profile_summaries
  ADD COLUMN IF NOT EXISTS playing_games_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_games_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorite_games_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_library_hours numeric(10,1) NOT NULL DEFAULT 0;

ALTER TABLE public.passport_profile_summaries
  DROP CONSTRAINT IF EXISTS passport_profile_summaries_library_non_negative;
ALTER TABLE public.passport_profile_summaries
  ADD CONSTRAINT passport_profile_summaries_library_non_negative CHECK (
    playing_games_count >= 0
    AND completed_games_count >= 0
    AND favorite_games_count >= 0
    AND total_library_hours >= 0
  );

-- Curated launch catalogue. Local artwork is used where Mechi already has
-- licensed/source-documented assets; the remaining records intentionally keep
-- cover_url null until the provider cache or an admin supplies approved art.
INSERT INTO public.passport_game_catalog
  (slug, title, edition_title, release_year, cover_url, platforms, genres, modes, game_kind, search_aliases, provider, provider_id)
VALUES
  ('efootball', 'eFootball 2026', NULL, 2025, '/game-artwork/efootball-capsule.webp', ARRAY['ps','xbox','pc','mobile'], ARRAY['sports'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['pes','pro evolution soccer','efootball mobile'], 'mechi', 'efootball'),
  ('efootball-mobile', 'eFootball 2026', 'Mobile', 2025, '/game-artwork/efootball_mobile-capsule.webp', ARRAY['mobile'], ARRAY['sports'], ARRAY['single-player','multiplayer','competitive'], 'edition', ARRAY['pes mobile','efootball mobile'], 'mechi', 'efootball_mobile'),
  ('ea-fc-26', 'EA Sports FC 26', NULL, 2025, '/game-artwork/fc26-capsule.webp', ARRAY['ps','xbox','pc','nintendo'], ARRAY['sports'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['fc26','fifa','ea fc'], 'mechi', 'fc26'),
  ('mortal-kombat-11', 'Mortal Kombat 11', NULL, 2019, '/game-artwork/mk11-capsule.webp', ARRAY['ps','xbox','pc','nintendo'], ARRAY['fighting'], ARRAY['story','multiplayer','competitive'], 'base_game', ARRAY['mk11','mortal kombat'], 'mechi', 'mk11'),
  ('nba-2k26', 'NBA 2K26', NULL, 2025, '/game-artwork/nba2k26-capsule.webp', ARRAY['ps','xbox','pc','nintendo'], ARRAY['sports'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['2k26','nba'], 'mechi', 'nba2k26'),
  ('tekken-8', 'Tekken 8', NULL, 2024, '/game-artwork/tekken8-capsule.webp', ARRAY['ps','xbox','pc'], ARRAY['fighting'], ARRAY['story','multiplayer','competitive'], 'base_game', ARRAY['tekken8'], 'mechi', 'tekken8'),
  ('street-fighter-6', 'Street Fighter 6', NULL, 2023, '/game-artwork/sf6-capsule.webp', ARRAY['ps','xbox','pc'], ARRAY['fighting'], ARRAY['story','multiplayer','competitive'], 'base_game', ARRAY['sf6','street fighter'], 'mechi', 'sf6'),
  ('call-of-duty-mobile', 'Call of Duty: Mobile', NULL, 2019, '/game-artwork/codm-capsule.webp', ARRAY['mobile'], ARRAY['shooter','battle-royale'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['codm','call of duty mobile'], 'mechi', 'codm'),
  ('pubg-mobile', 'PUBG Mobile', NULL, 2018, '/game-artwork/pubgm-capsule.webp', ARRAY['mobile'], ARRAY['shooter','battle-royale'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['pubgm','playerunknown battlegrounds mobile'], 'mechi', 'pubgm'),
  ('counter-strike-2', 'Counter-Strike 2', NULL, 2023, '/game-artwork/cs2-capsule.webp', ARRAY['pc'], ARRAY['shooter'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['cs2','counter strike'], 'mechi', 'cs2'),
  ('valorant', 'Valorant', NULL, 2020, '/game-artwork/valorant-capsule.webp', ARRAY['pc','ps','xbox'], ARRAY['shooter'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['val'], 'mechi', 'valorant'),
  ('mario-kart-8-deluxe', 'Mario Kart 8 Deluxe', NULL, 2017, '/game-artwork/mariokart-capsule.webp', ARRAY['nintendo'], ARRAY['racing'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['mario kart','mk8'], 'mechi', 'mariokart'),
  ('super-smash-bros-ultimate', 'Super Smash Bros. Ultimate', NULL, 2018, '/game-artwork/smashbros-capsule.webp', ARRAY['nintendo'], ARRAY['fighting','party'], ARRAY['single-player','multiplayer','competitive'], 'base_game', ARRAY['smash bros','ssbu'], 'mechi', 'smashbros'),
  ('free-fire', 'Free Fire', NULL, 2017, '/game-artwork/freefire-capsule.webp', ARRAY['mobile'], ARRAY['shooter','battle-royale'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['garena free fire','freefire'], 'mechi', 'freefire'),
  ('ludo', 'Ludo', NULL, NULL, '/game-artwork/ludo-capsule.webp', ARRAY['mobile','pc'], ARRAY['board','party'], ARRAY['single-player','multiplayer'], 'base_game', ARRAY['ludo king'], 'mechi', 'ludo'),
  ('rocket-league', 'Rocket League', NULL, 2015, '/game-artwork/rocketleague-capsule.webp', ARRAY['ps','xbox','pc','nintendo'], ARRAY['sports','racing'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['rocketleague'], 'mechi', 'rocketleague'),
  ('fortnite', 'Fortnite', NULL, 2017, NULL, ARRAY['ps','xbox','pc','nintendo','mobile'], ARRAY['shooter','battle-royale'], ARRAY['multiplayer','competitive'], 'base_game', ARRAY['fortnight'], 'mechi', 'fortnite'),
  ('the-witcher-3-wild-hunt', 'The Witcher 3: Wild Hunt', NULL, 2015, NULL, ARRAY['ps','xbox','pc','nintendo'], ARRAY['action-rpg','story'], ARRAY['single-player','story'], 'base_game', ARRAY['witcher 3','wild hunt'], 'mechi', NULL),
  ('cyberpunk-2077', 'Cyberpunk 2077', NULL, 2020, NULL, ARRAY['ps','xbox','pc'], ARRAY['action-rpg','story'], ARRAY['single-player','story'], 'base_game', ARRAY['cyberpunk'], 'mechi', NULL),
  ('red-dead-redemption-2', 'Red Dead Redemption 2', NULL, 2018, NULL, ARRAY['ps','xbox','pc'], ARRAY['action-adventure','story','open-world'], ARRAY['single-player','story','multiplayer'], 'base_game', ARRAY['rdr2','red dead 2'], 'mechi', NULL),
  ('grand-theft-auto-v', 'Grand Theft Auto V', NULL, 2013, NULL, ARRAY['ps','xbox','pc'], ARRAY['action-adventure','open-world'], ARRAY['single-player','story','multiplayer'], 'base_game', ARRAY['gta 5','gta v'], 'mechi', NULL),
  ('elden-ring', 'Elden Ring', NULL, 2022, NULL, ARRAY['ps','xbox','pc'], ARRAY['action-rpg','story'], ARRAY['single-player','story','multiplayer'], 'base_game', ARRAY['eldenring'], 'mechi', NULL),
  ('god-of-war', 'God of War', NULL, 2018, NULL, ARRAY['ps','pc'], ARRAY['action-adventure','story'], ARRAY['single-player','story'], 'base_game', ARRAY['god of war 2018','gow'], 'mechi', NULL),
  ('marvels-spider-man', 'Marvel''s Spider-Man', NULL, 2018, NULL, ARRAY['ps','pc'], ARRAY['action-adventure','story','open-world'], ARRAY['single-player','story'], 'base_game', ARRAY['spiderman','spider-man'], 'mechi', NULL),
  ('horizon-zero-dawn', 'Horizon Zero Dawn', NULL, 2017, NULL, ARRAY['ps','pc'], ARRAY['action-rpg','story','open-world'], ARRAY['single-player','story'], 'base_game', ARRAY['hzd','horizon'], 'mechi', NULL),
  ('hades', 'Hades', NULL, 2020, NULL, ARRAY['ps','xbox','pc','nintendo'], ARRAY['action','roguelike','story'], ARRAY['single-player','story'], 'base_game', ARRAY['hades game'], 'mechi', NULL),
  ('hollow-knight', 'Hollow Knight', NULL, 2017, NULL, ARRAY['ps','xbox','pc','nintendo'], ARRAY['metroidvania','story'], ARRAY['single-player','story'], 'base_game', ARRAY['hollowknight'], 'mechi', NULL),
  ('stardew-valley', 'Stardew Valley', NULL, 2016, NULL, ARRAY['ps','xbox','pc','nintendo','mobile'], ARRAY['simulation','role-playing'], ARRAY['single-player','multiplayer'], 'base_game', ARRAY['stardew'], 'mechi', NULL),
  ('minecraft', 'Minecraft', NULL, 2011, NULL, ARRAY['ps','xbox','pc','nintendo','mobile'], ARRAY['sandbox','survival'], ARRAY['single-player','multiplayer'], 'base_game', ARRAY['minecraft bedrock','minecraft java'], 'mechi', NULL),
  ('the-last-of-us-part-i', 'The Last of Us Part I', NULL, 2022, NULL, ARRAY['ps','pc'], ARRAY['action-adventure','story'], ARRAY['single-player','story'], 'remake', ARRAY['last of us','tlou'], 'mechi', NULL),
  ('ghost-of-tsushima', 'Ghost of Tsushima', NULL, 2020, NULL, ARRAY['ps','pc'], ARRAY['action-adventure','story','open-world'], ARRAY['single-player','story','multiplayer'], 'base_game', ARRAY['ghost tsushima'], 'mechi', NULL),
  ('life-is-strange', 'Life is Strange', NULL, 2015, NULL, ARRAY['ps','xbox','pc','mobile'], ARRAY['adventure','story'], ARRAY['single-player','story'], 'base_game', ARRAY['life is strange 1'], 'mechi', NULL),
  ('detroit-become-human', 'Detroit: Become Human', NULL, 2018, NULL, ARRAY['ps','pc'], ARRAY['adventure','story'], ARRAY['single-player','story'], 'base_game', ARRAY['detroit'], 'mechi', NULL)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  edition_title = EXCLUDED.edition_title,
  release_year = EXCLUDED.release_year,
  cover_url = coalesce(EXCLUDED.cover_url, public.passport_game_catalog.cover_url),
  platforms = EXCLUDED.platforms,
  genres = EXCLUDED.genres,
  modes = EXCLUDED.modes,
  game_kind = EXCLUDED.game_kind,
  search_aliases = EXCLUDED.search_aliases,
  provider = EXCLUDED.provider,
  provider_id = EXCLUDED.provider_id,
  resolution_status = 'approved';

UPDATE public.passport_game_catalog mobile
SET canonical_game_id = base.id
FROM public.passport_game_catalog base
WHERE mobile.slug = 'efootball-mobile'
  AND base.slug = 'efootball'
  AND mobile.canonical_game_id IS DISTINCT FROM base.id;

-- Existing selected Mechi games become self-reported library records so current
-- competitive users see their history immediately after migration.
INSERT INTO public.passport_game_entries
  (user_id, catalog_game_id, platform, play_status, is_favorite, source_type, source_key)
SELECT
  p.id,
  catalog.id,
  'unspecified',
  'playing',
  true,
  'mechi_projected',
  selected.game_key
FROM public.profiles p
CROSS JOIN LATERAL unnest(coalesce(p.selected_games, '{}'::text[])) AS selected(game_key)
JOIN public.passport_game_catalog catalog ON catalog.provider_id = selected.game_key
ON CONFLICT (user_id, catalog_game_id, platform) DO NOTHING;

UPDATE public.passport_profile_summaries summary
SET
  games_count = library.games_count,
  playing_games_count = library.playing_games_count,
  completed_games_count = library.completed_games_count,
  favorite_games_count = library.favorite_games_count,
  total_library_hours = library.total_library_hours,
  computed_at = timezone('utc', now())
FROM (
  SELECT
    user_id,
    count(*)::integer AS games_count,
    count(*) FILTER (WHERE play_status IN ('playing', 'replaying'))::integer AS playing_games_count,
    count(*) FILTER (WHERE play_status = 'completed')::integer AS completed_games_count,
    count(*) FILTER (WHERE is_favorite)::integer AS favorite_games_count,
    coalesce(sum(hours_played), 0)::numeric(10,1) AS total_library_hours
  FROM public.passport_game_entries
  GROUP BY user_id
) library
WHERE summary.user_id = library.user_id;
