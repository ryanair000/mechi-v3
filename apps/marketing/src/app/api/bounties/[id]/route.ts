import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/bounties/[id]">) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as Record<string, unknown>;
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  if (body.rollover_to_week_id) {
    const { data: currentBounty, error: currentError } = await supabase
      .from("bounties")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (currentError || !currentBounty) {
      return NextResponse.json({ error: currentError?.message ?? "Bounty not found" }, { status: 404 });
    }

    const { data: newBounty, error: insertError } = await supabase
      .from("bounties")
      .insert({
        week_id: body.rollover_to_week_id,
        title: currentBounty.title,
        description: currentBounty.description,
        trigger_label: currentBounty.trigger_label,
        game: currentBounty.game,
        prize_kes: currentBounty.prize_kes,
        status: "draft",
        rolled_over_from_bounty_id: id,
      })
      .select("*")
      .maybeSingle();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("bounties")
      .update({
        status: body.status ?? "cancelled",
        rolled_over_to_week_id: body.rollover_to_week_id,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, bounty: newBounty });
  }

  const updates: Record<string, unknown> = {};
  const passthrough = [
    "title",
    "description",
    "trigger_label",
    "game",
    "prize_kes",
    "winner_name",
    "winner_phone",
    "notes",
  ] as const;

  passthrough.forEach((key) => {
    if (key in body) {
      updates[key] = body[key];
    }
  });

  if ("status" in body) {
    updates.status = body.status;
    if (body.status === "claimed") {
      updates.claimed_at = now;
    }
    if (body.status === "active") {
      updates.activated_at = now;
    }
  }

  if ("paid" in body) {
    updates.paid = Boolean(body.paid);
    updates.paid_at = body.paid ? now : null;
  }

  const { data, error } = await supabase
    .from("bounties")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
