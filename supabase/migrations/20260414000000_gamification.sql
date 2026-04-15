ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_match_date date;

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON achievements(user_id);

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS gamification_summary_p1 jsonb,
  ADD COLUMN IF NOT EXISTS gamification_summary_p2 jsonb;

CREATE OR REPLACE FUNCTION finalize_match_with_gamification(
  p_match_id uuid,
  p_winner_id uuid,
  p_winner_rating integer,
  p_loser_rating integer,
  p_rating_change_p1 integer,
  p_rating_change_p2 integer,
  p_rating_key text,
  p_wins_key text,
  p_losses_key text,
  p_winner_xp_gain integer,
  p_loser_xp_gain integer,
  p_winner_mp_gain integer,
  p_loser_mp_gain integer,
  p_winner_level integer,
  p_loser_level integer,
  p_winner_streak integer,
  p_loser_streak integer,
  p_winner_max_streak integer,
  p_loser_max_streak integer,
  p_match_date date,
  p_winner_achievement_keys text[],
  p_loser_achievement_keys text[],
  p_gamification_summary_p1 jsonb,
  p_gamification_summary_p2 jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match matches%ROWTYPE;
  v_winner_id uuid;
  v_loser_id uuid;
BEGIN
  SELECT *
  INTO v_match
  FROM matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status = 'completed' THEN
    RETURN jsonb_build_object(
      'status', 'completed',
      'winner_id', v_match.winner_id,
      'gamification_summary_p1', v_match.gamification_summary_p1,
      'gamification_summary_p2', v_match.gamification_summary_p2
    );
  END IF;

  IF v_match.status <> 'pending' THEN
    RAISE EXCEPTION 'Match is not active';
  END IF;

  v_winner_id := p_winner_id;

  IF v_winner_id = v_match.player1_id THEN
    v_loser_id := v_match.player2_id;
  ELSIF v_winner_id = v_match.player2_id THEN
    v_loser_id := v_match.player1_id;
  ELSE
    RAISE EXCEPTION 'Winner does not belong to this match';
  END IF;

  EXECUTE format(
    'UPDATE profiles
     SET %1$I = $1,
         %2$I = COALESCE(%2$I, 0) + 1,
         xp = COALESCE(xp, 0) + $2,
         level = $3,
         mp = COALESCE(mp, 0) + $4,
         win_streak = $5,
         max_win_streak = GREATEST(COALESCE(max_win_streak, 0), $6),
         last_match_date = $7
     WHERE id = $8',
    p_rating_key,
    p_wins_key
  )
  USING
    p_winner_rating,
    p_winner_xp_gain,
    p_winner_level,
    p_winner_mp_gain,
    p_winner_streak,
    p_winner_max_streak,
    p_match_date,
    v_winner_id;

  EXECUTE format(
    'UPDATE profiles
     SET %1$I = $1,
         %2$I = COALESCE(%2$I, 0) + 1,
         xp = COALESCE(xp, 0) + $2,
         level = $3,
         mp = COALESCE(mp, 0) + $4,
         win_streak = $5,
         max_win_streak = GREATEST(COALESCE(max_win_streak, 0), $6),
         last_match_date = $7
     WHERE id = $8',
    p_rating_key,
    p_losses_key
  )
  USING
    p_loser_rating,
    p_loser_xp_gain,
    p_loser_level,
    p_loser_mp_gain,
    p_loser_streak,
    p_loser_max_streak,
    p_match_date,
    v_loser_id;

  IF COALESCE(array_length(p_winner_achievement_keys, 1), 0) > 0 THEN
    INSERT INTO achievements (user_id, achievement_key)
    SELECT v_winner_id, achievement_key
    FROM unnest(p_winner_achievement_keys) AS achievement_key
    ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;

  IF COALESCE(array_length(p_loser_achievement_keys, 1), 0) > 0 THEN
    INSERT INTO achievements (user_id, achievement_key)
    SELECT v_loser_id, achievement_key
    FROM unnest(p_loser_achievement_keys) AS achievement_key
    ON CONFLICT (user_id, achievement_key) DO NOTHING;
  END IF;

  UPDATE matches
  SET
    status = 'completed',
    winner_id = p_winner_id,
    rating_change_p1 = p_rating_change_p1,
    rating_change_p2 = p_rating_change_p2,
    completed_at = timezone('utc', now()),
    gamification_summary_p1 = p_gamification_summary_p1,
    gamification_summary_p2 = p_gamification_summary_p2
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'status', 'completed',
    'winner_id', p_winner_id,
    'gamification_summary_p1', p_gamification_summary_p1,
    'gamification_summary_p2', p_gamification_summary_p2
  );
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_match_with_gamification(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  date,
  text[],
  text[],
  jsonb,
  jsonb
) TO anon, authenticated, service_role;
