import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/content/[id]">) {
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
  ] as const;

  const updates: Record<string, unknown> = {};
  allowed.forEach((key) => {
    if (key in body) {
      updates[key] = body[key];
    }
  });

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
