import type {
  PassportOwnerCompetitiveResume,
  PassportPublicCompetitiveResume,
} from '@/lib/passport-resume-types';

export type PassportResumePublicProjectionSource = Omit<
  PassportOwnerCompetitiveResume,
  'access'
>;

function sanitizeHeadline(value: unknown): string {
  if (typeof value !== 'string') return '';
  return [...value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()]
    .slice(0, 120)
    .join('');
}

function sanitizeInquiryUrl(enabled: boolean, value: unknown): string | undefined {
  if (!enabled || typeof value !== 'string') return undefined;
  const candidate = value.trim();
  if (!candidate || candidate.length > 500 || /[\u0000-\u001F\u007F]/.test(candidate)) {
    return undefined;
  }
  try {
    const parsed = new URL(candidate);
    if (
      parsed.protocol !== 'https:'
      || !parsed.hostname
      || parsed.username
      || parsed.password
    ) {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function selectedGameSet(values: unknown): ReadonlySet<string> | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  const selected = new Set(
    values
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 8)
  );
  return selected;
}

export function buildPublicPassportCompetitiveResume(
  source: PassportResumePublicProjectionSource
): PassportPublicCompetitiveResume {
  const selectedGames = selectedGameSet(source.cv_settings.selected_games);
  const includesGame = (game: string) => !selectedGames || selectedGames.has(game);
  const inquiryUrl = sanitizeInquiryUrl(
    source.cv_settings.inquiry_enabled,
    source.cv_settings.inquiry_url
  );

  return {
    access: 'public',
    identity: {
      username: source.identity.username,
      display_name: source.identity.display_name,
    },
    games: source.games
      .filter((game) => includesGame(game.game))
      .map((game) => ({
        game: game.game,
        label: game.label,
        current_rating: game.current_rating,
        peak_rating: game.peak_rating,
        matches: game.matches,
        wins: game.wins,
        win_rate: game.win_rate,
        tournament_entries: game.tournament_entries,
        tournament_wins: game.tournament_wins,
      })),
    seasons: source.seasons
      .filter((season) => includesGame(season.game))
      .map((season) => ({
        id: season.id,
        title: season.title,
        game: season.game,
        matches: season.matches,
        peak_rating: season.peak_rating,
        tournament_wins: season.tournament_wins,
      })),
    matches: source.matches
      .filter((match) => includesGame(match.game))
      .map((match) => ({
        id: match.id,
        game: match.game,
        opponent_username: match.opponent_username,
        result: match.result,
        score: match.score,
        completed_at: match.completed_at,
      })),
    tournaments: source.tournaments
      .filter((tournament) => includesGame(tournament.game))
      .map((tournament) => ({
        title: tournament.title,
        game: tournament.game,
        registration_state: tournament.registration_state,
        highest_round: tournament.highest_round,
        champion: tournament.champion,
      })),
    teams: source.cv_settings.include_teams
      ? source.teams.map((team) => ({
          name: team.name,
          role: team.role,
          membership_status: team.membership_status,
          joined_at: team.joined_at,
        }))
      : [],
    events: source.cv_settings.include_events
      ? source.events
          .filter((event) => !event.game || includesGame(event.game))
          .map((event) => ({
            verification_token: event.verification_token,
            event_title: event.event_title,
            stamp_type: event.stamp_type,
            game: event.game,
            placement: event.placement,
            occurred_at: event.occurred_at,
          }))
      : [],
    presentation: {
      headline: sanitizeHeadline(source.cv_settings.headline),
      ...(inquiryUrl ? { inquiry_url: inquiryUrl } : {}),
    },
    generated_at: source.generated_at,
  };
}
