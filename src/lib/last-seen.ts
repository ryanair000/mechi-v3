import { getNairobiDateStamp } from '@/lib/gamification';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDateStamp(dateStamp: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStamp.trim());
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

export function formatLastSeen(lastMatchDate?: string | null, now = new Date()): string {
  if (!lastMatchDate) {
    return 'No matches yet';
  }

  const lastSeenMs = parseDateStamp(lastMatchDate);
  if (lastSeenMs === null) {
    return 'No matches yet';
  }

  const todayMs = parseDateStamp(getNairobiDateStamp(now));
  if (todayMs === null) {
    return 'No matches yet';
  }

  const dayDiff = Math.floor((todayMs - lastSeenMs) / DAY_IN_MS);

  if (dayDiff <= 0) {
    return 'Last seen today';
  }

  if (dayDiff === 1) {
    return 'Last seen yesterday';
  }

  return `Last seen ${dayDiff} days ago`;
}
