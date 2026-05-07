const TOURNAMENT_CHECK_IN_LEAD_MS = 60 * 60 * 1000;

const DEFAULT_TOURNAMENT_DATE_TIME_OPTIONS = {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
} satisfies Intl.DateTimeFormatOptions;

export function parseTournamentSchedule(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTournamentDateTime(
  value: string | Date | null | undefined,
  fallback = 'TBA',
  options: Intl.DateTimeFormatOptions = DEFAULT_TOURNAMENT_DATE_TIME_OPTIONS,
  locale = 'en-KE'
): string {
  const date = parseTournamentSchedule(value);
  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function getTournamentCheckInDate(
  value: string | Date | null | undefined
): Date | null {
  const scheduledAt = parseTournamentSchedule(value);
  if (!scheduledAt) {
    return null;
  }

  return new Date(scheduledAt.getTime() - TOURNAMENT_CHECK_IN_LEAD_MS);
}

export function toDateTimeLocalValue(date: Date): string {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export function getDefaultTournamentScheduleValue(): string {
  const date = new Date(Date.now() + 2 * TOURNAMENT_CHECK_IN_LEAD_MS);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return toDateTimeLocalValue(date);
}
