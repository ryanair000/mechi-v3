import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getCommunityPageData } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  return NextResponse.json(await getCommunityPageData());
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.week_id || !body.snapshot_date) {
    return NextResponse.json({ error: "week_id and snapshot_date are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("community_snapshots")
    .upsert(
      {
        week_id: body.week_id,
        snapshot_date: body.snapshot_date,
        whatsapp_efootball: body.whatsapp_efootball ?? null,
        whatsapp_codm: body.whatsapp_codm ?? null,
        whatsapp_pubgm: body.whatsapp_pubgm ?? null,
        followers_tiktok: body.followers_tiktok ?? null,
        followers_instagram: body.followers_instagram ?? null,
        followers_twitter: body.followers_twitter ?? null,
        mechi_registered: body.mechi_registered ?? null,
        notes: body.notes ?? null,
      },
      { onConflict: "week_id" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
