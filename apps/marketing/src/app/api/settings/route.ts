import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getMarketingSettings } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  return NextResponse.json(await getMarketingSettings());
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const body = (await request.json()) as Record<string, unknown>;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("marketing_settings")
    .upsert(
      {
        singleton: true,
        total_budget_kes: Number(body.total_budget_kes ?? 15000),
        meta_budget_kes: Number(body.meta_budget_kes ?? 8000),
        tiktok_budget_kes: Number(body.tiktok_budget_kes ?? 5000),
        twitter_budget_kes: Number(body.twitter_budget_kes ?? 2000),
      },
      { onConflict: "singleton" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
