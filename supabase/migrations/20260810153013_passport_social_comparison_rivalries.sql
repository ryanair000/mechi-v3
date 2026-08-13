-- Mechi V5 / PlayMechi Gamer Passport - Phase 3 social comparison layer.
--
-- Mechi uses its own signed JWT and server-side service-role access. All public
-- and authenticated projections are produced by application routes, with block
-- and visibility checks applied before any social or comparison data is read.

CREATE TABLE IF NOT EXISTS public.passport_friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_friendships_canonical_pair CHECK (user_a_id < user_b_id),
  CONSTRAINT passport_friendships_requester_in_pair CHECK (requested_by IN (user_a_id, user_b_id)),
  CONSTRAINT passport_friendships_status_allowed CHECK (
    status IN ('pending', 'accepted', 'declined')
  ),
  CONSTRAINT passport_friendships_unique_pair UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS public.passport_follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_follows_no_self CHECK (follower_id <> followed_id),
  PRIMARY KEY (follower_id, followed_id)
);

CREATE TABLE IF NOT EXISTS public.passport_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason_category text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_blocks_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT passport_blocks_reason_allowed CHECK (
    reason_category IS NULL OR reason_category IN ('privacy', 'harassment', 'spam', 'cheating_concern', 'other')
  ),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.passport_game_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  catalog_game_id uuid NOT NULL REFERENCES public.passport_game_catalog(id) ON DELETE RESTRICT,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent',
  source_comparison_key text,
  seen_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_game_recommendations_no_self CHECK (sender_id <> recipient_id),
  CONSTRAINT passport_game_recommendations_message_length CHECK (char_length(message) <= 240),
  CONSTRAINT passport_game_recommendations_status_allowed CHECK (
    status IN ('sent', 'seen', 'saved', 'dismissed')
  ),
  CONSTRAINT passport_game_recommendations_key_format CHECK (
    source_comparison_key IS NULL OR source_comparison_key ~ '^[0-9a-f-]{36}:[0-9a-f-]{36}$'
  )
);

CREATE TABLE IF NOT EXISTS public.passport_comparison_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_username text,
  attribution_source text NOT NULL DEFAULT 'passport_compare',
  campaign text,
  visit_count integer NOT NULL DEFAULT 0,
  first_visited_at timestamptz,
  last_visited_at timestamptz,
  claimed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_comparison_invitations_target CHECK (
    target_user_id IS NOT NULL OR char_length(coalesce(target_username, '')) BETWEEN 2 AND 40
  ),
  CONSTRAINT passport_comparison_invitations_source_length CHECK (
    char_length(attribution_source) BETWEEN 2 AND 80
  ),
  CONSTRAINT passport_comparison_invitations_campaign_length CHECK (
    campaign IS NULL OR char_length(campaign) <= 100
  ),
  CONSTRAINT passport_comparison_invitations_visits_non_negative CHECK (visit_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.passport_comparison_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  left_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  right_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comparison_key text NOT NULL,
  event_type text NOT NULL,
  invitation_id uuid REFERENCES public.passport_comparison_invitations(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT passport_comparison_events_distinct_players CHECK (left_user_id <> right_user_id),
  CONSTRAINT passport_comparison_events_key_format CHECK (
    comparison_key ~ '^[0-9a-f-]{36}:[0-9a-f-]{36}$'
  ),
  CONSTRAINT passport_comparison_events_type_allowed CHECK (
    event_type IN (
      'viewed', 'shared', 'friend_requested', 'followed', 'recommendation_sent',
      'challenge_started', 'invitation_visited', 'invitation_claimed'
    )
  ),
  CONSTRAINT passport_comparison_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS passport_friendships_user_a_status_idx
  ON public.passport_friendships(user_a_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS passport_friendships_user_b_status_idx
  ON public.passport_friendships(user_b_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS passport_friendships_requested_by_idx
  ON public.passport_friendships(requested_by, status, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_follows_followed_idx
  ON public.passport_follows(followed_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_blocks_blocked_idx
  ON public.passport_blocks(blocked_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_game_recommendations_recipient_idx
  ON public.passport_game_recommendations(recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_game_recommendations_sender_idx
  ON public.passport_game_recommendations(sender_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS passport_game_recommendations_active_unique_idx
  ON public.passport_game_recommendations(sender_id, recipient_id, catalog_game_id)
  WHERE status IN ('sent', 'seen');
CREATE INDEX IF NOT EXISTS passport_comparison_invitations_creator_idx
  ON public.passport_comparison_invitations(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_comparison_invitations_target_idx
  ON public.passport_comparison_invitations(target_user_id, created_at DESC)
  WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_comparison_events_pair_idx
  ON public.passport_comparison_events(comparison_key, created_at DESC);
CREATE INDEX IF NOT EXISTS passport_comparison_events_actor_idx
  ON public.passport_comparison_events(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS passport_comparison_events_invitation_idx
  ON public.passport_comparison_events(invitation_id, created_at DESC)
  WHERE invitation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_passport_comparison_invitation_visit(
  p_token uuid,
  p_left_user_id uuid,
  p_right_user_id uuid
)
RETURNS TABLE (invitation_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.passport_comparison_invitations invitation
  SET
    visit_count = invitation.visit_count + 1,
    first_visited_at = coalesce(invitation.first_visited_at, timezone('utc', now())),
    last_visited_at = timezone('utc', now())
  WHERE invitation.token = p_token
    AND invitation.expires_at > timezone('utc', now())
    AND p_left_user_id <> p_right_user_id
    AND invitation.creator_id IN (p_left_user_id, p_right_user_id)
    AND invitation.target_user_id IN (p_left_user_id, p_right_user_id)
  RETURNING invitation.id;
$$;

REVOKE ALL ON FUNCTION public.record_passport_comparison_invitation_visit(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_passport_comparison_invitation_visit(uuid, uuid, uuid)
  TO service_role;

DROP TRIGGER IF EXISTS passport_friendships_set_updated_at ON public.passport_friendships;
CREATE TRIGGER passport_friendships_set_updated_at
  BEFORE UPDATE ON public.passport_friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

DROP TRIGGER IF EXISTS passport_game_recommendations_set_updated_at ON public.passport_game_recommendations;
CREATE TRIGGER passport_game_recommendations_set_updated_at
  BEFORE UPDATE ON public.passport_game_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();

ALTER TABLE public.passport_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_game_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_comparison_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_comparison_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.passport_friendships,
  public.passport_follows,
  public.passport_blocks,
  public.passport_game_recommendations,
  public.passport_comparison_invitations,
  public.passport_comparison_events
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.passport_friendships,
  public.passport_follows,
  public.passport_blocks,
  public.passport_game_recommendations,
  public.passport_comparison_invitations,
  public.passport_comparison_events
TO service_role;

ALTER TABLE public.passport_profile_summaries
  ADD COLUMN IF NOT EXISTS friends_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.passport_profile_summaries
  DROP CONSTRAINT IF EXISTS passport_profile_summaries_social_non_negative;
ALTER TABLE public.passport_profile_summaries
  ADD CONSTRAINT passport_profile_summaries_social_non_negative CHECK (
    friends_count >= 0 AND followers_count >= 0 AND following_count >= 0
  );

UPDATE public.passport_profiles
SET field_visibility = field_visibility || '{"social":"public"}'::jsonb
WHERE NOT (field_visibility ? 'social');

ALTER TABLE public.passport_profiles
  ALTER COLUMN field_visibility SET DEFAULT '{
    "bio":"public",
    "gamer_since":"public",
    "archetypes":"public",
    "current_status":"public",
    "location":"public",
    "platforms":"public",
    "games":"public",
    "game_ids":"private",
    "competitive":"public",
    "events":"public",
    "achievements":"public",
    "teams":"public",
    "social":"public"
  }'::jsonb;
