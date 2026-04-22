import { AUTO_CONTENT_TEMPLATES, CAMPAIGN_WEEKS, DEFAULT_SETTINGS, WEEK_ONE_BOUNTIES } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase";
import type { CampaignWeek } from "@/lib/types";
import { addDays, formatGameLabel } from "@/lib/utils";

function buildAutoContentTitle(week: CampaignWeek, dayType: string) {
  const gameLabel = formatGameLabel(week.tournament_game);

  if (dayType === "monday_announce") {
    return `Week ${week.week_number} ${gameLabel} tournament is live`;
  }

  if (dayType === "thursday_countdown") {
    return `Week ${week.week_number} ${gameLabel} countdown starts now`;
  }

  return `Week ${week.week_number} ${gameLabel} winners recap`;
}

export async function runSeed() {
  const supabase = createServiceClient();

  await supabase.from("campaign_weeks").upsert(CAMPAIGN_WEEKS, {
    onConflict: "week_number",
    ignoreDuplicates: false,
  });

  const { data: weeksRaw } = await supabase
    .from("campaign_weeks")
    .select("*")
    .order("week_number");

  const weeks = ((weeksRaw ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    week_number: Number(row.week_number),
    week_start: String(row.week_start),
    week_end: String(row.week_end),
    tournament_game: String(row.tournament_game) as CampaignWeek["tournament_game"],
    notes: typeof row.notes === "string" ? row.notes : null,
  }));

  for (const week of weeks) {
    const { data: existingTournament } = await supabase
      .from("tournaments")
      .select("id")
      .eq("week_id", week.id)
      .maybeSingle();

    if (!existingTournament) {
      await supabase.from("tournaments").insert({
        week_id: week.id,
        game: week.tournament_game,
        date: addDays(week.week_start, 4),
        prize_pool_kes: 1000,
        status: "upcoming",
        first_place_kes: 700,
        second_place_kes: 300,
      });
    }

    const { data: existingAutoItems } = await supabase
      .from("content_items")
      .select("day_type")
      .eq("week_id", week.id);

    const existingTypes = new Set((existingAutoItems ?? []).map((item) => String(item.day_type)));
    const missingItems = AUTO_CONTENT_TEMPLATES.filter(
      (template) => !existingTypes.has(template.day_type),
    ).map((template) => ({
      week_id: week.id,
      scheduled_date: addDays(week.week_start, template.day_offset),
      day_type: template.day_type,
      title: buildAutoContentTitle(week, template.day_type),
      description: template.description,
    }));

    if (missingItems.length > 0) {
      await supabase.from("content_items").insert(missingItems);
    }
  }

  await supabase.from("marketing_settings").upsert(
    {
      singleton: true,
      ...DEFAULT_SETTINGS,
    },
    { onConflict: "singleton" },
  );

  const weekOne = weeks.find((week) => week.week_number === 1);
  let insertedBounties = 0;

  if (weekOne) {
    const { data: existingBounties } = await supabase
      .from("bounties")
      .select("title")
      .eq("week_id", weekOne.id);

    const existingTitles = new Set((existingBounties ?? []).map((item) => String(item.title)));
    const newBounties = WEEK_ONE_BOUNTIES.filter(
      (bounty) => !existingTitles.has(bounty.title),
    ).map((bounty) => ({
      week_id: weekOne.id,
      title: bounty.title,
      description: bounty.description,
      trigger_label: bounty.trigger_label,
      game: bounty.game,
      prize_kes: bounty.prize_kes,
      status: "draft",
    }));

    if (newBounties.length > 0) {
      insertedBounties = newBounties.length;
      await supabase.from("bounties").insert(newBounties);
    }
  }

  return {
    weeksSeeded: weeks.length,
    bountiesInserted: insertedBounties,
  };
}
