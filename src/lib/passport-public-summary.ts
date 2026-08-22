import type {
  PassportField,
  PassportIdentity,
  PassportSummary,
  PublicPassportSummary,
} from '@/lib/passport-types';

export const PASSPORT_SUMMARY_PRIVACY_SOURCES = {
  games_count: ['games'],
  playing_games_count: ['games'],
  completed_games_count: ['games'],
  favorite_games_count: ['games'],
  total_library_hours: ['games'],
  friends_count: ['social'],
  followers_count: ['social'],
  following_count: ['social'],
  total_matches: ['competitive'],
  total_wins: ['competitive'],
  total_losses: ['competitive'],
  win_rate: ['competitive'],
  best_rating: ['competitive'],
  tournaments_registered: ['events'],
  events_attended: ['events'],
  completed_events: ['events'],
  achievements_count: ['achievements'],
  badges_count: ['achievements'],
  teams_count: ['teams'],
  verified_records_count: [
    'games',
    'game_ids',
    'platforms',
    'competitive',
    'events',
    'teams',
    'achievements',
  ],
  last_activity_at: ['competitive', 'events'],
} as const satisfies Record<keyof PublicPassportSummary, readonly PassportField[]>;

export function isPassportFieldVisible(
  identity: PassportIdentity,
  field: PassportField,
  friendView = false
): boolean {
  if (identity.default_visibility === 'private') return false;
  if (identity.default_visibility === 'friends' && !friendView) return false;
  const visibility = identity.field_visibility[field];
  return visibility === 'public' || (friendView && visibility === 'friends');
}

function sourcesVisible(
  identity: PassportIdentity,
  fields: readonly PassportField[],
  friendView: boolean
): boolean {
  return fields.every((field) => isPassportFieldVisible(identity, field, friendView));
}

export function buildPublicPassportSummary(
  summary: PassportSummary,
  identity: PassportIdentity,
  friendView = false,
  visibleVerificationCount?: number
): PublicPassportSummary {
  const gamesVisible = sourcesVisible(identity, PASSPORT_SUMMARY_PRIVACY_SOURCES.games_count, friendView);
  const socialVisible = sourcesVisible(identity, PASSPORT_SUMMARY_PRIVACY_SOURCES.friends_count, friendView);
  const competitiveVisible = sourcesVisible(identity, PASSPORT_SUMMARY_PRIVACY_SOURCES.total_matches, friendView);
  const eventsVisible = sourcesVisible(identity, PASSPORT_SUMMARY_PRIVACY_SOURCES.events_attended, friendView);
  const achievementsVisible = sourcesVisible(identity, PASSPORT_SUMMARY_PRIVACY_SOURCES.achievements_count, friendView);
  const teamsVisible = sourcesVisible(identity, PASSPORT_SUMMARY_PRIVACY_SOURCES.teams_count, friendView);
  const verifiedRecordsVisible = sourcesVisible(
    identity,
    PASSPORT_SUMMARY_PRIVACY_SOURCES.verified_records_count,
    friendView
  );
  const lastActivityVisible = sourcesVisible(
    identity,
    PASSPORT_SUMMARY_PRIVACY_SOURCES.last_activity_at,
    friendView
  );

  return {
    games_count: gamesVisible ? summary.games_count : 0,
    playing_games_count: gamesVisible ? summary.playing_games_count : 0,
    completed_games_count: gamesVisible ? summary.completed_games_count : 0,
    favorite_games_count: gamesVisible ? summary.favorite_games_count : 0,
    total_library_hours: gamesVisible ? summary.total_library_hours : 0,
    friends_count: socialVisible ? summary.friends_count : 0,
    followers_count: socialVisible ? summary.followers_count : 0,
    following_count: socialVisible ? summary.following_count : 0,
    total_matches: competitiveVisible ? summary.total_matches : 0,
    total_wins: competitiveVisible ? summary.total_wins : 0,
    total_losses: competitiveVisible ? summary.total_losses : 0,
    win_rate: competitiveVisible ? summary.win_rate : 0,
    best_rating: competitiveVisible ? summary.best_rating : 0,
    tournaments_registered: eventsVisible ? summary.tournaments_registered : 0,
    events_attended: eventsVisible ? summary.events_attended : 0,
    completed_events: eventsVisible ? summary.completed_events : 0,
    achievements_count: achievementsVisible ? summary.achievements_count : 0,
    badges_count: achievementsVisible ? summary.badges_count : 0,
    teams_count: teamsVisible ? summary.teams_count : 0,
    ...(verifiedRecordsVisible && typeof visibleVerificationCount === 'number'
      ? {
          verified_records_count:
            summary.total_matches + summary.events_attended + visibleVerificationCount,
        }
      : {}),
    ...(lastActivityVisible ? { last_activity_at: summary.last_activity_at } : {}),
  };
}
