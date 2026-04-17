const BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://mechi.club';

export const PUBLIC_PROFILE_SHARE_SELECT =
  'id, username, region, level, avatar_url, cover_url, platforms, game_ids, selected_games, rating_efootball, rating_efootball_mobile, rating_fc26, rating_mk11, rating_nba2k26, rating_tekken8, rating_sf6, wins_efootball, wins_efootball_mobile, wins_fc26, wins_mk11, wins_nba2k26, wins_tekken8, wins_sf6, losses_efootball, losses_efootball_mobile, losses_fc26, losses_mk11, losses_nba2k26, losses_tekken8, losses_sf6';

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

function getAbsoluteUrl(path: string) {
  return `${BASE_URL}${path}`;
}

export function getMatchSharePath(matchId: string) {
  return `/s/match/${encodeURIComponent(matchId)}`;
}

export function getProfileSharePath(username: string) {
  return `/s/${encodeURIComponent(username)}`;
}

export function getInvitePath(inviteCode: string) {
  return `/join/${encodeURIComponent(inviteCode.toLowerCase())}`;
}

export function getTournamentSharePath(slug: string) {
  return `/s/t/${encodeURIComponent(slug)}`;
}

export function shareToWhatsApp(text: string, url: string) {
  const msg = `${text}\n\n${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export async function nativeShare(data: ShareData): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

export function downloadImage(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export function getMatchShareUrl(matchId: string) {
  return getAbsoluteUrl(getMatchSharePath(matchId));
}

export function getProfileShareUrl(username: string) {
  return getAbsoluteUrl(getProfileSharePath(username));
}

export function getInviteUrl(inviteCode: string) {
  return getAbsoluteUrl(getInvitePath(inviteCode));
}

export function getMatchOgImageUrl(matchId: string) {
  return `${BASE_URL}/api/og/match?id=${matchId}`;
}

export function getProfileOgImageUrl(username: string) {
  return getAbsoluteUrl(`/api/og/profile?username=${encodeURIComponent(username)}`);
}

export function getTournamentAppUrl(slug: string) {
  return getAbsoluteUrl(`/t/${encodeURIComponent(slug)}`);
}

export function getTournamentShareUrl(slug: string) {
  return getAbsoluteUrl(getTournamentSharePath(slug));
}

export function getTournamentOgImageUrl(slug: string) {
  return `${BASE_URL}/api/og/tournament?slug=${encodeURIComponent(slug)}`;
}

export function matchResultShareText(
  winner: string,
  loser: string,
  game: string,
  rankLabel?: string,
  level?: number
) {
  const climbLine =
    rankLabel && level
      ? `${winner} is now ${rankLabel} / Lv. ${level}`
      : `${winner} moved up the Mechi climb`;

  return `${winner} beat ${loser} on ${game} on Mechi. ${climbLine}. Compete. Connect. Rise.`;
}

export function profileShareText(username: string, rankLabel: string, level: number) {
  return `${username} is climbing as ${rankLabel} / Lv. ${level} on Mechi. Think you can beat them?`;
}

export function inviteShareText(username: string) {
  return `${username} invited you to Mechi. Join free, compete fairly, and rise through the ladder.`;
}

export function tournamentShareText(
  title: string,
  game: string,
  entryFee: number,
  slotsLeft: number
) {
  const price = entryFee > 0 ? `KES ${entryFee.toLocaleString()} entry` : 'free entry';
  const slotCopy = slotsLeft === 1 ? '1 slot left' : `${slotsLeft} slots left`;
  return `${title} is live on Mechi. ${game}. ${price}. ${slotCopy}. Pull up and prove it.`;
}

export function getProfileShareStats(profile: Record<string, unknown>) {
  const games = (profile.selected_games as string[]) ?? [];
  let bestRating = 1000;
  let totalWins = 0;
  let totalLosses = 0;

  for (const game of games) {
    const rating = ((profile as Record<string, unknown>)[`rating_${game}`] as number) ?? 1000;
    const wins = ((profile as Record<string, unknown>)[`wins_${game}`] as number) ?? 0;
    const losses = ((profile as Record<string, unknown>)[`losses_${game}`] as number) ?? 0;

    if (rating > bestRating) {
      bestRating = rating;
    }

    totalWins += wins;
    totalLosses += losses;
  }

  return {
    games,
    bestRating,
    totalWins,
    totalLosses,
  };
}
