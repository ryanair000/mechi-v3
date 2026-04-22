import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getBountiesPageData } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  return NextResponse.json(await getBountiesPageData());
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const body = (await request.json()) as Record<string, unknown>;
  const weekId = String(body.week_id ?? "");

  if (!weekId || !body.title || !body.description || !body.trigger_label) {
    return NextResponse.json({ error: "Missing required bounty fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bounties")
    .insert({
      week_id: weekId,
      title: body.title,
      description: body.description,
      trigger_label: body.trigger_label,
      game: body.game ?? null,
      prize_kes: Number(body.prize_kes ?? 50),
      status: body.status ?? "draft",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
