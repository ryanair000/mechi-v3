import type { ContentItem } from "@/lib/types";

export function toContentItem(row: Record<string, unknown>): ContentItem {
  return {
    id: String(row.id),
    week_id: String(row.week_id),
    scheduled_date: String(row.scheduled_date),
    day_type: String(row.day_type) as ContentItem["day_type"],
    title: String(row.title),
    description: typeof row.description === "string" ? row.description : null,
    posted_tiktok: Boolean(row.posted_tiktok),
    posted_instagram: Boolean(row.posted_instagram),
    posted_twitter: Boolean(row.posted_twitter),
    posted_whatsapp: Boolean(row.posted_whatsapp),
    notes: typeof row.notes === "string" ? row.notes : null,
    twitter_post_text: typeof row.twitter_post_text === "string" ? row.twitter_post_text : null,
    twitter_post_id: typeof row.twitter_post_id === "string" ? row.twitter_post_id : null,
    twitter_post_url: typeof row.twitter_post_url === "string" ? row.twitter_post_url : null,
    twitter_last_error:
      typeof row.twitter_last_error === "string" ? row.twitter_last_error : null,
    twitter_posted_at:
      typeof row.twitter_posted_at === "string" ? row.twitter_posted_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}
