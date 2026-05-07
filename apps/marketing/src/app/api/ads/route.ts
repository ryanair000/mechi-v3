import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getAdsPageData } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  return NextResponse.json(await getAdsPageData());
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.week_id || !body.platform || !body.date) {
    return NextResponse.json({ error: "Missing required ad spend fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ad_spend_entries")
    .insert({
      week_id: body.week_id,
      platform: body.platform,
      amount_kes: Number(body.amount_kes ?? 0),
      description: body.description ?? null,
      date: body.date,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Ad spend id is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("ad_spend_entries").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
