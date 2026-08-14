import "server-only";

import { passportActivityAudienceCeiling } from "@/lib/passport-access-policy";
import { isMissingTableError } from "@/lib/db-compat";
import {
  arePassportFriends,
  getPassportSocialProfiles,
  hasPassportBlockBetween,
} from "@/lib/passport-social";
import type {
  PassportActivityItem,
  PassportActivityPreferences,
  PassportActivityReaction,
  PassportGamingCircle,
  PassportHighlight,
  PassportHighlightSource,
  PassportPlayedTogether,
  TeamPassport,
  TeamPassportAchievementVerification,
} from "@/lib/passport-community-types";
import {
  DEFAULT_PASSPORT_FIELD_VISIBILITY,
  type PassportField,
  type PassportVisibility,
} from "@/lib/passport-types";
import { createServiceClient } from "@/lib/supabase";

const DEFAULT_PREFERENCES: PassportActivityPreferences = {
  share_game_completions: true,
  share_achievements: true,
  share_matches: true,
  share_events: true,
  share_teams: true,
  notify_reactions: true,
  notify_circle_updates: true,
};
const REACTIONS: PassportActivityReaction[] = ["gg", "fire", "clap", "trophy"];
type ActivitySeed = {
  actor_id: string;
  activity_type: string;
  source_type: string;
  source_id: string;
  audience: PassportVisibility;
  title: string;
  summary?: string;
  game?: string | null;
  team_id?: string | null;
  verification_token?: string | null;
  payload?: Record<string, unknown>;
  occurred_at: string;
  retracted_at: null;
};

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function normalizeVisibility(
  value: unknown,
  fallback: PassportVisibility = "private",
): PassportVisibility {
  return value === "friends" || value === "private" || value === "public"
    ? value
    : fallback;
}

function mostRestrictiveVisibility(
  ...values: PassportVisibility[]
): PassportVisibility {
  if (values.includes("private")) return "private";
  if (values.includes("friends")) return "friends";
  return "public";
}

export async function getPassportActivityPreferences(
  userId: string,
): Promise<PassportActivityPreferences> {
  const { data } = await createServiceClient()
    .from("passport_activity_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data
    ? (Object.fromEntries(
        Object.keys(DEFAULT_PREFERENCES).map((key) => [
          key,
          Boolean(data[key]),
        ]),
      ) as PassportActivityPreferences)
    : DEFAULT_PREFERENCES;
}

export async function updatePassportActivityPreferences(
  userId: string,
  input: PassportActivityPreferences,
) {
  const { error } = await createServiceClient()
    .from("passport_activity_preferences")
    .upsert({ user_id: userId, ...input }, { onConflict: "user_id" });
  return {
    ok: !error,
    error: error ? "Could not update activity controls" : null,
  };
}

export async function projectPassportActivity(userId: string) {
  const supabase = createServiceClient();
  const [preferences, profileResult] = await Promise.all([
    getPassportActivityPreferences(userId),
    supabase
      .from("passport_profiles")
      .select(
        "publication_status, default_visibility, field_visibility, is_discoverable",
      )
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const profile = profileResult.data;
  if (profile?.publication_status !== "published") {
    await supabase
      .from("passport_activity_objects")
      .update({ retracted_at: new Date().toISOString() })
      .eq("actor_id", userId)
      .is("retracted_at", null);
    return 0;
  }
  const defaultVisibility = passportActivityAudienceCeiling({
    publication_status:
      profile?.publication_status === "published" ? "published" : "draft",
    default_visibility: normalizeVisibility(profile?.default_visibility),
    is_discoverable: profile?.is_discoverable === true,
  });
  const fieldVisibility =
    profile?.field_visibility && typeof profile.field_visibility === "object"
      ? (profile.field_visibility as Record<string, unknown>)
      : {};
  const audienceFor = (
    field: PassportField,
    source: PassportVisibility = "public",
  ) =>
    mostRestrictiveVisibility(
      defaultVisibility,
      normalizeVisibility(
        fieldVisibility[field],
        DEFAULT_PASSPORT_FIELD_VISIBILITY[field],
      ),
      source,
    );
  const seeds: ActivitySeed[] = [];
  const [games, achievements, matches, events, teams] = await Promise.all([
    preferences.share_game_completions
      ? supabase
          .from("passport_game_entries")
          .select(
            "id, visibility, completed_on, updated_at, game:passport_game_catalog(title, slug)",
          )
          .eq("user_id", userId)
          .eq("play_status", "completed")
          .limit(100)
      : Promise.resolve({ data: [] }),
    preferences.share_achievements
      ? supabase
          .from("achievements")
          .select("id, achievement_key, unlocked_at")
          .eq("user_id", userId)
          .limit(100)
      : Promise.resolve({ data: [] }),
    preferences.share_matches
      ? supabase
          .from("matches")
          .select("id, game, winner_id, player1_id, player2_id, completed_at")
          .eq("status", "completed")
          .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
          .limit(100)
      : Promise.resolve({ data: [] }),
    preferences.share_events
      ? supabase
          .from("passport_event_credentials")
          .select(
            "id, event_title, stamp_type, game, verification_token, occurred_at",
          )
          .eq("user_id", userId)
          .eq("credential_state", "active")
          .limit(100)
      : Promise.resolve({ data: [] }),
    preferences.share_teams
      ? supabase
          .from("team_members")
          .select("id, team_id, joined_at, team:teams(name, visibility)")
          .eq("user_id", userId)
          .limit(50)
      : Promise.resolve({ data: [] }),
  ]);
  for (const row of games.data ?? []) {
    const game = relation(
      row.game as
        | { title: string; slug: string }
        | Array<{ title: string; slug: string }>
        | null,
    );
    if (game)
      seeds.push({
        actor_id: userId,
        activity_type: "game_completed",
        source_type: "game_entry",
        source_id: String(row.id),
        audience: audienceFor("games", normalizeVisibility(row.visibility)),
        title: `Completed ${game.title}`,
        game: game.slug,
        occurred_at: String(row.completed_on ?? row.updated_at),
        retracted_at: null,
      });
  }
  for (const row of achievements.data ?? [])
    seeds.push({
      actor_id: userId,
      activity_type: "achievement_unlocked",
      source_type: "achievement",
      source_id: String(row.id),
      audience: audienceFor("achievements"),
      title: String(row.achievement_key).replaceAll("_", " "),
      occurred_at: String(row.unlocked_at),
      retracted_at: null,
    });
  for (const row of matches.data ?? [])
    seeds.push({
      actor_id: userId,
      activity_type: "match_completed",
      source_type: "match",
      source_id: String(row.id),
      audience: audienceFor("competitive"),
      title:
        row.winner_id === userId
          ? `Won a verified ${row.game} match`
          : `Completed a verified ${row.game} match`,
      game: String(row.game),
      payload: {
        result:
          row.winner_id === userId ? "win" : row.winner_id ? "loss" : "draw",
      },
      occurred_at: String(row.completed_at),
      retracted_at: null,
    });
  for (const row of events.data ?? [])
    seeds.push({
      actor_id: userId,
      activity_type: "event_credential",
      source_type: "event_credential",
      source_id: String(row.id),
      audience: audienceFor("events"),
      title: `${row.event_title} · ${String(row.stamp_type).replace("_", " ")}`,
      game: row.game ? String(row.game) : null,
      verification_token: String(row.verification_token),
      occurred_at: String(row.occurred_at),
      retracted_at: null,
    });
  for (const row of teams.data ?? []) {
    const team = relation(
      row.team as
        | { name: string; visibility: string }
        | Array<{ name: string; visibility: string }>
        | null,
    );
    if (team)
      seeds.push({
        actor_id: userId,
        activity_type: "team_joined",
        source_type: "team_membership",
        source_id: String(row.id),
        audience: audienceFor(
          "teams",
          team.visibility === "public" ? "public" : "private",
        ),
        title: `Joined ${team.name}`,
        team_id: String(row.team_id),
        occurred_at: String(row.joined_at),
        retracted_at: null,
      });
  }
  await supabase
    .from("passport_activity_objects")
    .update({ retracted_at: new Date().toISOString() })
    .eq("actor_id", userId)
    .in("source_type", [
      "game_entry",
      "achievement",
      "match",
      "event_credential",
      "team_membership",
    ]);
  if (seeds.length)
    await supabase
      .from("passport_activity_objects")
      .upsert(seeds, {
        onConflict: "actor_id,activity_type,source_type,source_id",
      });
  return seeds.length;
}

export async function getPassportActivityFeed(
  viewerId: string,
  cursor?: string | null,
) {
  const supabase = createServiceClient();
  await projectPassportActivity(viewerId);
  const [{ data: follows }, { data: friendships }, { data: blocks }] =
    await Promise.all([
      supabase
        .from("passport_follows")
        .select("followed_id")
        .eq("follower_id", viewerId),
      supabase
        .from("passport_friendships")
        .select("user_a_id, user_b_id")
        .eq("status", "accepted")
        .or(`user_a_id.eq.${viewerId},user_b_id.eq.${viewerId}`),
      supabase
        .from("passport_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`),
    ]);
  const friendIds = (friendships ?? []).map((row) =>
    String(row.user_a_id === viewerId ? row.user_b_id : row.user_a_id),
  );
  const blocked = new Set(
    (blocks ?? [])
      .flatMap((row) => [String(row.blocker_id), String(row.blocked_id)])
      .filter((id) => id !== viewerId),
  );
  const actorIds = [
    ...new Set([
      viewerId,
      ...(follows ?? []).map((row) => String(row.followed_id)),
      ...friendIds,
    ]),
  ].filter((id) => !blocked.has(id));
  await Promise.all(
    actorIds
      .filter((id) => id !== viewerId)
      .slice(0, 20)
      .map((id) => projectPassportActivity(id)),
  );
  let query = supabase
    .from("passport_activity_objects")
    .select("*")
    .in("actor_id", actorIds)
    .eq("hidden_by_actor", false)
    .is("retracted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(30);
  if (cursor) query = query.lt("occurred_at", cursor);
  const { data, error } = await query;
  if (error)
    return {
      items: [] as PassportActivityItem[],
      next_cursor: null,
      storage_ready: !isMissingTableError(error, "passport_activity_objects"),
    };
  const visible = (data ?? []).filter(
    (row) =>
      row.actor_id === viewerId ||
      row.audience === "public" ||
      (row.audience === "friends" && friendIds.includes(String(row.actor_id))),
  );
  const ids = visible.map((row) => String(row.id));
  const [profiles, reactions] = await Promise.all([
    getPassportSocialProfiles([
      ...new Set(visible.map((row) => String(row.actor_id))),
    ]),
    ids.length
      ? supabase
          .from("passport_activity_reactions")
          .select("activity_id, user_id, reaction")
          .in("activity_id", ids)
      : Promise.resolve({ data: [] }),
  ]);
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const items = visible.flatMap((row) => {
    const actor = profileMap.get(String(row.actor_id));
    if (!actor) return [];
    const rows =
      reactions.data?.filter((reaction) => reaction.activity_id === row.id) ??
      [];
    return [
      {
        id: String(row.id),
        actor,
        activity_type: row.activity_type,
        source_type: String(row.source_type),
        source_id: String(row.source_id),
        audience: row.audience,
        title: String(row.title),
        summary: String(row.summary),
        game: row.game ? String(row.game) : null,
        team_id: row.team_id ? String(row.team_id) : null,
        verification_token: row.verification_token
          ? String(row.verification_token)
          : null,
        payload: row.payload ?? {},
        occurred_at: String(row.occurred_at),
        reaction_counts: Object.fromEntries(
          REACTIONS.map((reaction) => [
            reaction,
            rows.filter((item) => item.reaction === reaction).length,
          ]),
        ) as Record<PassportActivityReaction, number>,
        viewer_reaction:
          (rows.find((item) => item.user_id === viewerId)?.reaction as
            | PassportActivityReaction
            | undefined) ?? null,
        can_hide: String(row.actor_id) === viewerId,
      },
    ];
  });
  return {
    items,
    next_cursor: items.at(-1)?.occurred_at ?? null,
    storage_ready: true,
  };
}

export async function setPassportActivityReaction(
  activityId: string,
  userId: string,
  reaction: PassportActivityReaction,
) {
  const supabase = createServiceClient();
  const initial = await supabase
    .from("passport_activity_objects")
    .select("actor_id")
    .eq("id", activityId)
    .maybeSingle();
  if (initial.data?.actor_id)
    await projectPassportActivity(String(initial.data.actor_id));
  const { data: activity } = await supabase
    .from("passport_activity_objects")
    .select("actor_id, audience, hidden_by_actor, retracted_at")
    .eq("id", activityId)
    .maybeSingle();
  if (
    !activity ||
    activity.hidden_by_actor ||
    activity.retracted_at ||
    (await hasPassportBlockBetween(userId, String(activity.actor_id)))
  )
    return { ok: false, error: "Activity unavailable", status: 404 };
  if (activity.audience === "private" && activity.actor_id !== userId)
    return { ok: false, error: "Activity unavailable", status: 403 };
  if (
    activity.audience === "friends" &&
    activity.actor_id !== userId &&
    !(await arePassportFriends(userId, String(activity.actor_id)))
  )
    return { ok: false, error: "Activity unavailable", status: 403 };
  const { data, error } = await supabase.rpc("set_passport_activity_reaction", {
    p_activity_id: activityId,
    p_user_id: userId,
    p_reaction: reaction,
  });
  if (error)
    return {
      ok: false,
      error: error.message.includes("REACTION_RATE_LIMIT")
        ? "Reaction limit reached. Try again shortly."
        : "Could not react",
      status: error.message.includes("REACTION_RATE_LIMIT") ? 429 : 500,
    };
  const result = Array.isArray(data) ? data[0] : data;
  if (activity.actor_id !== userId && !result?.removed) {
    const preferences = await getPassportActivityPreferences(
      String(activity.actor_id),
    );
    if (preferences.notify_reactions)
      await supabase
        .from("notifications")
        .insert({
          user_id: activity.actor_id,
          type: "passport_activity_reaction",
          title: "New reaction on your gaming activity",
          body: `Someone reacted ${reaction.toUpperCase()} to your activity.`,
          href: "/feed",
          metadata: { activity_id: activityId, reaction },
        });
  }
  return { ok: true, data: result, error: null, status: 200 };
}

export async function hidePassportActivity(activityId: string, userId: string) {
  const { data } = await createServiceClient()
    .from("passport_activity_objects")
    .update({ hidden_by_actor: true })
    .eq("id", activityId)
    .eq("actor_id", userId)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}
export async function reportPassportActivity(
  activityId: string,
  reporterId: string,
  reason: string,
  details: string,
) {
  const supabase = createServiceClient();
  const initial = await supabase
    .from("passport_activity_objects")
    .select("actor_id")
    .eq("id", activityId)
    .maybeSingle();
  if (initial.data?.actor_id)
    await projectPassportActivity(String(initial.data.actor_id));
  const { data: activity } = await supabase
    .from("passport_activity_objects")
    .select("actor_id, audience, hidden_by_actor, retracted_at")
    .eq("id", activityId)
    .maybeSingle();
  if (
    !activity ||
    activity.actor_id === reporterId ||
    activity.hidden_by_actor ||
    activity.retracted_at ||
    (await hasPassportBlockBetween(reporterId, String(activity.actor_id)))
  )
    return { ok: false, error: "Activity unavailable" };
  if (
    activity.audience === "private" ||
    (activity.audience === "friends" &&
      !(await arePassportFriends(reporterId, String(activity.actor_id))))
  )
    return { ok: false, error: "Activity unavailable" };
  const { error } = await supabase
    .from("passport_activity_reports")
    .insert({
      activity_id: activityId,
      reporter_id: reporterId,
      reason,
      details: details.slice(0, 500),
    });
  return {
    ok: !error,
    error:
      error?.code === "23505"
        ? "Already reported"
        : error
          ? "Could not report activity"
          : null,
  };
}

export async function getPassportHighlights(
  userId: string,
  viewerId?: string | null,
): Promise<PassportHighlight[]> {
  const friend = Boolean(
    viewerId &&
      viewerId !== userId &&
      (await arePassportFriends(viewerId, userId)),
  );
  let query = createServiceClient()
    .from("passport_highlights")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("display_order")
    .order("created_at", { ascending: false });
  if (viewerId !== userId)
    query = friend
      ? query.in("visibility", ["public", "friends"])
      : query.eq("visibility", "public");
  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    source_type: String(row.source_type),
    source_id: String(row.source_id),
    title: String(row.title),
    caption: String(row.caption),
    media_url:
      row.media_consent && row.media_url ? String(row.media_url) : null,
    visibility: row.visibility,
    display_order: Number(row.display_order),
    created_at: String(row.created_at),
  }));
}

export async function savePassportHighlight(
  userId: string,
  input: {
    sourceType: string;
    sourceId: string;
    title: string;
    caption: string;
    mediaUrl?: string | null;
    mediaConsent?: boolean;
    visibility: string;
    displayOrder?: number;
  },
) {
  const mediaUrl = input.mediaUrl?.trim() || null;
  if (mediaUrl && (!input.mediaConsent || !mediaUrl.startsWith("https://")))
    return {
      ok: false,
      error: "Media needs explicit consent and an HTTPS URL",
    };
  const supabase = createServiceClient();
  let sourceExists = false;
  if (input.sourceType === "game_entry")
    sourceExists = Boolean(
      (
        await supabase
          .from("passport_game_entries")
          .select("id")
          .eq("id", input.sourceId)
          .eq("user_id", userId)
          .maybeSingle()
      ).data,
    );
  else if (input.sourceType === "achievement")
    sourceExists = Boolean(
      (
        await supabase
          .from("achievements")
          .select("id")
          .eq("id", input.sourceId)
          .eq("user_id", userId)
          .maybeSingle()
      ).data,
    );
  else if (input.sourceType === "match")
    sourceExists = Boolean(
      (
        await supabase
          .from("matches")
          .select("id")
          .eq("id", input.sourceId)
          .eq("status", "completed")
          .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
          .maybeSingle()
      ).data,
    );
  else if (input.sourceType === "event_credential")
    sourceExists = Boolean(
      (
        await supabase
          .from("passport_event_credentials")
          .select("id")
          .eq("id", input.sourceId)
          .eq("user_id", userId)
          .eq("credential_state", "active")
          .maybeSingle()
      ).data,
    );
  else if (input.sourceType === "team")
    sourceExists = Boolean(
      (
        await supabase
          .from("team_members")
          .select("id")
          .eq("team_id", input.sourceId)
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle()
      ).data,
    );
  if (!sourceExists)
    return { ok: false, error: "Verified highlight source not found" };
  const { error } = await supabase
    .from("passport_highlights")
    .upsert(
      {
        user_id: userId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        title: input.title.trim().slice(0, 120),
        caption: input.caption.trim().slice(0, 280),
        media_url: mediaUrl,
        media_consent: Boolean(input.mediaConsent),
        visibility: ["public", "friends", "private"].includes(input.visibility)
          ? input.visibility
          : "public",
        display_order: input.displayOrder ?? 0,
        is_active: true,
      },
      { onConflict: "user_id,source_type,source_id" },
    );
  return { ok: !error, error: error ? "Could not save highlight" : null };
}

export async function removePassportHighlight(
  userId: string,
  highlightId: string,
) {
  const { data } = await createServiceClient()
    .from("passport_highlights")
    .update({ is_active: false })
    .eq("id", highlightId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

export async function getPassportHighlightSources(
  userId: string,
): Promise<PassportHighlightSource[]> {
  const supabase = createServiceClient();
  const [games, achievements, matches, events, teams] = await Promise.all([
    supabase
      .from("passport_game_entries")
      .select("id, completed_on, updated_at, game:passport_game_catalog(title)")
      .eq("user_id", userId)
      .eq("play_status", "completed")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("achievements")
      .select("id, achievement_key, unlocked_at")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false })
      .limit(50),
    supabase
      .from("matches")
      .select("id, game, completed_at")
      .eq("status", "completed")
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase
      .from("passport_event_credentials")
      .select("id, event_title, stamp_type, occurred_at")
      .eq("user_id", userId)
      .eq("credential_state", "active")
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase
      .from("team_members")
      .select("team_id, joined_at, team:teams(name)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(20),
  ]);
  const sources: PassportHighlightSource[] = [];
  for (const row of games.data ?? []) {
    const game = relation(
      row.game as { title: string } | Array<{ title: string }> | null,
    );
    if (game)
      sources.push({
        source_type: "game_entry",
        source_id: String(row.id),
        label: `Completed ${game.title}`,
        occurred_at: String(row.completed_on ?? row.updated_at),
      });
  }
  for (const row of achievements.data ?? [])
    sources.push({
      source_type: "achievement",
      source_id: String(row.id),
      label: String(row.achievement_key).replaceAll("_", " "),
      occurred_at: String(row.unlocked_at),
    });
  for (const row of matches.data ?? [])
    sources.push({
      source_type: "match",
      source_id: String(row.id),
      label: `Verified ${row.game} match`,
      occurred_at: String(row.completed_at),
    });
  for (const row of events.data ?? [])
    sources.push({
      source_type: "event_credential",
      source_id: String(row.id),
      label: `${row.event_title} · ${String(row.stamp_type).replaceAll("_", " ")}`,
      occurred_at: String(row.occurred_at),
    });
  for (const row of teams.data ?? []) {
    const team = relation(
      row.team as { name: string } | Array<{ name: string }> | null,
    );
    if (team)
      sources.push({
        source_type: "team",
        source_id: String(row.team_id),
        label: `Team · ${team.name}`,
        occurred_at: String(row.joined_at),
      });
  }
  return sources.sort((left, right) =>
    right.occurred_at.localeCompare(left.occurred_at),
  );
}

export async function createGamingCircle(
  ownerId: string,
  name: string,
  description: string,
  memberIds: string[],
) {
  const supabase = createServiceClient();
  const ids = [...new Set([ownerId, ...memberIds])];
  const { data: circle, error } = await supabase
    .from("passport_gaming_circles")
    .insert({
      owner_id: ownerId,
      name: name.trim().slice(0, 60),
      description: description.trim().slice(0, 240),
    })
    .select("id")
    .single();
  if (error) return { circleId: null, error: "Could not create circle" };
  const result = await supabase.rpc("replace_passport_gaming_circle_members", {
    p_circle_id: circle.id,
    p_owner_id: ownerId,
    p_member_ids: ids,
  });
  if (result.error) {
    await supabase.from("passport_gaming_circles").delete().eq("id", circle.id);
    return {
      circleId: null,
      error: result.error.message.includes("MUST_BE_FRIENDS")
        ? "Circle members must be accepted friends"
        : "Gaming Circles need 3–8 members",
    };
  }
  const recipients = ids.filter((id) => id !== ownerId);
  if (recipients.length) {
    const { data: preferences } = await supabase
      .from("passport_activity_preferences")
      .select("user_id, notify_circle_updates")
      .in("user_id", recipients);
    const enabled = new Set(
      (preferences ?? [])
        .filter((row) => row.notify_circle_updates)
        .map((row) => String(row.user_id)),
    );
    const missing = recipients.filter(
      (id) => !(preferences ?? []).some((row) => row.user_id === id),
    );
    await supabase
      .from("notifications")
      .insert(
        [...enabled, ...missing].map((id) => ({
          user_id: id,
          type: "passport_circle_added",
          title: `Added to ${name.trim().slice(0, 60)}`,
          body: "A friend added you to a private Gaming Circle comparison.",
          href: "/passport/circles",
          metadata: { circle_id: circle.id },
        })),
      );
  }
  return { circleId: String(circle.id), error: null };
}

export async function getGamingCircles(
  ownerId: string,
): Promise<PassportGamingCircle[]> {
  const supabase = createServiceClient();
  const { data: memberships } = await supabase
    .from("passport_gaming_circle_members")
    .select("circle_id")
    .eq("user_id", ownerId);
  const circleIds = [
    ...new Set((memberships ?? []).map((row) => String(row.circle_id))),
  ];
  if (!circleIds.length) return [];
  const { data: circles } = await supabase
    .from("passport_gaming_circles")
    .select(
      "id, owner_id, name, description, created_at, members:passport_gaming_circle_members(user_id)",
    )
    .in("id", circleIds)
    .order("created_at", { ascending: false });
  return Promise.all(
    (circles ?? []).map(async (circle) => {
      const ids = (circle.members ?? []).map((member: { user_id: string }) =>
        String(member.user_id),
      );
      const [{ data: privacy }, members] = await Promise.all([
        supabase
          .from("passport_profiles")
          .select("user_id, default_visibility, field_visibility")
          .in("user_id", ids),
        getPassportSocialProfiles(ids),
      ]);
      const visibleCompetitiveIds = ids.filter((id) => {
        if (id === ownerId) return true;
        const profile = (privacy ?? []).find((row) => row.user_id === id);
        if (!profile) return true;
        const fields =
          profile.field_visibility &&
          typeof profile.field_visibility === "object"
            ? (profile.field_visibility as Record<string, unknown>)
            : {};
        return (
          normalizeVisibility(profile.default_visibility) !== "private" &&
          normalizeVisibility(
            fields.competitive,
            DEFAULT_PASSPORT_FIELD_VISIBILITY.competitive,
          ) !== "private"
        );
      });
      const { data: matches } = visibleCompetitiveIds.length
        ? await supabase
            .from("matches")
            .select("game, winner_id, player1_id, player2_id")
            .eq("status", "completed")
            .or(
              visibleCompetitiveIds
                .flatMap((id) => [`player1_id.eq.${id}`, `player2_id.eq.${id}`])
                .join(","),
            )
        : { data: [] };
      const stats = new Map<
        string,
        {
          game: string;
          players: Set<string>;
          total_matches: number;
          total_wins: number;
        }
      >();
      for (const match of matches ?? []) {
        const row = stats.get(String(match.game)) ?? {
          game: String(match.game),
          players: new Set<string>(),
          total_matches: 0,
          total_wins: 0,
        };
        row.total_matches += 1;
        if (visibleCompetitiveIds.includes(String(match.player1_id)))
          row.players.add(String(match.player1_id));
        if (visibleCompetitiveIds.includes(String(match.player2_id)))
          row.players.add(String(match.player2_id));
        if (visibleCompetitiveIds.includes(String(match.winner_id)))
          row.total_wins += 1;
        stats.set(row.game, row);
      }
      return {
        id: String(circle.id),
        owner_id: String(circle.owner_id),
        can_manage: String(circle.owner_id) === ownerId,
        name: String(circle.name),
        description: String(circle.description),
        members,
        comparison: [...stats.values()].map((row) => ({
          game: row.game,
          players: row.players.size,
          total_matches: row.total_matches,
          total_wins: row.total_wins,
        })),
        created_at: String(circle.created_at),
      };
    }),
  );
}

export async function getPassportPlayedTogether(
  userId: string,
): Promise<PassportPlayedTogether[]> {
  const { data } = await createServiceClient()
    .from("matches")
    .select("player1_id, player2_id, game, completed_at")
    .eq("status", "completed")
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .order("completed_at", { ascending: false })
    .limit(200);
  const map = new Map<
    string,
    { matches: number; latest_match_at: string; games: Set<string> }
  >();
  for (const match of data ?? []) {
    const id = String(
      match.player1_id === userId ? match.player2_id : match.player1_id,
    );
    const row = map.get(id) ?? {
      matches: 0,
      latest_match_at: String(match.completed_at),
      games: new Set<string>(),
    };
    row.matches += 1;
    row.games.add(String(match.game));
    map.set(id, row);
  }
  const ids = [...map.keys()];
  if (!ids.length) return [];
  const [profiles, { data: blocks }] = await Promise.all([
    getPassportSocialProfiles(ids),
    createServiceClient()
      .from("passport_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
  ]);
  const blocked = new Set(
    (blocks ?? [])
      .flatMap((row) => [String(row.blocker_id), String(row.blocked_id)])
      .filter((id) => id !== userId),
  );
  return profiles
    .filter((profile) => !blocked.has(profile.id))
    .map((player) => ({
      player,
      matches: map.get(player.id)?.matches ?? 0,
      latest_match_at: map.get(player.id)?.latest_match_at ?? "",
      games: [...(map.get(player.id)?.games ?? [])],
    }))
    .sort((left, right) => right.matches - left.matches)
    .slice(0, 20);
}

export async function getTeamPassport(
  slug: string,
  viewerId?: string | null,
): Promise<TeamPassport | null> {
  const supabase = createServiceClient();
  const { data: team } = await supabase
    .from("teams")
    .select(
      "id, slug, name, description, region, avatar_url, recruiting, visibility, owner_id",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!team) return null;
  const { data: viewerMembership } = viewerId
    ? await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", team.id)
        .eq("user_id", viewerId)
        .eq("status", "active")
        .maybeSingle()
    : { data: null };
  if (team.visibility === "private" && !viewerMembership) return null;
  const [
    { data: settings },
    { data: members },
    { data: tournaments },
    { data: achievements },
  ] = await Promise.all([
    supabase
      .from("team_passport_settings")
      .select("*")
      .eq("team_id", team.id)
      .maybeSingle(),
    supabase
      .from("team_members")
      .select(
        "user_id, role, status, joined_at, left_at, profile:profiles(avatar_url)",
      )
      .eq("team_id", team.id)
      .order("joined_at"),
    supabase
      .from("tournament_team_entries")
      .select(
        "joined_at, check_in_status, tournament:tournaments(id, slug, title, game, status)",
      )
      .eq("team_id", team.id)
      .in("payment_status", ["paid", "free"])
      .order("joined_at", { ascending: false }),
    supabase
      .from("team_passport_achievements")
      .select(
        "id, verification_token, title, description, game, source_type, occurred_at",
      )
      .eq("team_id", team.id)
      .eq("state", "active")
      .order("occurred_at", { ascending: false }),
  ]);
  const tournamentRows = (tournaments ?? []).flatMap((row) => {
    const tournament = relation(
      row.tournament as
        | {
            id: string;
            slug: string;
            title: string;
            game: string;
            status: string;
          }
        | Array<{
            id: string;
            slug: string;
            title: string;
            game: string;
            status: string;
          }>
        | null,
    );
    return tournament
      ? [
          {
            ...tournament,
            joined_at: String(row.joined_at),
            check_in_status: String(row.check_in_status),
          },
        ]
      : [];
  });
  const memberIds = (members ?? [])
    .filter((member) => member.status === "active")
    .map((member) => String(member.user_id));
  let completed = 0;
  let wins = 0;
  if (memberIds.length) {
    const { data: matchRows } = await supabase
      .from("matches")
      .select("winner_id, player1_id, player2_id")
      .eq("status", "completed")
      .or(
        memberIds
          .flatMap((id) => [`player1_id.eq.${id}`, `player2_id.eq.${id}`])
          .join(","),
      );
    completed = matchRows?.length ?? 0;
    wins = (matchRows ?? []).filter((match) =>
      memberIds.includes(String(match.winner_id)),
    ).length;
  }
  const allMemberIds = (members ?? []).map((member) => String(member.user_id));
  const { data: publishedMembers } = allMemberIds.length
    ? await supabase
        .from("passport_profiles")
        .select("user_id, public_handle")
        .in("user_id", allMemberIds)
        .eq("publication_status", "published")
    : { data: [] };
  const publicHandleById = new Map(
    (publishedMembers ?? []).map((row) => [
      String(row.user_id),
      String(row.public_handle),
    ]),
  );
  return {
    id: String(team.id),
    slug: String(team.slug),
    name: String(team.name),
    description: team.description,
    region: String(team.region),
    avatar_url: team.avatar_url,
    recruiting: Boolean(team.recruiting),
    recruitment_status:
      settings?.recruitment_status ?? (team.recruiting ? "open" : "closed"),
    recruitment_headline: settings?.recruitment_headline ?? "",
    contact_url: settings?.contact_url ?? null,
    card_accent: settings?.card_accent ?? "#32E0C4",
    supported_games: settings?.supported_games ?? [],
    members: (members ?? []).flatMap((member) => {
      const publicHandle = publicHandleById.get(String(member.user_id));
      if (!publicHandle) return [];
      const profile = relation(
        member.profile as
          | { avatar_url: string | null }
          | Array<{ avatar_url: string | null }>
          | null,
      );
      return [
        {
          user_id: String(member.user_id),
          username: publicHandle,
          avatar_url: profile?.avatar_url ?? null,
          role: String(member.role),
          status: String(member.status),
          joined_at: String(member.joined_at),
          left_at: member.left_at ? String(member.left_at) : null,
        },
      ];
    }),
    tournaments: tournamentRows,
    achievements: (achievements ?? []).map((row) => ({
      ...row,
      id: String(row.id),
      verification_token: String(row.verification_token),
      title: String(row.title),
      description: String(row.description),
      game: row.game ? String(row.game) : null,
      source_type: String(row.source_type),
      occurred_at: String(row.occurred_at),
    })),
    match_summary: { completed, wins },
    can_manage: Boolean(
      viewerId &&
        (team.owner_id === viewerId ||
          ["captain"].includes(String(viewerMembership?.role))),
    ),
    generated_at: new Date().toISOString(),
  };
}

export async function getTeamPassportAchievementByToken(
  token: string,
): Promise<TeamPassportAchievementVerification | null> {
  const { data } = await createServiceClient()
    .from("team_passport_achievements")
    .select(
      "id, verification_token, team_id, title, description, game, source_type, source_key, occurred_at, state, revoked_at, revocation_reason, created_at, team:teams(name, slug)",
    )
    .eq("verification_token", token)
    .maybeSingle();
  if (!data) return null;
  const team = relation(
    data.team as
      | { name: string; slug: string }
      | Array<{ name: string; slug: string }>
      | null,
  );
  if (!team) return null;
  return {
    id: String(data.id),
    verification_token: String(data.verification_token),
    team_id: String(data.team_id),
    team_name: team.name,
    team_slug: team.slug,
    title: String(data.title),
    description: String(data.description),
    game: data.game ? String(data.game) : null,
    source_type: String(data.source_type),
    source_key: String(data.source_key),
    occurred_at: String(data.occurred_at),
    state: data.state === "revoked" ? "revoked" : "active",
    revoked_at: data.revoked_at ? String(data.revoked_at) : null,
    revocation_reason: data.revocation_reason
      ? String(data.revocation_reason)
      : null,
    issued_at: String(data.created_at),
  };
}

export async function issueTeamPassportAchievement(input: {
  teamId: string;
  title: string;
  description: string;
  game: string | null;
  sourceType:
    | "tournament"
    | "match_series"
    | "organizer_manual"
    | "mechi_admin";
  sourceKey: string;
  occurredAt: string;
  issuedBy: string;
}) {
  const { data, error } = await createServiceClient()
    .from("team_passport_achievements")
    .upsert(
      {
        team_id: input.teamId,
        title: input.title.trim().slice(0, 120),
        description: input.description.trim().slice(0, 500),
        game: input.game,
        source_type: input.sourceType,
        source_key: input.sourceKey,
        occurred_at: input.occurredAt,
        issued_by: input.issuedBy,
        state: "active",
        revoked_at: null,
        revoked_by: null,
        revocation_reason: null,
      },
      { onConflict: "team_id,source_type,source_key" },
    )
    .select("id, verification_token")
    .single();
  return {
    achievement: data,
    error: error ? "Could not issue team achievement" : null,
  };
}

export async function revokeTeamPassportAchievement(
  id: string,
  actorId: string,
  reason: string,
) {
  const { data, error } = await createServiceClient()
    .from("team_passport_achievements")
    .update({
      state: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: actorId,
      revocation_reason: reason.trim().slice(0, 300),
    })
    .eq("id", id)
    .eq("state", "active")
    .select("id")
    .maybeSingle();
  return {
    revoked: Boolean(data),
    error: error
      ? "Could not revoke team achievement"
      : !data
        ? "Active team achievement not found"
        : null,
  };
}
