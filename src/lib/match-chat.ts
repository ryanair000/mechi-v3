import { GAMES, PLATFORMS, getCanonicalGameKey } from '@/lib/config';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import type {
  Match,
  MatchChatMessage,
  MatchChatMessageType,
  MatchChatThreadState,
  Profile,
} from '@/types';

export const MATCH_CHAT_MESSAGE_MAX_LENGTH = 280;
const MATCH_CHAT_NOTIFICATION_ACTIVE_WINDOW_MS = 60 * 1000;

type MatchReadRow = {
  match_id: string;
  user_id: string;
  last_read_at?: string | null;
  last_notified_at?: string | null;
  created_at: string;
  updated_at: string;
};

type MatchChatRow = {
  id: string;
  match_id: string;
  sender_user_id?: string | null;
  sender_type: MatchChatMessage['sender_type'];
  message_type: MatchChatMessage['message_type'];
  body?: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
};

type MatchAccessRow = Pick<
  Match,
  'id' | 'player1_id' | 'player2_id' | 'game' | 'platform' | 'status' | 'created_at'
>;

type MatchChatAccessResult =
  | { ok: true; match: MatchAccessRow }
  | { ok: false; reason: 'not_found' | 'forbidden' };

function getSupabase() {
  return createServiceClient();
}

function buildMatchChatSeedMessage(match: MatchAccessRow) {
  const game = GAMES[getCanonicalGameKey(match.game)]?.label ?? 'Match';
  const platform = match.platform ? PLATFORMS[match.platform]?.label ?? null : null;

  if (platform) {
    return `${game} is live on ${platform}. Use this chat to share room code, invite timing, and setup details before kickoff.`;
  }

  return `${game} is live. Use this chat to share room code, invite timing, and setup details before kickoff.`;
}

function normalizeMessageBody(body: string) {
  return body.replace(/\s+/g, ' ').trim();
}

function truncatePreview(body: string, maxLength = 72) {
  if (body.length <= maxLength) {
    return body;
  }

  return `${body.slice(0, maxLength - 3).trimEnd()}...`;
}

async function ensureMatchReadRows(match: MatchAccessRow) {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  await supabase.from('match_message_reads').upsert(
    [
      {
        match_id: match.id,
        user_id: match.player1_id,
        updated_at: nowIso,
      },
      {
        match_id: match.id,
        user_id: match.player2_id,
        updated_at: nowIso,
      },
    ],
    {
      onConflict: 'match_id,user_id',
      ignoreDuplicates: true,
    }
  );
}

async function listMatchReadRows(matchId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('match_message_reads')
    .select('match_id, user_id, last_read_at, last_notified_at, created_at, updated_at')
    .eq('match_id', matchId);

  return ((data ?? []) as MatchReadRow[]) ?? [];
}

async function updateMatchReadState(params: {
  matchId: string;
  userId: string;
  lastReadAt?: string | null;
  lastNotifiedAt?: string | null;
}) {
  const supabase = getSupabase();
  const payload: Record<string, string | null> = {
    match_id: params.matchId,
    user_id: params.userId,
    updated_at: new Date().toISOString(),
  };

  if (params.lastReadAt !== undefined) {
    payload.last_read_at = params.lastReadAt;
  }

  if (params.lastNotifiedAt !== undefined) {
    payload.last_notified_at = params.lastNotifiedAt;
  }

  await supabase.from('match_message_reads').upsert(payload, {
    onConflict: 'match_id,user_id',
  });
}

function buildThreadState(params: {
  messages: MatchChatRow[];
  reads: MatchReadRow[];
  currentUserId: string;
  opponentUserId: string;
}): MatchChatThreadState {
  const currentRead = params.reads.find((row) => row.user_id === params.currentUserId) ?? null;
  const opponentRead = params.reads.find((row) => row.user_id === params.opponentUserId) ?? null;
  const latestMessage = params.messages.at(-1) ?? null;
  const latestPlayerMessage =
    [...params.messages].reverse().find((message) => message.sender_type === 'player') ?? null;

  const currentLastReadAt = currentRead?.last_read_at ?? null;
  const unreadCount = params.messages.filter((message) => {
    if (message.sender_user_id === params.currentUserId) {
      return false;
    }

    if (!currentLastReadAt) {
      return true;
    }

    return message.created_at > currentLastReadAt;
  }).length;

  const opponentHasSeenLatestMessage = Boolean(
    latestPlayerMessage &&
      latestPlayerMessage.sender_user_id === params.currentUserId &&
      opponentRead?.last_read_at &&
      opponentRead.last_read_at >= latestPlayerMessage.created_at
  );

  return {
    unread_count: unreadCount,
    my_last_read_at: currentLastReadAt,
    opponent_last_read_at: opponentRead?.last_read_at ?? null,
    latest_message_at: latestMessage?.created_at ?? null,
    latest_message_sender_user_id: latestMessage?.sender_user_id ?? null,
    latest_message_sender_type: latestMessage?.sender_type ?? null,
    latest_player_message_at: latestPlayerMessage?.created_at ?? null,
    latest_player_message_sender_user_id: latestPlayerMessage?.sender_user_id ?? null,
    opponent_has_seen_latest_message: opponentHasSeenLatestMessage,
  };
}

async function resolveMatchAccess(
  matchId: string,
  userId: string
): Promise<MatchChatAccessResult> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('matches')
    .select('id, player1_id, player2_id, game, platform, status, created_at')
    .eq('id', matchId)
    .maybeSingle();

  const match = (data as MatchAccessRow | null) ?? null;

  if (!match) {
    return { ok: false, reason: 'not_found' };
  }

  if (match.player1_id !== userId && match.player2_id !== userId) {
    return { ok: false, reason: 'forbidden' };
  }

  return { ok: true, match };
}

async function listMatchMessageRows(matchId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('match_messages')
    .select('id, match_id, sender_user_id, sender_type, message_type, body, meta, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  return ((data ?? []) as MatchChatRow[]) ?? [];
}

async function mapMatchMessages(rows: MatchChatRow[]): Promise<MatchChatMessage[]> {
  const senderIds = [...new Set(rows.map((row) => row.sender_user_id).filter(Boolean))] as string[];
  let senders = new Map<string, Pick<Profile, 'id' | 'username' | 'avatar_url'>>();

  if (senderIds.length > 0) {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', senderIds);

    senders = new Map(
      ((data ?? []) as Array<Pick<Profile, 'id' | 'username' | 'avatar_url'>>).map((profile) => [
        profile.id,
        profile,
      ])
    );
  }

  return rows.map((row) => ({
    ...row,
    body: row.body ?? null,
    meta: row.meta ?? {},
    sender: row.sender_user_id ? senders.get(row.sender_user_id) ?? null : null,
  }));
}

export function canSendMatchChatMessage(status: Match['status']) {
  return status === 'pending' || status === 'disputed';
}

export async function ensureMatchChatSeeded(matchId: string) {
  const supabase = getSupabase();
  const { data: matchData } = await supabase
    .from('matches')
    .select('id, player1_id, player2_id, game, platform, status, created_at')
    .eq('id', matchId)
    .maybeSingle();

  const match = (matchData as MatchAccessRow | null) ?? null;
  if (!match) {
    return null;
  }

  const { data: existing } = await supabase
    .from('match_messages')
    .select('id')
    .eq('match_id', matchId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return null;
  }

  const createdAt = match.created_at ?? new Date().toISOString();
  const { data } = await supabase
    .from('match_messages')
    .insert({
      match_id: match.id,
      sender_user_id: null,
      sender_type: 'system',
      message_type: 'system',
      body: buildMatchChatSeedMessage(match),
      meta: { seed: 'match-start' },
      created_at: createdAt,
    })
    .select('id, match_id, sender_user_id, sender_type, message_type, body, meta, created_at')
    .single();

  return (data as MatchChatRow | null) ?? null;
}

export async function getMatchChatThread(matchId: string, userId: string) {
  const access = await resolveMatchAccess(matchId, userId);
  if (!access.ok) {
    return access;
  }

  await ensureMatchChatSeeded(matchId);
  await ensureMatchReadRows(access.match);
  const rows = await listMatchMessageRows(matchId);
  const reads = await listMatchReadRows(matchId);
  const currentRead = reads.find((row) => row.user_id === userId) ?? null;
  const latestMessage = rows.at(-1) ?? null;
  let didMarkRead = false;

  if (latestMessage && (!currentRead?.last_read_at || currentRead.last_read_at < latestMessage.created_at)) {
    await updateMatchReadState({
      matchId,
      userId,
      lastReadAt: new Date().toISOString(),
    });
    didMarkRead = true;
  }

  const messages = await mapMatchMessages(rows);
  const finalReads = didMarkRead ? await listMatchReadRows(matchId) : reads;
  const opponentUserId =
    access.match.player1_id === userId ? access.match.player2_id : access.match.player1_id;
  const state = buildThreadState({
    messages: rows,
    reads: finalReads,
    currentUserId: userId,
    opponentUserId,
  });

  return {
    ok: true as const,
    match: access.match,
    canReply: canSendMatchChatMessage(access.match.status),
    messages,
    state,
    didMarkRead,
  };
}

export async function getAdminMatchChatThread(matchId: string) {
  await ensureMatchChatSeeded(matchId);
  const rows = await listMatchMessageRows(matchId);
  return mapMatchMessages(rows);
}

export async function createMatchChatMessage(params: {
  matchId: string;
  senderUserId?: string | null;
  senderType: MatchChatMessage['sender_type'];
  body: string;
  messageType?: MatchChatMessageType;
  meta?: Record<string, unknown>;
  senderUsername?: string;
}) {
  const normalizedBody = normalizeMessageBody(params.body);

  if (!normalizedBody) {
    return { ok: false as const, reason: 'empty' as const };
  }

  if (normalizedBody.length > MATCH_CHAT_MESSAGE_MAX_LENGTH) {
    return { ok: false as const, reason: 'too_long' as const };
  }

  if (params.senderType === 'player' && !params.senderUserId) {
    return { ok: false as const, reason: 'forbidden' as const };
  }

  if (params.senderType === 'player' && params.senderUserId) {
    const access = await resolveMatchAccess(params.matchId, params.senderUserId);
    if (!access.ok) {
      return access;
    }

    if (!canSendMatchChatMessage(access.match.status)) {
      return { ok: false as const, reason: 'locked' as const };
    }

    await ensureMatchReadRows(access.match);
  }

  await ensureMatchChatSeeded(params.matchId);
  const supabase = getSupabase();
  const createdAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('match_messages')
    .insert({
      match_id: params.matchId,
      sender_user_id: params.senderUserId ?? null,
      sender_type: params.senderType,
      message_type: params.messageType ?? (params.senderType === 'system' ? 'system' : 'text'),
      body: normalizedBody,
      meta: params.meta ?? {},
      created_at: createdAt,
    })
    .select('id, match_id, sender_user_id, sender_type, message_type, body, meta, created_at')
    .single();

  if (error || !data) {
    return { ok: false as const, reason: 'insert_failed' as const };
  }

  if (params.senderType === 'player' && params.senderUserId) {
    const access = await resolveMatchAccess(params.matchId, params.senderUserId);

    if (access.ok) {
      const recipientUserId =
        access.match.player1_id === params.senderUserId
          ? access.match.player2_id
          : access.match.player1_id;

      const reads = await listMatchReadRows(params.matchId);
      const recipientRead = reads.find((row) => row.user_id === recipientUserId) ?? null;
      const senderRead = reads.find((row) => row.user_id === params.senderUserId) ?? null;

      await updateMatchReadState({
        matchId: params.matchId,
        userId: params.senderUserId,
        lastReadAt: createdAt,
        lastNotifiedAt: senderRead?.last_notified_at ?? null,
      });

      const recipientWasRecentlyActive = Boolean(
        recipientRead?.last_read_at &&
          Date.now() - new Date(recipientRead.last_read_at).getTime() <
            MATCH_CHAT_NOTIFICATION_ACTIVE_WINDOW_MS
      );
      const recipientAlreadyHasUnreadPing = Boolean(
        recipientRead?.last_notified_at &&
          (!recipientRead.last_read_at || recipientRead.last_notified_at > recipientRead.last_read_at)
      );

      if (!recipientWasRecentlyActive && !recipientAlreadyHasUnreadPing) {
        await createNotification({
          user_id: recipientUserId,
          type: 'match_chat_message',
          title: `${params.senderUsername ?? 'Your opponent'} sent a match message`,
          body: truncatePreview(normalizedBody),
          href: `/match/${params.matchId}`,
          metadata: {
            match_id: params.matchId,
            sender_user_id: params.senderUserId,
            sender_username: params.senderUsername ?? null,
          },
        });

        await updateMatchReadState({
          matchId: params.matchId,
          userId: recipientUserId,
          lastNotifiedAt: createdAt,
        });
      }
    }
  }

  const [message] = await mapMatchMessages([data as MatchChatRow]);
  return { ok: true as const, message };
}

