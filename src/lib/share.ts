const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://mechi-v3.vercel.app';

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

/** Share to WhatsApp with text + link */
export function shareToWhatsApp(text: string, url: string) {
  const msg = `${text}\n\n${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

/** Copy link to clipboard */
export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/** Use native Web Share API (mobile) */
export async function nativeShare(data: ShareData): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

/** Check if Web Share API is available */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/** Download an image from a URL (for Instagram stories) */
export function downloadImage(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

// ── Share URL builders ──

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

// ── Pre-built share messages ──

export function matchResultShareText(
  winner: string, loser: string, game: string, ratingChange: number
) {
  const sign = ratingChange >= 0 ? '+' : '';
  return `${winner} beat ${loser} on ${game} (${sign}${ratingChange} ELO) on Mechi - Kenya's gaming matchmaking platform!`;
}

export function profileShareText(username: string, tier: string, bestRating: number) {
  return `${username} is ranked ${tier} (${bestRating} ELO) on Mechi - Kenya's gaming matchmaking platform! Think you can beat them?`;
}

export function inviteShareText(username: string) {
  return `${username} invited you to Mechi - Kenya's #1 gaming matchmaking platform. Join free and compete in 1v1 ranked matches!`;
}
