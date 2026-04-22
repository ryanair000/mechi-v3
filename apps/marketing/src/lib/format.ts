import { formatGameLabel, parseDate } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-KE");
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatKes(value: number | null | undefined) {
  return `KES ${currencyFormatter.format(value ?? 0)}`;
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";
  return shortDateFormatter.format(parseDate(value));
}

export function formatLongDate(value: string | null | undefined) {
  if (!value) return "-";
  return longDateFormatter.format(parseDate(value));
}

export function formatDateRange(start: string, end: string) {
  return `${formatShortDate(start)} - ${formatLongDate(end)}`;
}

export function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDayTypeLabel(dayType: string) {
  const labels: Record<string, string> = {
    monday_announce: "Monday announce",
    thursday_countdown: "Thursday countdown",
    saturday_winner: "Saturday winner",
    wednesday_bounty_update: "Wednesday bounty update",
    custom: "Custom",
  };
  return labels[dayType] ?? formatStatusLabel(dayType);
}

export function formatCountdownLabel(date: string) {
  const tournamentDate = parseDate(date).getTime();
  const today = new Date();
  const utcToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const days = Math.ceil((tournamentDate - utcToday) / 86_400_000);

  if (days > 1) return `${days} days to Friday tournament`;
  if (days === 1) return "1 day to Friday tournament";
  if (days === 0) return "Tournament day";
  if (days === -1) return "Tournament was yesterday";
  return `${Math.abs(days)} days since tournament day`;
}

export function formatWinnerLabel(name: string | null | undefined, game: string | null | undefined) {
  if (!name) return "Pending winner";
  return `${name} - ${formatGameLabel(game)}`;
}
