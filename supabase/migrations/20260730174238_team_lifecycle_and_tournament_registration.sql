-- Phase 2: transactional team lifecycle, durable game rosters, and team tournament entry.
-- All functions are SECURITY INVOKER and executable only by service_role. The Next.js
-- server authenticates the player and passes the verified profile id as the actor.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS participant_mode text NOT NULL DEFAULT 'solo',
  ADD COLUMN IF NOT EXISTS team_size integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'tournaments_participant_mode_check'
       AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_participant_mode_check
      CHECK (participant_mode IN ('solo', 'team'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'tournaments_participant_team_size_check'
       AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_participant_team_size_check
      CHECK (
        (participant_mode = 'solo' AND team_size IS NULL)
        OR
        (participant_mode = 'team' AND team_size BETWEEN 2 AND 12)
      );
  END IF;
END
$$;

ALTER TABLE public.tournament_team_entries
  ADD COLUMN IF NOT EXISTS payment_access_code text,
  ADD COLUMN IF NOT EXISTS payment_authorization_url text,
  ADD COLUMN IF NOT EXISTS roster_locked_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS roster_version integer NOT NULL DEFAULT 1;

UPDATE public.tournament_team_entries
   SET roster_locked_by = registered_by
 WHERE roster_locked_by IS NULL;

ALTER TABLE public.tournament_team_entries
  ALTER COLUMN roster_locked_by SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_team_entries_team_joined
  ON public.tournament_team_entries(team_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_tournament_team_entries_registered_by
  ON public.tournament_team_entries(registered_by, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_roster_entries_member
  ON public.team_roster_entries(member_id);

CREATE OR REPLACE FUNCTION public.protect_tournament_team_roster_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
     OR NEW.team_id IS DISTINCT FROM OLD.team_id
     OR NEW.registered_by IS DISTINCT FROM OLD.registered_by
     OR NEW.roster_snapshot IS DISTINCT FROM OLD.roster_snapshot
     OR NEW.roster_locked_at IS DISTINCT FROM OLD.roster_locked_at
     OR NEW.roster_locked_by IS DISTINCT FROM OLD.roster_locked_by
     OR NEW.roster_version IS DISTINCT FROM OLD.roster_version THEN
    RAISE EXCEPTION 'ROSTER_SNAPSHOT_IMMUTABLE';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_tournament_team_roster_snapshot
  ON public.tournament_team_entries;
CREATE TRIGGER protect_tournament_team_roster_snapshot
BEFORE UPDATE ON public.tournament_team_entries
FOR EACH ROW
EXECUTE FUNCTION public.protect_tournament_team_roster_snapshot();

CREATE OR REPLACE FUNCTION public.create_player_team(
  p_owner_id uuid,
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_region text DEFAULT 'Kenya',
  p_visibility text DEFAULT 'public',
  p_recruiting boolean DEFAULT false
)
RETURNS TABLE (
  team_id uuid,
  team_name text,
  team_slug text,
  membership_id uuid
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_member public.team_members%ROWTYPE;
BEGIN
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_REQUIRED';
  END IF;
  IF char_length(btrim(COALESCE(p_name, ''))) NOT BETWEEN 2 AND 60 THEN
    RAISE EXCEPTION 'INVALID_TEAM_NAME';
  END IF;
  IF p_visibility NOT IN ('public', 'private') THEN
    RAISE EXCEPTION 'INVALID_TEAM_VISIBILITY';
  END IF;

  INSERT INTO public.teams (
    name,
    slug,
    description,
    region,
    visibility,
    recruiting,
    owner_id
  )
  VALUES (
    btrim(p_name),
    p_slug,
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    COALESCE(NULLIF(btrim(p_region), ''), 'Kenya'),
    p_visibility,
    p_recruiting,
    p_owner_id
  )
  RETURNING * INTO v_team;

  INSERT INTO public.team_members (team_id, user_id, role, status)
  VALUES (v_team.id, p_owner_id, 'captain', 'active')
  RETURNING * INTO v_member;

  INSERT INTO public.team_audit_logs (
    team_id,
    actor_id,
    action,
    subject_user_id,
    details
  )
  VALUES (
    v_team.id,
    p_owner_id,
    'team_created',
    p_owner_id,
    jsonb_build_object('name', v_team.name)
  );

  team_id := v_team.id;
  team_name := v_team.name;
  team_slug := v_team.slug;
  membership_id := v_member.id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_team_invitation(
  p_team_id uuid,
  p_actor_id uuid,
  p_invitee_id uuid
)
RETURNS TABLE (
  invitation_id uuid,
  invitation_status text,
  invitation_expires_at timestamptz
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_actor_role text;
  v_invitation public.team_invitations%ROWTYPE;
BEGIN
  SELECT *
    INTO v_team
    FROM public.teams
   WHERE id = p_team_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  SELECT role
    INTO v_actor_role
    FROM public.team_members
   WHERE team_id = p_team_id
     AND user_id = p_actor_id
     AND status = 'active';

  IF v_team.owner_id <> p_actor_id AND COALESCE(v_actor_role, '') <> 'captain' THEN
    RAISE EXCEPTION 'TEAM_MANAGE_FORBIDDEN';
  END IF;
  IF p_invitee_id = p_actor_id THEN
    RAISE EXCEPTION 'INVITE_SELF';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.team_members
     WHERE team_id = p_team_id
       AND user_id = p_invitee_id
       AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'TEAM_MEMBER_EXISTS';
  END IF;

  UPDATE public.team_invitations
     SET status = 'expired',
         responded_at = timezone('utc', now())
   WHERE team_id = p_team_id
     AND invitee_id = p_invitee_id
     AND status = 'pending'
     AND expires_at <= timezone('utc', now());

  IF EXISTS (
    SELECT 1
      FROM public.team_invitations
     WHERE team_id = p_team_id
       AND invitee_id = p_invitee_id
       AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'INVITATION_PENDING';
  END IF;

  INSERT INTO public.team_invitations (team_id, invitee_id, inviter_id)
  VALUES (p_team_id, p_invitee_id, p_actor_id)
  RETURNING * INTO v_invitation;

  INSERT INTO public.team_audit_logs (
    team_id,
    actor_id,
    action,
    subject_user_id
  )
  VALUES (p_team_id, p_actor_id, 'invitation_sent', p_invitee_id);

  invitation_id := v_invitation.id;
  invitation_status := v_invitation.status;
  invitation_expires_at := v_invitation.expires_at;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_team_invitation(
  p_invitation_id uuid,
  p_actor_id uuid,
  p_response text
)
RETURNS TABLE (
  team_id uuid,
  invitation_status text,
  inviter_id uuid,
  team_name text
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_invitation public.team_invitations%ROWTYPE;
  v_team public.teams%ROWTYPE;
  v_member public.team_members%ROWTYPE;
BEGIN
  IF p_response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'INVALID_INVITATION_RESPONSE';
  END IF;

  SELECT *
    INTO v_invitation
    FROM public.team_invitations
   WHERE id = p_invitation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITATION_NOT_FOUND';
  END IF;
  IF v_invitation.invitee_id <> p_actor_id THEN
    RAISE EXCEPTION 'INVITATION_FORBIDDEN';
  END IF;
  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'INVITATION_NOT_PENDING';
  END IF;

  SELECT *
    INTO v_team
    FROM public.teams
   WHERE id = v_invitation.team_id;

  IF v_invitation.expires_at <= timezone('utc', now()) THEN
    UPDATE public.team_invitations
       SET status = 'expired',
           responded_at = timezone('utc', now())
     WHERE id = v_invitation.id;

    team_id := v_invitation.team_id;
    invitation_status := 'expired';
    inviter_id := v_invitation.inviter_id;
    team_name := v_team.name;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_response = 'accepted' THEN
    SELECT *
      INTO v_member
      FROM public.team_members tm
     WHERE tm.team_id = v_invitation.team_id
       AND tm.user_id = p_actor_id
     FOR UPDATE;

    IF FOUND AND v_member.status = 'active' THEN
      RAISE EXCEPTION 'TEAM_MEMBER_EXISTS';
    ELSIF FOUND THEN
      UPDATE public.team_members AS tm
         SET status = 'active',
             role = 'member',
             joined_at = timezone('utc', now()),
             left_at = NULL
       WHERE tm.id = v_member.id;
    ELSE
      INSERT INTO public.team_members (team_id, user_id, role, status)
      VALUES (v_invitation.team_id, p_actor_id, 'member', 'active');
    END IF;
  END IF;

  UPDATE public.team_invitations
     SET status = p_response,
         responded_at = timezone('utc', now())
   WHERE id = v_invitation.id;

  INSERT INTO public.team_audit_logs (
    team_id,
    actor_id,
    action,
    subject_user_id
  )
  VALUES (
    v_invitation.team_id,
    p_actor_id,
    CASE
      WHEN p_response = 'accepted' THEN 'invitation_accepted'
      ELSE 'invitation_declined'
    END,
    p_actor_id
  );

  team_id := v_invitation.team_id;
  invitation_status := p_response;
  inviter_id := v_invitation.inviter_id;
  team_name := v_team.name;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_team_member_role(
  p_team_id uuid,
  p_actor_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS TABLE (
  member_id uuid,
  user_id uuid,
  member_role text
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_actor_role text;
  v_target public.team_members%ROWTYPE;
BEGIN
  IF p_role NOT IN ('captain', 'starter', 'substitute', 'member') THEN
    RAISE EXCEPTION 'INVALID_TEAM_ROLE';
  END IF;

  SELECT *
    INTO v_team
    FROM public.teams
   WHERE id = p_team_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  PERFORM 1
    FROM public.team_members tm
   WHERE tm.team_id = p_team_id
     AND tm.user_id IN (p_actor_id, p_user_id)
   ORDER BY tm.user_id
   FOR UPDATE;

  SELECT role
    INTO v_actor_role
    FROM public.team_members tm
   WHERE tm.team_id = p_team_id
     AND tm.user_id = p_actor_id
     AND tm.status = 'active';

  IF v_team.owner_id <> p_actor_id AND COALESCE(v_actor_role, '') <> 'captain' THEN
    RAISE EXCEPTION 'TEAM_MANAGE_FORBIDDEN';
  END IF;

  SELECT *
    INTO v_target
    FROM public.team_members tm
   WHERE tm.team_id = p_team_id
     AND tm.user_id = p_user_id
     AND tm.status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_MEMBER_NOT_FOUND';
  END IF;
  IF v_team.owner_id = p_user_id AND p_role <> 'captain' THEN
    RAISE EXCEPTION 'OWNER_ROLE_LOCKED';
  END IF;

  UPDATE public.team_members AS tm
     SET role = p_role
   WHERE tm.id = v_target.id;

  INSERT INTO public.team_audit_logs (
    team_id,
    actor_id,
    action,
    subject_user_id,
    details
  )
  VALUES (
    p_team_id,
    p_actor_id,
    'member_role_changed',
    p_user_id,
    jsonb_build_object('from', v_target.role, 'to', p_role)
  );

  member_id := v_target.id;
  user_id := p_user_id;
  member_role := p_role;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_team_ownership(
  p_team_id uuid,
  p_actor_id uuid,
  p_target_user_id uuid
)
RETURNS TABLE (
  team_id uuid,
  owner_id uuid
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_target public.team_members%ROWTYPE;
BEGIN
  SELECT *
    INTO v_team
    FROM public.teams
   WHERE id = p_team_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;
  IF v_team.owner_id <> p_actor_id THEN
    RAISE EXCEPTION 'OWNER_ONLY';
  END IF;
  IF p_target_user_id = p_actor_id THEN
    RAISE EXCEPTION 'TRANSFER_TARGET_INVALID';
  END IF;

  SELECT *
    INTO v_target
    FROM public.team_members tm
   WHERE tm.team_id = p_team_id
     AND tm.user_id = p_target_user_id
     AND tm.status = 'active'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_MEMBER_NOT_FOUND';
  END IF;

  UPDATE public.teams
     SET owner_id = p_target_user_id,
         updated_at = timezone('utc', now())
   WHERE id = p_team_id;

  UPDATE public.team_members AS tm
     SET role = 'captain'
   WHERE tm.id = v_target.id;

  INSERT INTO public.team_audit_logs (
    team_id,
    actor_id,
    action,
    subject_user_id,
    details
  )
  VALUES (
    p_team_id,
    p_actor_id,
    'ownership_transferred',
    p_target_user_id,
    jsonb_build_object('previous_owner_id', p_actor_id)
  );

  team_id := p_team_id;
  owner_id := p_target_user_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_player_team(
  p_team_id uuid,
  p_actor_id uuid
)
RETURNS TABLE (
  team_id uuid,
  member_status text
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_member public.team_members%ROWTYPE;
BEGIN
  SELECT *
    INTO v_team
    FROM public.teams
   WHERE id = p_team_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;
  IF v_team.owner_id = p_actor_id THEN
    RAISE EXCEPTION 'OWNER_TRANSFER_REQUIRED';
  END IF;

  SELECT *
    INTO v_member
    FROM public.team_members tm
   WHERE tm.team_id = p_team_id
     AND tm.user_id = p_actor_id
     AND tm.status = 'active'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_MEMBER_NOT_FOUND';
  END IF;

  DELETE FROM public.team_roster_entries AS tre
   WHERE tre.team_id = p_team_id
     AND tre.member_id = v_member.id;

  UPDATE public.team_members AS tm
     SET status = 'left',
         left_at = timezone('utc', now())
   WHERE tm.id = v_member.id;

  INSERT INTO public.team_audit_logs (
    team_id,
    actor_id,
    action,
    subject_user_id
  )
  VALUES (p_team_id, p_actor_id, 'member_left', p_actor_id);

  team_id := p_team_id;
  member_status := 'left';
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_team_roster(
  p_team_id uuid,
  p_actor_id uuid,
  p_game text,
  p_platform text,
  p_entries jsonb
)
RETURNS TABLE (
  roster_count integer,
  eligible_count integer
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_actor_role text;
  v_entry jsonb;
  v_member public.team_members%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_user_id uuid;
  v_roster_role text;
  v_player_id text;
  v_eligible boolean;
  v_count integer := 0;
  v_eligible_count integer := 0;
BEGIN
  IF jsonb_typeof(p_entries) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_ROSTER';
  END IF;
  IF jsonb_array_length(p_entries) > 14 THEN
    RAISE EXCEPTION 'ROSTER_TOO_LARGE';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM (
        SELECT value->>'user_id' AS user_id, count(*) AS row_count
          FROM jsonb_array_elements(p_entries)
         GROUP BY value->>'user_id'
      ) duplicates
     WHERE duplicates.user_id IS NULL
        OR duplicates.row_count > 1
  ) THEN
    RAISE EXCEPTION 'ROSTER_DUPLICATE_PLAYER';
  END IF;

  SELECT *
    INTO v_team
    FROM public.teams
   WHERE id = p_team_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  SELECT role
    INTO v_actor_role
    FROM public.team_members
   WHERE team_id = p_team_id
     AND user_id = p_actor_id
     AND status = 'active';
  IF v_team.owner_id <> p_actor_id AND COALESCE(v_actor_role, '') <> 'captain' THEN
    RAISE EXCEPTION 'TEAM_MANAGE_FORBIDDEN';
  END IF;

  DELETE FROM public.team_roster_entries
   WHERE team_id = p_team_id
     AND game = p_game;

  FOR v_entry IN
    SELECT value
      FROM jsonb_array_elements(p_entries)
  LOOP
    BEGIN
      v_user_id := (v_entry->>'user_id')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'INVALID_ROSTER_PLAYER';
    END;

    v_roster_role := COALESCE(v_entry->>'roster_role', 'starter');
    IF v_roster_role NOT IN ('starter', 'substitute') THEN
      RAISE EXCEPTION 'INVALID_ROSTER_ROLE';
    END IF;

    SELECT tm, p
      INTO v_member, v_profile
      FROM public.team_members tm
      JOIN public.profiles p ON p.id = tm.user_id
     WHERE tm.team_id = p_team_id
       AND tm.user_id = v_user_id
       AND tm.status = 'active'
     FOR UPDATE OF tm;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ROSTER_PLAYER_NOT_ACTIVE';
    END IF;

    v_player_id := btrim(COALESCE(v_entry->>'player_id', ''));
    v_eligible :=
      p_game = ANY(COALESCE(v_profile.selected_games, ARRAY[]::text[]))
      AND char_length(v_player_id) > 0;

    INSERT INTO public.team_roster_entries (
      team_id,
      game,
      member_id,
      roster_role,
      game_account_snapshot,
      eligibility_status,
      eligibility_reason
    )
    VALUES (
      p_team_id,
      p_game,
      v_member.id,
      v_roster_role,
      jsonb_build_object(
        'platform', p_platform,
        'player_id', v_player_id,
        'username', v_profile.username
      ),
      CASE WHEN v_eligible THEN 'eligible' ELSE 'blocked' END,
      CASE
        WHEN NOT (p_game = ANY(COALESCE(v_profile.selected_games, ARRAY[]::text[])))
          THEN 'Add the tournament game to the player profile.'
        WHEN char_length(v_player_id) = 0
          THEN 'Add the player game name or ID.'
        ELSE NULL
      END
    );

    v_count := v_count + 1;
    IF v_eligible THEN
      v_eligible_count := v_eligible_count + 1;
    END IF;
  END LOOP;

  INSERT INTO public.team_audit_logs (
    team_id,
    actor_id,
    action,
    details
  )
  VALUES (
    p_team_id,
    p_actor_id,
    'roster_replaced',
    jsonb_build_object(
      'game', p_game,
      'platform', p_platform,
      'players', v_count,
      'eligible', v_eligible_count
    )
  );

  roster_count := v_count;
  eligible_count := v_eligible_count;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_team_tournament_slot(
  p_tournament_id uuid,
  p_team_id uuid,
  p_actor_id uuid,
  p_payment_status text,
  p_payment_ref text DEFAULT NULL,
  p_payment_access_code text DEFAULT NULL
)
RETURNS TABLE (
  entry_id uuid,
  entry_payment_status text,
  entry_joined_at timestamptz,
  entry_inserted boolean,
  tournament_status text,
  roster_snapshot jsonb
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_team public.teams%ROWTYPE;
  v_actor_role text;
  v_existing public.tournament_team_entries%ROWTYPE;
  v_entry public.tournament_team_entries%ROWTYPE;
  v_existing_found boolean := false;
  v_reserved_count integer;
  v_starter_count integer;
  v_roster_count integer;
  v_blocked_count integer;
  v_platform_mismatch_count integer;
  v_players jsonb;
  v_snapshot jsonb;
  v_locked_at timestamptz := timezone('utc', now());
BEGIN
  IF p_payment_status NOT IN ('pending', 'free') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS';
  END IF;

  SELECT *
    INTO v_tournament
    FROM public.tournaments
   WHERE id = p_tournament_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;
  IF v_tournament.participant_mode <> 'team' THEN
    RAISE EXCEPTION 'TEAM_ENTRY_NOT_ALLOWED';
  END IF;
  IF v_tournament.status <> 'open' THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_OPEN';
  END IF;
  IF v_tournament.team_size IS NULL THEN
    RAISE EXCEPTION 'TOURNAMENT_TEAM_SIZE_MISSING';
  END IF;
  IF v_tournament.entry_fee > 0 AND v_tournament.approval_status <> 'approved' THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_APPROVED';
  END IF;

  SELECT *
    INTO v_team
    FROM public.teams
   WHERE id = p_team_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  SELECT role
    INTO v_actor_role
    FROM public.team_members
   WHERE team_id = p_team_id
     AND user_id = p_actor_id
     AND status = 'active';
  IF v_team.owner_id <> p_actor_id AND COALESCE(v_actor_role, '') <> 'captain' THEN
    RAISE EXCEPTION 'TEAM_MANAGE_FORBIDDEN';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.tournament_team_entries
   WHERE tournament_id = p_tournament_id
     AND team_id = p_team_id
   FOR UPDATE;
  v_existing_found := FOUND;

  IF v_existing_found AND v_existing.payment_status IN ('paid', 'free') THEN
    RAISE EXCEPTION 'TEAM_ALREADY_JOINED';
  END IF;
  IF v_existing_found AND v_existing.payment_status = 'pending' THEN
    RAISE EXCEPTION 'TEAM_PAYMENT_PENDING';
  END IF;

  SELECT count(*)
    INTO v_reserved_count
    FROM public.tournament_team_entries
   WHERE tournament_id = p_tournament_id
     AND payment_status IN ('pending', 'paid', 'free');

  IF v_reserved_count >= v_tournament.size THEN
    UPDATE public.tournaments
       SET status = 'full'
     WHERE id = p_tournament_id
       AND status = 'open';
    RAISE EXCEPTION 'TOURNAMENT_FULL';
  END IF;

  IF NOT v_existing_found THEN
    SELECT
      count(*),
      count(*) FILTER (WHERE tre.roster_role = 'starter'),
      count(*) FILTER (WHERE tre.eligibility_status <> 'eligible'),
      count(*) FILTER (
        WHERE v_tournament.platform IS NOT NULL
          AND tre.game_account_snapshot->>'platform' IS DISTINCT FROM v_tournament.platform
      ),
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'member_id', tm.id,
            'user_id', tm.user_id,
            'username', p.username,
            'roster_role', tre.roster_role,
            'game_account', tre.game_account_snapshot
          )
          ORDER BY
            CASE WHEN tre.roster_role = 'starter' THEN 0 ELSE 1 END,
            tm.joined_at,
            tm.user_id
        ),
        '[]'::jsonb
      )
      INTO
        v_roster_count,
        v_starter_count,
        v_blocked_count,
        v_platform_mismatch_count,
        v_players
      FROM public.team_roster_entries tre
      JOIN public.team_members tm
        ON tm.id = tre.member_id
       AND tm.team_id = tre.team_id
       AND tm.status = 'active'
      JOIN public.profiles p ON p.id = tm.user_id
     WHERE tre.team_id = p_team_id
       AND tre.game = v_tournament.game;

    IF v_starter_count <> v_tournament.team_size THEN
      RAISE EXCEPTION 'ROSTER_STARTER_COUNT';
    END IF;
    IF v_roster_count > v_tournament.team_size + 2 THEN
      RAISE EXCEPTION 'ROSTER_TOO_LARGE';
    END IF;
    IF v_blocked_count > 0 THEN
      RAISE EXCEPTION 'ROSTER_BLOCKED';
    END IF;
    IF v_platform_mismatch_count > 0 THEN
      RAISE EXCEPTION 'ROSTER_PLATFORM_MISMATCH';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM public.tournament_team_entries other_entry
        CROSS JOIN LATERAL jsonb_array_elements(other_entry.roster_snapshot->'players') other_player
       WHERE other_entry.tournament_id = p_tournament_id
         AND other_entry.team_id <> p_team_id
         AND other_entry.payment_status IN ('pending', 'paid', 'free')
         AND other_player->>'user_id' IN (
           SELECT tm.user_id::text
             FROM public.team_roster_entries tre
             JOIN public.team_members tm ON tm.id = tre.member_id
            WHERE tre.team_id = p_team_id
              AND tre.game = v_tournament.game
              AND tm.status = 'active'
         )
    ) THEN
      RAISE EXCEPTION 'PLAYER_ALREADY_REGISTERED';
    END IF;

    v_snapshot := jsonb_build_object(
      'version', 1,
      'team_id', v_team.id,
      'team_name', v_team.name,
      'game', v_tournament.game,
      'platform', v_tournament.platform,
      'required_starters', v_tournament.team_size,
      'locked_at', v_locked_at,
      'locked_by', p_actor_id,
      'players', v_players
    );

    INSERT INTO public.tournament_team_entries (
      tournament_id,
      team_id,
      registered_by,
      roster_snapshot,
      roster_locked_at,
      roster_locked_by,
      roster_version,
      payment_status,
      payment_ref,
      payment_access_code,
      check_in_status,
      checked_in_at,
      joined_at
    )
    VALUES (
      p_tournament_id,
      p_team_id,
      p_actor_id,
      v_snapshot,
      v_locked_at,
      p_actor_id,
      1,
      p_payment_status,
      p_payment_ref,
      p_payment_access_code,
      'registered',
      NULL,
      v_locked_at
    )
    RETURNING * INTO v_entry;
    entry_inserted := true;

    INSERT INTO public.team_audit_logs (
      team_id,
      actor_id,
      action,
      details
    )
    VALUES (
      p_team_id,
      p_actor_id,
      'tournament_roster_locked',
      jsonb_build_object(
        'tournament_id', p_tournament_id,
        'entry_id', v_entry.id,
        'roster_version', 1
      )
    );
  ELSE
    UPDATE public.tournament_team_entries
       SET payment_status = p_payment_status,
           payment_ref = p_payment_ref,
           payment_access_code = p_payment_access_code,
           payment_authorization_url = NULL,
           check_in_status = 'registered',
           checked_in_at = NULL,
           joined_at = v_locked_at
     WHERE id = v_existing.id
    RETURNING * INTO v_entry;
    entry_inserted := false;
  END IF;

  SELECT count(*)
    INTO v_reserved_count
    FROM public.tournament_team_entries
   WHERE tournament_id = p_tournament_id
     AND payment_status IN ('pending', 'paid', 'free');

  IF v_reserved_count >= v_tournament.size THEN
    UPDATE public.tournaments
       SET status = 'full'
     WHERE id = p_tournament_id
       AND status = 'open';
    tournament_status := 'full';
  ELSE
    tournament_status := 'open';
  END IF;

  entry_id := v_entry.id;
  entry_payment_status := v_entry.payment_status;
  entry_joined_at := v_entry.joined_at;
  roster_snapshot := v_entry.roster_snapshot;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_in_team_tournament(
  p_tournament_id uuid,
  p_team_id uuid,
  p_actor_id uuid
)
RETURNS TABLE (
  entry_id uuid,
  check_in_status text,
  checked_in_at timestamptz
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_actor_role text;
  v_entry public.tournament_team_entries%ROWTYPE;
  v_checked_in_at timestamptz := timezone('utc', now());
BEGIN
  PERFORM 1
    FROM public.tournaments
   WHERE id = p_tournament_id
     AND participant_mode = 'team'
     AND status IN ('open', 'full', 'active')
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_CHECK_IN_NOT_AVAILABLE';
  END IF;

  SELECT *
    INTO v_team
    FROM public.teams
   WHERE id = p_team_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  SELECT role
    INTO v_actor_role
    FROM public.team_members
   WHERE team_id = p_team_id
     AND user_id = p_actor_id
     AND status = 'active';
  IF v_team.owner_id <> p_actor_id AND COALESCE(v_actor_role, '') <> 'captain' THEN
    RAISE EXCEPTION 'TEAM_MANAGE_FORBIDDEN';
  END IF;

  UPDATE public.tournament_team_entries
     SET check_in_status = 'checked_in',
         checked_in_at = v_checked_in_at
   WHERE tournament_id = p_tournament_id
     AND team_id = p_team_id
     AND payment_status IN ('paid', 'free')
  RETURNING * INTO v_entry;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_ENTRY_NOT_CONFIRMED';
  END IF;

  INSERT INTO public.team_audit_logs (
    team_id,
    actor_id,
    action,
    details
  )
  VALUES (
    p_team_id,
    p_actor_id,
    'tournament_team_checked_in',
    jsonb_build_object('tournament_id', p_tournament_id, 'entry_id', v_entry.id)
  );

  entry_id := v_entry.id;
  check_in_status := v_entry.check_in_status;
  checked_in_at := v_entry.checked_in_at;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_team_tournament_payment_paid(
  p_payment_ref text
)
RETURNS TABLE (
  entry_id uuid,
  tournament_id uuid,
  team_id uuid,
  registered_by uuid
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_entry public.tournament_team_entries%ROWTYPE;
BEGIN
  UPDATE public.tournament_team_entries
     SET payment_status = 'paid'
   WHERE payment_ref = p_payment_ref
     AND payment_status = 'pending'
  RETURNING * INTO v_entry;

  IF NOT FOUND THEN
    SELECT *
      INTO v_entry
      FROM public.tournament_team_entries
     WHERE payment_ref = p_payment_ref
       AND payment_status = 'paid';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEAM_PAYMENT_RECORD_NOT_FOUND';
  END IF;

  entry_id := v_entry.id;
  tournament_id := v_entry.tournament_id;
  team_id := v_entry.team_id;
  registered_by := v_entry.registered_by;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_tournament_team_roster_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_player_team(uuid, text, text, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_team_invitation(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_team_invitation(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_team_member_role(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfer_team_ownership(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leave_player_team(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_team_roster(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_team_tournament_slot(uuid, uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_in_team_tournament(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_team_tournament_payment_paid(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_player_team(uuid, text, text, text, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_team_invitation(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_team_invitation(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_team_member_role(uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transfer_team_ownership(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.leave_player_team(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_team_roster(uuid, uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_team_tournament_slot(uuid, uuid, uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_in_team_tournament(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_team_tournament_payment_paid(text) TO service_role;
