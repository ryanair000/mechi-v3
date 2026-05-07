import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getCampaignWeeks } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  return NextResponse.json(await getCampaignWeeks());
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const { id, notes } = (await request.json()) as { id?: string; notes?: string };
  if (!id) {
    return NextResponse.json({ error: "Week id is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("campaign_weeks")
    .update({ notes: notes ?? null })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
