-- Mechi V5 Gamer Passport Phase 6: progression, customization, Replay, and growth products.
-- Source tables remain authoritative. Projections are server-mediated and rebuildable.

CREATE TABLE IF NOT EXISTS public.passport_dimension_snapshots (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  formula_version text NOT NULL DEFAULT 'v1',
  passport_level integer NOT NULL DEFAULT 1 CHECK (passport_level BETWEEN 1 AND 100),
  total_points integer NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  projected_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_dimensions_object CHECK (jsonb_typeof(dimensions) = 'object'),
  CONSTRAINT passport_dimension_sources_object CHECK (jsonb_typeof(source_counts) = 'object')
);

CREATE TABLE IF NOT EXISTS public.passport_achievement_definitions (
  achievement_key text PRIMARY KEY,
  family text NOT NULL CHECK (family IN ('competitive', 'library', 'completion', 'community', 'events', 'teams', 'annual', 'founder')),
  title text NOT NULL,
  description text NOT NULL,
  requirement_text text NOT NULL,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'limited')),
  trust_tier text NOT NULL DEFAULT 'personal' CHECK (trust_tier IN ('personal', 'mechi_verified', 'organizer_verified')),
  issuer_label text NOT NULL DEFAULT 'PlayMechi',
  source_types text[] NOT NULL DEFAULT '{}',
  limited_from timestamptz,
  limited_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_achievement_text_lengths CHECK (
    char_length(title) BETWEEN 2 AND 80
    AND char_length(description) BETWEEN 2 AND 240
    AND char_length(requirement_text) BETWEEN 2 AND 240
  ),
  CONSTRAINT passport_achievement_limited_window CHECK (
    rarity <> 'limited' OR (limited_from IS NOT NULL AND limited_until IS NOT NULL AND limited_until > limited_from)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_achievement_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL REFERENCES public.passport_achievement_definitions(achievement_key) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_key text NOT NULL,
  issuer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  revoked_at timestamptz,
  revocation_reason text,
  last_evaluated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_achievement_award_unique UNIQUE (user_id, achievement_key),
  CONSTRAINT passport_achievement_award_revocation CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL)
    OR (revoked_at IS NOT NULL AND char_length(coalesce(revocation_reason, '')) BETWEEN 3 AND 300)
  )
);

CREATE TABLE IF NOT EXISTS public.passport_cosmetic_catalog (
  cosmetic_key text PRIMARY KEY,
  cosmetic_type text NOT NULL CHECK (cosmetic_type IN ('theme', 'avatar_frame', 'card_style')),
  label text NOT NULL,
  description text NOT NULL,
  required_plan text NOT NULL DEFAULT 'free' CHECK (required_plan IN ('free', 'pro', 'elite')),
  style_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_animated boolean NOT NULL DEFAULT false,
  performance_tier text NOT NULL DEFAULT 'light' CHECK (performance_tier IN ('light', 'moderate')),
  is_cosmetic boolean NOT NULL DEFAULT true CHECK (is_cosmetic = true),
  resembles_verification boolean NOT NULL DEFAULT false CHECK (resembles_verification = false),
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_cosmetic_tokens_object CHECK (jsonb_typeof(style_tokens) = 'object'),
  CONSTRAINT passport_cosmetic_text_lengths CHECK (char_length(label) BETWEEN 2 AND 60 AND char_length(description) BETWEEN 2 AND 180)
);

CREATE TABLE IF NOT EXISTS public.passport_customizations (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme_key text NOT NULL DEFAULT 'mechi_core' REFERENCES public.passport_cosmetic_catalog(cosmetic_key) ON DELETE RESTRICT,
  avatar_frame_key text NOT NULL DEFAULT 'frame_none' REFERENCES public.passport_cosmetic_catalog(cosmetic_key) ON DELETE RESTRICT,
  card_style_key text NOT NULL DEFAULT 'card_core' REFERENCES public.passport_cosmetic_catalog(cosmetic_key) ON DELETE RESTRICT,
  show_dimensions boolean NOT NULL DEFAULT true,
  show_level boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.passport_showcase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 9),
  source_type text NOT NULL CHECK (source_type IN ('highlight', 'achievement_award', 'event_credential', 'team_achievement', 'game_entry')),
  source_id text NOT NULL,
  label text NOT NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_showcase_user_slot_unique UNIQUE (user_id, slot),
  CONSTRAINT passport_showcase_user_source_unique UNIQUE (user_id, source_type, source_id),
  CONSTRAINT passport_showcase_label_length CHECK (char_length(label) BETWEEN 2 AND 100)
);

CREATE TABLE IF NOT EXISTS public.passport_custom_shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'friends', 'private')),
  display_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_shelf_title_length CHECK (char_length(title) BETWEEN 2 AND 60),
  CONSTRAINT passport_shelf_description_length CHECK (char_length(description) <= 180)
);

CREATE TABLE IF NOT EXISTS public.passport_custom_shelf_items (
  shelf_id uuid NOT NULL REFERENCES public.passport_custom_shelves(id) ON DELETE CASCADE,
  game_entry_id uuid NOT NULL REFERENCES public.passport_game_entries(id) ON DELETE CASCADE,
  display_order smallint NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (shelf_id, game_entry_id)
);

CREATE TABLE IF NOT EXISTS public.passport_replay_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  replay_year integer NOT NULL CHECK (replay_year BETWEEN 2020 AND 2200),
  formula_version text NOT NULL DEFAULT 'v1',
  period_state text NOT NULL CHECK (period_state IN ('year_to_date', 'final')),
  payload jsonb NOT NULL,
  source_cutoff_at timestamptz NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_replay_user_year_unique UNIQUE (user_id, replay_year),
  CONSTRAINT passport_replay_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE TABLE IF NOT EXISTS public.passport_media_kit_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  headline text NOT NULL DEFAULT '',
  creator_roles text[] NOT NULL DEFAULT '{}',
  inquiry_url text,
  include_dimensions boolean NOT NULL DEFAULT true,
  include_events boolean NOT NULL DEFAULT true,
  include_teams boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_media_kit_headline_length CHECK (char_length(headline) <= 140),
  CONSTRAINT passport_media_kit_roles_limit CHECK (cardinality(creator_roles) <= 8),
  CONSTRAINT passport_media_kit_url_https CHECK (inquiry_url IS NULL OR inquiry_url ~ '^https://')
);

CREATE INDEX IF NOT EXISTS passport_achievement_awards_user_active_idx ON public.passport_achievement_awards(user_id, issued_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS passport_achievement_awards_definition_idx ON public.passport_achievement_awards(achievement_key, issued_at DESC);
CREATE INDEX IF NOT EXISTS passport_achievement_awards_issuer_idx ON public.passport_achievement_awards(issuer_id) WHERE issuer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_cosmetic_catalog_active_idx ON public.passport_cosmetic_catalog(cosmetic_type, required_plan, sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS passport_showcase_user_visibility_idx ON public.passport_showcase_items(user_id, visibility, slot);
CREATE INDEX IF NOT EXISTS passport_shelves_user_order_idx ON public.passport_custom_shelves(user_id, display_order, created_at);
CREATE INDEX IF NOT EXISTS passport_shelf_items_game_entry_idx ON public.passport_custom_shelf_items(game_entry_id);
CREATE INDEX IF NOT EXISTS passport_replay_user_year_idx ON public.passport_replay_snapshots(user_id, replay_year DESC);
CREATE INDEX IF NOT EXISTS passport_replay_public_idx ON public.passport_replay_snapshots(share_token) WHERE is_public = true;

DROP TRIGGER IF EXISTS passport_customizations_set_updated_at ON public.passport_customizations;
CREATE TRIGGER passport_customizations_set_updated_at BEFORE UPDATE ON public.passport_customizations FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_showcase_items_set_updated_at ON public.passport_showcase_items;
CREATE TRIGGER passport_showcase_items_set_updated_at BEFORE UPDATE ON public.passport_showcase_items FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_custom_shelves_set_updated_at ON public.passport_custom_shelves;
CREATE TRIGGER passport_custom_shelves_set_updated_at BEFORE UPDATE ON public.passport_custom_shelves FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_replay_snapshots_set_updated_at ON public.passport_replay_snapshots;
CREATE TRIGGER passport_replay_snapshots_set_updated_at BEFORE UPDATE ON public.passport_replay_snapshots FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
DROP TRIGGER IF EXISTS passport_media_kit_settings_set_updated_at ON public.passport_media_kit_settings;
CREATE TRIGGER passport_media_kit_settings_set_updated_at BEFORE UPDATE ON public.passport_media_kit_settings FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_dimension_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_achievement_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_cosmetic_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_showcase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_custom_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_custom_shelf_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_replay_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_media_kit_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.passport_dimension_snapshots, public.passport_achievement_definitions,
  public.passport_achievement_awards, public.passport_cosmetic_catalog, public.passport_customizations,
  public.passport_showcase_items, public.passport_custom_shelves, public.passport_custom_shelf_items,
  public.passport_replay_snapshots, public.passport_media_kit_settings FROM anon, authenticated;
GRANT ALL ON TABLE public.passport_dimension_snapshots, public.passport_achievement_definitions,
  public.passport_achievement_awards, public.passport_cosmetic_catalog, public.passport_customizations,
  public.passport_showcase_items, public.passport_custom_shelves, public.passport_custom_shelf_items,
  public.passport_replay_snapshots, public.passport_media_kit_settings TO service_role;

INSERT INTO public.passport_cosmetic_catalog(cosmetic_key, cosmetic_type, label, description, required_plan, style_tokens, is_animated, performance_tier, sort_order) VALUES
  ('mechi_core', 'theme', 'Mechi Core', 'The free PlayMechi identity theme.', 'free', '{"background":"#071018","surface":"#0e1927","accent":"#32E0C4"}', false, 'light', 10),
  ('midnight_grid', 'theme', 'Midnight Grid', 'A free deep-blue grid-inspired theme.', 'free', '{"background":"#07111F","surface":"#101D31","accent":"#5EA4FF"}', false, 'light', 20),
  ('neon_arena', 'theme', 'Neon Arena', 'A Pro neon arena cosmetic theme.', 'pro', '{"background":"#080712","surface":"#17102B","accent":"#D35CFF"}', true, 'moderate', 30),
  ('golden_hour', 'theme', 'Golden Hour', 'An Elite warm-gold cosmetic theme.', 'elite', '{"background":"#151006","surface":"#251B0A","accent":"#F6C453"}', true, 'moderate', 40),
  ('frame_none', 'avatar_frame', 'No Frame', 'Clean avatar presentation.', 'free', '{"ring":"transparent","width":0}', false, 'light', 10),
  ('frame_teal', 'avatar_frame', 'Teal Circuit', 'A cosmetic teal circuit frame.', 'pro', '{"ring":"#32E0C4","width":4}', false, 'light', 20),
  ('frame_gold', 'avatar_frame', 'Gold Orbit', 'A cosmetic Elite gold orbit frame.', 'elite', '{"ring":"#F6C453","width":5}', true, 'moderate', 30),
  ('card_core', 'card_style', 'Core Card', 'The standard free Gamer Card.', 'free', '{"pattern":"core","accent":"inherit"}', false, 'light', 10),
  ('card_signal', 'card_style', 'Signal Card', 'A Pro signal-line Gamer Card.', 'pro', '{"pattern":"signal","accent":"inherit"}', false, 'light', 20),
  ('card_aurora', 'card_style', 'Aurora Card', 'An Elite animated-preview card style.', 'elite', '{"pattern":"aurora","accent":"inherit"}', true, 'moderate', 30)
ON CONFLICT (cosmetic_key) DO NOTHING;

INSERT INTO public.passport_achievement_definitions(achievement_key, family, title, description, requirement_text, rarity, trust_tier, source_types) VALUES
  ('passport_library_started', 'library', 'Library Started', 'The first title entered into a Gamer Passport.', 'Add at least one game to your Passport library.', 'common', 'personal', ARRAY['game_entry']),
  ('passport_library_five', 'library', 'Five Worlds', 'A library spanning at least five games.', 'Add five distinct games to your Passport library.', 'uncommon', 'personal', ARRAY['game_entry']),
  ('passport_first_completion', 'completion', 'Credits Rolled', 'The first completed game recorded on the Passport.', 'Mark one game completed.', 'common', 'personal', ARRAY['game_entry']),
  ('passport_completion_five', 'completion', 'Completion Shelf', 'Five completed games in one gaming identity.', 'Complete five distinct games.', 'rare', 'personal', ARRAY['game_entry']),
  ('passport_first_verified_match', 'competitive', 'Verified Challenger', 'A completed Mechi match backed by platform records.', 'Complete one verified Mechi match.', 'common', 'mechi_verified', ARRAY['match']),
  ('passport_ten_verified_matches', 'competitive', 'Arena Regular', 'Ten completed Mechi matches backed by platform records.', 'Complete ten verified Mechi matches.', 'uncommon', 'mechi_verified', ARRAY['match']),
  ('passport_first_event', 'events', 'Checked In', 'A verified physical or online event presence record.', 'Receive one active checked-in, attended, competed, placement, staff, organizer, or streamer credential.', 'uncommon', 'organizer_verified', ARRAY['event_credential']),
  ('passport_event_regular', 'events', 'Event Regular', 'Three verified event-presence credentials.', 'Receive active presence credentials for three distinct events.', 'rare', 'organizer_verified', ARRAY['event_credential']),
  ('passport_team_player', 'teams', 'Squad Identity', 'An active role on a Mechi team.', 'Join an active Mechi team.', 'common', 'mechi_verified', ARRAY['team_membership']),
  ('passport_connector', 'community', 'Connector', 'A trusted circle of accepted gaming friends.', 'Build five accepted Mechi friendships.', 'uncommon', 'mechi_verified', ARRAY['friendship']),
  ('passport_2026_replay', 'annual', '2026 Replay', 'A generated 2026 PlayMechi Replay snapshot.', 'Generate a 2026 Replay from eligible source history.', 'rare', 'mechi_verified', ARRAY['replay'])
ON CONFLICT (achievement_key) DO NOTHING;

UPDATE public.passport_achievement_definitions SET rarity = 'limited', limited_from = '2026-01-01T00:00:00Z', limited_until = '2027-01-31T23:59:59Z'
WHERE achievement_key = 'passport_2026_replay';

INSERT INTO public.passport_customizations(user_id)
SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.passport_media_kit_settings(user_id)
SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;
