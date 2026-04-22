import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

function buildTournamentUpdates(body: Record<string, unknown>) {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {};

  if (body.payment_target === "first") {
    const paid = Boolean(body.paid);
    updates.first_place_paid = paid;
    updates.first_place_paid_at = paid ? now : null;
  }

  if (body.payment_target === "second") {
    const paid = Boolean(body.paid);
    updates.second_place_paid = paid;
    updates.second_place_paid_at = paid ? now : null;
  }

  const passthrough = [
    "game",
    "date",
    "prize_pool_kes",
    "status",
    "participant_count",
    "first_place_name",
    "first_place_phone",
    "first_place_kes",
    "second_place_name",
    "second_place_phone",
    "second_place_kes",
    "winner_screenshot_url",
    "notes",
  ] as const;

  passthrough.forEach((key) => {
    if (key in body) {
      updates[key] = body[key];
    }
  });

  if ("first_place_paid" in body) {
    updates.first_place_paid = Boolean(body.first_place_paid);
    updates.first_place_paid_at = body.first_place_paid ? now : null;
  }

  if ("second_place_paid" in body) {
    updates.second_place_paid = Boolean(body.second_place_paid);
    updates.second_place_paid_at = body.second_place_paid ? now : null;
  }

  return updates;
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/tournaments/[id]">) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as Record<string, unknown>;
  const updates = buildTournamentUpdates(body);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tournaments")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/tournaments/[id]">) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("tournaments").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
