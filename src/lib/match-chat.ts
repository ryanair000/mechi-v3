import { GAMES, PLATFORMS, getCanonicalGameKey } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase';
import type { Match, MatchChatMessage, MatchChatMessageType, Profile } from '@/types';

export const MATCH_CHAT_MESSAGE_MAX_LENGTH = 280;

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
  const rows = await listMatchMessageRows(matchId);
  const messages = await mapMatchMessages(rows);

  return {
    ok: true as const,
    match: access.match,
    canReply: canSendMatchChatMessage(access.match.status),
    messages,
  };
}

export async function createMatchChatMessage(params: {
  matchId: string;
  senderUserId?: string | null;
  senderType: MatchChatMessage['sender_type'];
  body: string;
  messageType?: MatchChatMessageType;
  meta?: Record<string, unknown>;
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

  const [message] = await mapMatchMessages([data as MatchChatRow]);
  return { ok: true as const, message };
}
