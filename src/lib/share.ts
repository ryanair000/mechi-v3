const BASE_URL =
  typeof window !== 'undefined' ? window.location.origin : 'https://mechi.club';

export interface ShareData {
  title: string;
  text: string;
  url: string;
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
  return `${BASE_URL}/s/match/${matchId}`;
}

export function getProfileShareUrl(username: string) {
  return `${BASE_URL}/s/${username}`;
}

export function getInviteUrl() {
  return `${BASE_URL}`;
}

export function getMatchOgImageUrl(matchId: string) {
  return `${BASE_URL}/api/og/match?id=${matchId}`;
}

export function getProfileOgImageUrl(username: string) {
  return `${BASE_URL}/api/og/profile?username=${username}`;
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
