import 'server-only';

import { isMissingTableError } from '@/lib/db-compat';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import type {
  PassportRecommendation,
  PassportRelationshipState,
  PassportSocialHub,
  PassportSocialProfile,
} from '@/lib/passport-social-types';

type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  country: string | null;
  region: string | null;
};

type FriendshipRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  requested_by: string;
  status: 'pending' | 'accepted' | 'declined';
};

export type SocialMutationResult =
  | { ok: true; state?: PassportRelationshipState }
  | { ok: false; error: string; status: number };

export function canonicalPassportPair(leftId: string, rightId: string) {
  const [userAId, userBId] = [leftId, rightId].sort();
  return { userAId, userBId, comparisonKey: `${userAId}:${userBId}` };
}

function emptyState(storageReady = true): PassportRelationshipState {
  return {
    storage_ready: storageReady,
    blocked: false,
    blocked_by_viewer: false,
    blocked_viewer: false,
    friendship_id: null,
    friendship_status: 'none',
    is_following: false,
    follows_viewer: false,
  };
}

function locationLabel(profile: ProfileRow) {
  return [profile.region, profile.country].filter(Boolean).join(', ');
}

async function loadSocialProfiles(userIds: string[]): Promise<Map<string, PassportSocialProfile>> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return new Map();
  const supabase = createServiceClient();
  const [{ data: profiles }, { data: passports }] = await Promise.all([
    supabase.from('profiles').select('id, username, avatar_url, country, region').in('id', ids),
    supabase.from('passport_profiles').select('user_id, public_handle, display_name, card_accent, archetypes')
      .in('user_id', ids).eq('publication_status', 'published'),
  ]);
  const passportById = new Map((passports ?? []).map((row) => [row.user_id as string, row]));
  return new Map(((profiles ?? []) as ProfileRow[]).map((profile) => {
    const passport = passportById.get(profile.id);
    if (!passport?.public_handle) return null;
    return [profile.id, {
      id: profile.id,
      username: String(passport.public_handle),
      display_name: String(passport?.display_name || profile.username),
      avatar_url: profile.avatar_url,
      card_accent: String(passport?.card_accent || '#32E0C4'),
      archetypes: Array.isArray(passport?.archetypes) ? passport.archetypes as string[] : [],
      location_label: locationLabel(profile),
    }];
  }).filter(Boolean) as Array<[string, PassportSocialProfile]>);
}

export async function getPassportSocialProfiles(userIds: string[]): Promise<PassportSocialProfile[]> {
  const profiles = await loadSocialProfiles(userIds);
  return userIds.map((id) => profiles.get(id)).filter(Boolean) as PassportSocialProfile[];
}

export async function hasPassportBlockBetween(leftId: string, rightId: string): Promise<boolean> {
  if (!leftId || !rightId || leftId === rightId) return false;
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from('passport_blocks')
    .select('blocker_id', { count: 'exact', head: true })
    .or(`and(blocker_id.eq.${leftId},blocked_id.eq.${rightId}),and(blocker_id.eq.${rightId},blocked_id.eq.${leftId})`);
  if (error) {
    if (!isMissingTableError(error, 'passport_blocks')) console.error('[Passport Social] Block lookup failed:', error);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function arePassportFriends(leftId: string, rightId: string): Promise<boolean> {
  const { userAId, userBId } = canonicalPassportPair(leftId, rightId);
  const { data, error } = await createServiceClient()
    .from('passport_friendships')
    .select('id')
    .eq('user_a_id', userAId)
    .eq('user_b_id', userBId)
    .eq('status', 'accepted')
    .maybeSingle();
  if (error && !isMissingTableError(error, 'passport_friendships')) {
    console.error('[Passport Social] Friendship lookup failed:', error);
  }
  return Boolean(data);
}

export async function getPassportRelationshipState(
  viewerId: string,
  targetId: string
): Promise<PassportRelationshipState> {
  if (viewerId === targetId) return emptyState();
  const { userAId, userBId } = canonicalPassportPair(viewerId, targetId);
  const supabase = createServiceClient();
  const [friendshipResult, followResult, reverseFollowResult, blockResult] = await Promise.all([
    supabase.from('passport_friendships').select('id, user_a_id, user_b_id, requested_by, status')
      .eq('user_a_id', userAId).eq('user_b_id', userBId).maybeSingle(),
    supabase.from('passport_follows').select('follower_id').eq('follower_id', viewerId).eq('followed_id', targetId).maybeSingle(),
    supabase.from('passport_follows').select('follower_id').eq('follower_id', targetId).eq('followed_id', viewerId).maybeSingle(),
    supabase.from('passport_blocks').select('blocker_id, blocked_id')
      .or(`and(blocker_id.eq.${viewerId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${viewerId})`),
  ]);
  if (friendshipResult.error && isMissingTableError(friendshipResult.error, 'passport_friendships')) return emptyState(false);
  const friendship = friendshipResult.data as FriendshipRow | null;
  const blocks = (blockResult.data ?? []) as Array<{ blocker_id: string; blocked_id: string }>;
  const blockedByViewer = blocks.some((row) => row.blocker_id === viewerId);
  const blockedViewer = blocks.some((row) => row.blocker_id === targetId);
  let friendshipStatus: PassportRelationshipState['friendship_status'] = 'none';
  if (friendship?.status === 'accepted') friendshipStatus = 'friends';
  else if (friendship?.status === 'declined') friendshipStatus = 'declined';
  else if (friendship?.status === 'pending') friendshipStatus = friendship.requested_by === viewerId ? 'outgoing' : 'incoming';
  return {
    storage_ready: true,
    blocked: blockedByViewer || blockedViewer,
    blocked_by_viewer: blockedByViewer,
    blocked_viewer: blockedViewer,
    friendship_id: friendship?.id ?? null,
    friendship_status: friendshipStatus,
    is_following: Boolean(followResult.data),
    follows_viewer: Boolean(reverseFollowResult.data),
  };
}

async function refreshSocialCounts(userIds: string[]) {
  const supabase = createServiceClient();
  await Promise.all([...new Set(userIds)].map(async (userId) => {
    const [friends, followers, following] = await Promise.all([
      supabase.from('passport_friendships').select('id', { count: 'exact', head: true })
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`).eq('status', 'accepted'),
      supabase.from('passport_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', userId),
      supabase.from('passport_follows').select('followed_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    await supabase.from('passport_profile_summaries').upsert({
      user_id: userId,
      friends_count: friends.count ?? 0,
      followers_count: followers.count ?? 0,
      following_count: following.count ?? 0,
    }, { onConflict: 'user_id' });
  }));
}

export async function mutatePassportFriendship(
  actorId: string,
  targetId: string,
  action: 'request' | 'accept' | 'decline' | 'remove'
): Promise<SocialMutationResult> {
  if (!targetId || actorId === targetId) return { ok: false, error: 'Pick another player', status: 400 };
  if (await hasPassportBlockBetween(actorId, targetId)) return { ok: false, error: 'This player is unavailable', status: 403 };
  const supabase = createServiceClient();
  const { userAId, userBId } = canonicalPassportPair(actorId, targetId);
  const { data: existing, error: lookupError } = await supabase.from('passport_friendships')
    .select('id, user_a_id, user_b_id, requested_by, status').eq('user_a_id', userAId).eq('user_b_id', userBId).maybeSingle();
  if (lookupError && isMissingTableError(lookupError, 'passport_friendships')) return { ok: false, error: 'Social storage is not ready', status: 503 };
  const row = existing as FriendshipRow | null;
  if (action === 'request') {
    if (row?.status === 'accepted') return { ok: false, error: 'You are already friends', status: 409 };
    const { error } = await supabase.from('passport_friendships').upsert({
      user_a_id: userAId, user_b_id: userBId, requested_by: actorId, status: 'pending', responded_at: null,
    }, { onConflict: 'user_a_id,user_b_id' });
    if (error) return { ok: false, error: 'Could not send friend request', status: 500 };
    const actor = (await loadSocialProfiles([actorId])).get(actorId);
    await createNotification({ user_id: targetId, type: 'friend_request_received', title: `${actor ? `@${actor.username}` : 'A player'} sent you a friend request`, href: '/passport/friends' }, supabase);
  } else if (action === 'accept') {
    if (!row || row.status !== 'pending' || row.requested_by === actorId) return { ok: false, error: 'No incoming friend request found', status: 409 };
    const { error } = await supabase.from('passport_friendships').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', row.id);
    if (error) return { ok: false, error: 'Could not accept friend request', status: 500 };
    const actor = (await loadSocialProfiles([actorId])).get(actorId);
    await createNotification({ user_id: targetId, type: 'friend_request_accepted', title: `${actor ? `@${actor.username}` : 'A player'} accepted your friend request`, href: actor ? `/@${actor.username}` : '/passport/friends' }, supabase);
  } else if (action === 'decline') {
    if (!row || row.status !== 'pending' || row.requested_by === actorId) return { ok: false, error: 'No incoming friend request found', status: 409 };
    await supabase.from('passport_friendships').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', row.id);
  } else {
    if (row) await supabase.from('passport_friendships').delete().eq('id', row.id);
  }
  await refreshSocialCounts([actorId, targetId]);
  return { ok: true, state: await getPassportRelationshipState(actorId, targetId) };
}

export async function mutatePassportFollow(actorId: string, targetId: string, follow: boolean): Promise<SocialMutationResult> {
  if (!targetId || actorId === targetId) return { ok: false, error: 'Pick another player', status: 400 };
  if (await hasPassportBlockBetween(actorId, targetId)) return { ok: false, error: 'This player is unavailable', status: 403 };
  const supabase = createServiceClient();
  const result = follow
    ? await supabase.from('passport_follows').upsert({ follower_id: actorId, followed_id: targetId })
    : await supabase.from('passport_follows').delete().eq('follower_id', actorId).eq('followed_id', targetId);
  if (result.error) return { ok: false, error: 'Could not update follow', status: 500 };
  if (follow) {
    const actor = (await loadSocialProfiles([actorId])).get(actorId);
    await createNotification({ user_id: targetId, type: 'passport_followed', title: `${actor ? `@${actor.username}` : 'A player'} followed your Gamer Passport`, href: actor ? `/@${actor.username}` : '/passport/friends' }, supabase);
  }
  await refreshSocialCounts([actorId, targetId]);
  return { ok: true, state: await getPassportRelationshipState(actorId, targetId) };
}

export async function mutatePassportBlock(actorId: string, targetId: string, block: boolean, reason?: string): Promise<SocialMutationResult> {
  if (!targetId || actorId === targetId) return { ok: false, error: 'Pick another player', status: 400 };
  const supabase = createServiceClient();
  if (block) {
    const { userAId, userBId } = canonicalPassportPair(actorId, targetId);
    const { error } = await supabase.from('passport_blocks').upsert({ blocker_id: actorId, blocked_id: targetId, reason_category: reason || null });
    if (error) return { ok: false, error: 'Could not block player', status: 500 };
    await Promise.all([
      supabase.from('passport_friendships').delete().eq('user_a_id', userAId).eq('user_b_id', userBId),
      supabase.from('passport_follows').delete().or(`and(follower_id.eq.${actorId},followed_id.eq.${targetId}),and(follower_id.eq.${targetId},followed_id.eq.${actorId})`),
      supabase.from('passport_game_recommendations').update({ status: 'dismissed', responded_at: new Date().toISOString() })
        .or(`and(sender_id.eq.${actorId},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${actorId})`).in('status', ['sent', 'seen']),
      supabase.from('match_challenges').update({ status: 'cancelled', responded_at: new Date().toISOString() })
        .or(`and(challenger_id.eq.${actorId},opponent_id.eq.${targetId}),and(challenger_id.eq.${targetId},opponent_id.eq.${actorId})`).eq('status', 'pending'),
    ]);
  } else {
    await supabase.from('passport_blocks').delete().eq('blocker_id', actorId).eq('blocked_id', targetId);
  }
  await refreshSocialCounts([actorId, targetId]);
  return { ok: true, state: await getPassportRelationshipState(actorId, targetId) };
}

export async function getPassportSocialHub(userId: string): Promise<PassportSocialHub> {
  const supabase = createServiceClient();
  const [friendships, following, followers, recommendations] = await Promise.all([
    supabase.from('passport_friendships').select('id, user_a_id, user_b_id, requested_by, status').or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`),
    supabase.from('passport_follows').select('followed_id').eq('follower_id', userId),
    supabase.from('passport_follows').select('follower_id').eq('followed_id', userId),
    supabase.from('passport_game_recommendations').select('id, sender_id, recipient_id, message, status, source_comparison_key, created_at, game:passport_game_catalog(id, slug, title, cover_url, release_year)').eq('recipient_id', userId).in('status', ['sent', 'seen']).order('created_at', { ascending: false }).limit(30),
  ]);
  if (friendships.error && isMissingTableError(friendships.error, 'passport_friendships')) {
    return { storage_ready: false, friends: [], incoming_requests: [], outgoing_requests: [], following: [], followers: [], recommendations: [], counts: { friends: 0, incoming: 0, following: 0, followers: 0, recommendations: 0 } };
  }
  const rows = (friendships.data ?? []) as FriendshipRow[];
  const counterpart = (row: FriendshipRow) => row.user_a_id === userId ? row.user_b_id : row.user_a_id;
  const ids = [
    ...rows.map(counterpart),
    ...(following.data ?? []).map((row) => String(row.followed_id)),
    ...(followers.data ?? []).map((row) => String(row.follower_id)),
    ...(recommendations.data ?? []).map((row) => String(row.sender_id)),
  ];
  const profiles = await loadSocialProfiles(ids);
  const mapRows = (selected: FriendshipRow[]) => selected.map((row) => profiles.get(counterpart(row))).filter(Boolean) as PassportSocialProfile[];
  const recommendationRows = (recommendations.data ?? []) as unknown as Array<PassportRecommendation & { game: PassportRecommendation['game'] | PassportRecommendation['game'][] }>;
  const mappedRecommendations = recommendationRows.flatMap((row) => {
    const sender = profiles.get(row.sender_id);
    const game = Array.isArray(row.game) ? row.game[0] : row.game;
    return sender && game ? [{ ...row, game, sender }] : [];
  });
  const friends = mapRows(rows.filter((row) => row.status === 'accepted'));
  const incoming = mapRows(rows.filter((row) => row.status === 'pending' && row.requested_by !== userId));
  const outgoing = mapRows(rows.filter((row) => row.status === 'pending' && row.requested_by === userId));
  const followingProfiles = (following.data ?? []).map((row) => profiles.get(String(row.followed_id))).filter(Boolean) as PassportSocialProfile[];
  const followerProfiles = (followers.data ?? []).map((row) => profiles.get(String(row.follower_id))).filter(Boolean) as PassportSocialProfile[];
  return {
    storage_ready: true, friends, incoming_requests: incoming, outgoing_requests: outgoing,
    following: followingProfiles, followers: followerProfiles, recommendations: mappedRecommendations,
    counts: { friends: friends.length, incoming: incoming.length, following: followingProfiles.length, followers: followerProfiles.length, recommendations: mappedRecommendations.length },
  };
}

export async function recommendPassportGame(senderId: string, recipientId: string, catalogGameId: string, message: string, comparisonKey?: string): Promise<SocialMutationResult> {
  if (!(await arePassportFriends(senderId, recipientId))) return { ok: false, error: 'Only friends can recommend games', status: 403 };
  if (await hasPassportBlockBetween(senderId, recipientId)) return { ok: false, error: 'This player is unavailable', status: 403 };
  const supabase = createServiceClient();
  const { error } = await supabase.from('passport_game_recommendations').insert({ sender_id: senderId, recipient_id: recipientId, catalog_game_id: catalogGameId, message: message.trim().slice(0, 240), source_comparison_key: comparisonKey || null });
  if (error) return { ok: false, error: error.code === '23505' ? 'That recommendation is already waiting' : 'Could not send recommendation', status: error.code === '23505' ? 409 : 500 };
  const [{ data: sender }, { data: game }] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', senderId).single(),
    supabase.from('passport_game_catalog').select('title').eq('id', catalogGameId).single(),
  ]);
  await createNotification({ user_id: recipientId, type: 'game_recommendation_received', title: `${sender?.username ?? 'A friend'} recommended ${game?.title ?? 'a game'}`, body: message.trim() || null, href: '/passport/friends' }, supabase);
  return { ok: true };
}

export async function respondToPassportRecommendation(userId: string, id: string, status: 'seen' | 'saved' | 'dismissed'): Promise<SocialMutationResult> {
  const { data, error } = await createServiceClient().from('passport_game_recommendations')
    .update({ status, seen_at: new Date().toISOString(), responded_at: status === 'seen' ? null : new Date().toISOString() })
    .eq('id', id).eq('recipient_id', userId).select('id').maybeSingle();
  if (error || !data) return { ok: false, error: 'Recommendation not found', status: 404 };
  return { ok: true };
}

export async function discoverPassportProfiles(viewerId: string, query: string, limit = 12): Promise<PassportSocialProfile[]> {
  const supabase = createServiceClient();
  const safe = query.trim().replace(/[%_,()]/g, '').slice(0, 40);
  let request = supabase.from('passport_profiles').select('user_id').neq('user_id', viewerId)
    .eq('publication_status', 'published').eq('is_discoverable', true)
    .eq('default_visibility', 'public').limit(Math.min(Math.max(limit, 1), 24));
  if (safe) request = request.ilike('public_handle', `%${safe}%`);
  const { data } = await request;
  const ids = (data ?? []).map((row) => String(row.user_id));
  if (!ids.length) return [];
  const { data: blocks } = await supabase.from('passport_blocks').select('blocker_id, blocked_id').or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);
  const blocked = new Set((blocks ?? []).map((row) => row.blocker_id === viewerId ? String(row.blocked_id) : String(row.blocker_id)));
  const profiles = await loadSocialProfiles(ids.filter((id) => !blocked.has(id)));
  return ids.map((id) => profiles.get(id)).filter(Boolean) as PassportSocialProfile[];
}

export async function createComparisonInvitation(creatorId: string, targetId: string, campaign?: string) {
  if (await hasPassportBlockBetween(creatorId, targetId)) return { data: null, error: 'This player is unavailable', status: 403 } as const;
  const supabase = createServiceClient();
  const { data: target } = await supabase.from('passport_profiles').select('public_handle').eq('user_id', targetId).eq('publication_status', 'published').single();
  if (!target) return { data: null, error: 'Player not found', status: 404 } as const;
  const { data, error } = await supabase.from('passport_comparison_invitations').insert({ creator_id: creatorId, target_user_id: targetId, target_username: target.public_handle, campaign: campaign?.slice(0, 100) || null }).select('token, expires_at').single();
  if (error) return { data: null, error: 'Could not create share link', status: 500 } as const;
  return { data: { token: String(data.token), expires_at: String(data.expires_at) }, error: null, status: 201 } as const;
}

export async function recordComparisonInvitationVisit(token: string, leftUsername: string, rightUsername: string) {
  const supabase = createServiceClient();
  const [leftResult, rightResult] = await Promise.all([
    supabase.from('passport_profiles').select('user_id').eq('public_handle', leftUsername.toLowerCase()).eq('publication_status', 'published').maybeSingle(),
    supabase.from('passport_profiles').select('user_id').eq('public_handle', rightUsername.toLowerCase()).eq('publication_status', 'published').maybeSingle(),
  ]);
  const ids = [leftResult.data?.user_id, rightResult.data?.user_id].filter(Boolean).map(String);
  if (ids.length !== 2) return false;
  const { comparisonKey } = canonicalPassportPair(ids[0], ids[1]);
  const { data } = await supabase.rpc('record_passport_comparison_invitation_visit', { p_token: token, p_left_user_id: ids[0], p_right_user_id: ids[1] });
  const invitationId = Array.isArray(data) ? data[0]?.invitation_id : null;
  if (!invitationId) return false;
  await supabase.from('passport_comparison_events').insert({ left_user_id: ids[0], right_user_id: ids[1], comparison_key: comparisonKey, event_type: 'invitation_visited', invitation_id: invitationId });
  return true;
}

export async function recordPassportComparisonEvent(actorId: string, targetId: string, eventType: 'viewed' | 'shared' | 'recommendation_sent' | 'challenge_started') {
  if (!targetId || actorId === targetId || await hasPassportBlockBetween(actorId, targetId)) return false;
  const { comparisonKey } = canonicalPassportPair(actorId, targetId);
  const { error } = await createServiceClient().from('passport_comparison_events').insert({
    actor_id: actorId,
    left_user_id: actorId,
    right_user_id: targetId,
    comparison_key: comparisonKey,
    event_type: eventType,
  });
  return !error;
}
