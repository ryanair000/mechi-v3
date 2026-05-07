export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDays(value: string, days: number) {
  const next = parseDate(value);
  next.setUTCDate(next.getUTCDate() + days);
  return toDateString(next);
}

export function startOfTodayUtc() {
  return parseDate(toDateString(new Date()));
}

export function diffInDays(start: string, end: string) {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000);
}

export function formatGameLabel(game: string | null | undefined) {
  if (game === "codm") return "CODM";
  if (game === "pubgm") return "PUBGM";
  if (game === "efootball") return "eFootball";
  return game ?? "Platform";
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
