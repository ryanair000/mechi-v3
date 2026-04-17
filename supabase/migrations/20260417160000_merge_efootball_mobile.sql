UPDATE profiles
SET selected_games = (
  SELECT COALESCE(array_agg(game ORDER BY first_position), ARRAY[]::text[])
  FROM (
    SELECT
      CASE selected_game WHEN 'efootball_mobile' THEN 'efootball' ELSE selected_game END AS game,
      MIN(position) AS first_position
    FROM unnest(selected_games) WITH ORDINALITY AS games(selected_game, position)
    GROUP BY CASE selected_game WHEN 'efootball_mobile' THEN 'efootball' ELSE selected_game END
  ) normalized_games
)
WHERE 'efootball_mobile' = ANY(selected_games);

UPDATE profiles
SET game_ids =
  CASE
    WHEN game_ids ? 'efootball_mobile:mobile' AND NOT game_ids ? 'efootball:mobile'
      THEN jsonb_set(game_ids, '{efootball:mobile}', game_ids -> 'efootball_mobile:mobile', true)
    ELSE game_ids
  END #- '{efootball_mobile:mobile}'
WHERE game_ids ? 'efootball_mobile:mobile';

UPDATE profiles
SET game_ids =
  CASE
    WHEN game_ids ? 'platform:efootball_mobile' AND NOT game_ids ? 'platform:efootball'
      THEN jsonb_set(game_ids, '{platform:efootball}', game_ids -> 'platform:efootball_mobile', true)
    ELSE game_ids
  END #- '{platform:efootball_mobile}'
WHERE game_ids ? 'platform:efootball_mobile';

UPDATE profiles
SET platforms = array_append(platforms, 'mobile')
WHERE
  NOT ('mobile' = ANY(platforms))
  AND (
    game_ids ? 'efootball:mobile'
    OR game_ids ->> 'platform:efootball' = 'mobile'
  );

UPDATE profiles
SET
  rating_efootball = CASE
    WHEN wins_efootball + losses_efootball = 0
      AND wins_efootball_mobile + losses_efootball_mobile > 0
      THEN rating_efootball_mobile
    WHEN wins_efootball_mobile + losses_efootball_mobile > 0
      THEN GREATEST(rating_efootball, rating_efootball_mobile)
    WHEN rating_efootball = 1000 AND rating_efootball_mobile <> 1000
      THEN rating_efootball_mobile
    ELSE rating_efootball
  END,
  wins_efootball = wins_efootball + wins_efootball_mobile,
  losses_efootball = losses_efootball + losses_efootball_mobile,
  rating_efootball_mobile = 1000,
  wins_efootball_mobile = 0,
  losses_efootball_mobile = 0
WHERE
  rating_efootball_mobile <> 1000
  OR wins_efootball_mobile <> 0
  OR losses_efootball_mobile <> 0;

UPDATE queue
SET game = 'efootball'
WHERE game = 'efootball_mobile';

UPDATE matches
SET game = 'efootball'
WHERE game = 'efootball_mobile';

UPDATE match_challenges
SET game = 'efootball'
WHERE game = 'efootball_mobile';

UPDATE tournaments
SET game = 'efootball'
WHERE game = 'efootball_mobile';

UPDATE lobbies
SET game = 'efootball'
WHERE game = 'efootball_mobile';
