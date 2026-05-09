import type { ContentItem, DayType } from "@/lib/types";

export const MAX_X_POST_LENGTH = 280;

const PLAYMECHI_PUBLIC_URL = "https://mechi.club/playmechi";
const PLAYMECHI_REGISTER_URL = "https://mechi.club/playmechi/register";
const DEFAULT_HASHTAGS = "#PlayMechi #MechiClub";

type XDraftContent = Pick<
  ContentItem,
  "day_type" | "title" | "description" | "twitter_post_text"
>;

function normalizeLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function composePost(lines: string[]) {
  return lines.filter(Boolean).join("\n\n").trim();
}

function trimToLength(value: string, maxLength: number) {
  if (maxLength <= 0) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function getDayTypeCta(dayType: DayType) {
  switch (dayType) {
    case "monday_announce":
      return `Register now: ${PLAYMECHI_REGISTER_URL}`;
    case "thursday_countdown":
      return `Lock in your slot: ${PLAYMECHI_REGISTER_URL}`;
    case "saturday_winner":
      return `Catch the tournament desk: ${PLAYMECHI_PUBLIC_URL}`;
    case "wednesday_bounty_update":
      return `Pull up on PlayMechi: ${PLAYMECHI_PUBLIC_URL}`;
    case "custom":
    default:
      return `Join the run: ${PLAYMECHI_PUBLIC_URL}`;
  }
}

function buildGeneratedPost(item: Omit<XDraftContent, "twitter_post_text">) {
  const title = normalizeLine(item.title);
  const description = normalizeLine(item.description ?? "");
  const cta = getDayTypeCta(item.day_type);
  const footer = composePost([cta, DEFAULT_HASHTAGS]);
  const compact = composePost([title, footer]);

  if (!description) {
    return trimToLength(compact, MAX_X_POST_LENGTH);
  }

  const full = composePost([title, description, cta, DEFAULT_HASHTAGS]);
  if (full.length <= MAX_X_POST_LENGTH) {
    return full;
  }

  const separatorLength = "\n\n".length;
  const remainingForTitle = MAX_X_POST_LENGTH - footer.length - separatorLength;
  const safeTitle = trimToLength(title, remainingForTitle);
  const baseWithoutDescription = composePost([safeTitle, footer]);

  if (baseWithoutDescription.length >= MAX_X_POST_LENGTH) {
    return trimToLength(baseWithoutDescription, MAX_X_POST_LENGTH);
  }

  const remainingForDescription =
    MAX_X_POST_LENGTH - baseWithoutDescription.length - separatorLength;
  const safeDescription = trimToLength(description, remainingForDescription);

  return composePost([safeTitle, safeDescription, cta, DEFAULT_HASHTAGS]);
}

export function sanitizePostText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => normalizeLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildXPostText(item: XDraftContent) {
  const manualText = item.twitter_post_text?.trim();
  if (manualText) {
    return sanitizePostText(manualText);
  }

  return buildGeneratedPost(item);
}
