import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getTournamentsPageData } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  return NextResponse.json(await getTournamentsPageData());
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const body = (await request.json()) as Record<string, unknown>;
  const weekId = String(body.week_id ?? "");

  if (!weekId) {
    return NextResponse.json({ error: "week_id is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      week_id: weekId,
      game: body.game,
      date: body.date,
      prize_pool_kes: Number(body.prize_pool_kes ?? 1000),
      status: body.status ?? "upcoming",
      first_place_kes: Number(body.first_place_kes ?? 700),
      second_place_kes: Number(body.second_place_kes ?? 300),
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
