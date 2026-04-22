import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getContentPageData } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  return NextResponse.json(await getContentPageData());
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.week_id || !body.scheduled_date || !body.title) {
    return NextResponse.json({ error: "Missing required content fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("content_items")
    .insert({
      week_id: body.week_id,
      scheduled_date: body.scheduled_date,
      day_type: body.day_type ?? "custom",
      title: body.title,
      description: body.description ?? null,
      notes: body.notes ?? null,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
