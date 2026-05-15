import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as Record<string, unknown>;
  const allowed = [
    "scheduled_date",
    "day_type",
    "title",
    "description",
    "posted_tiktok",
    "posted_instagram",
    "posted_twitter",
    "posted_whatsapp",
    "notes",
    "twitter_post_text",
  ] as const;

  const updates: Record<string, unknown> = {};
  allowed.forEach((key) => {
    if (key in body) {
      updates[key] = body[key];
    }
  });

  if ("twitter_post_text" in updates && typeof updates.twitter_post_text === "string") {
    const nextValue = updates.twitter_post_text.trim();
    updates.twitter_post_text = nextValue ? nextValue : null;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("content_items")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
