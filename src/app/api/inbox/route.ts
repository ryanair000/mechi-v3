import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { GAMES } from '@/lib/config';
import { canSendMatchChatMessage, ensureMatchChatSeeded } from '@/lib/match-chat';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey, MatchChatMessageType, MatchChatSenderType, MatchStatus, PlatformKey } from '@/types';

type InboxMatchRow = {
  id: string;
  player1_id: string;
  player2_id: string;
  game: GameKey;
  platform?: PlatformKey | null;
  status: MatchStatus;
  created_at: string;
};

type InboxProfileRow = {
  id: string;
  username: string;
  avatar_url?: string | null;
};

type InboxMessageRow = {
  id: string;
  match_id: string;
  sender_user_id?: string | null;
  sender_type: MatchChatSenderType;
  message_type: MatchChatMessageType;
  body?: string | null;
  created_at: string;
};

type InboxReadRow = {
  match_id: string;
  user_id: string;
  last_read_at?: string | null;
};

function getPreview(message?: InboxMessageRow | null) {
  if (!message?.body?.trim()) {
    return 'No messages yet';
  }

  return message.body.trim();
}

function isUnreadForUser(message: InboxMessageRow, userId: string, lastReadAt?: string | null) {
  if (message.sender_user_id === userId || message.sender_type === 'system') {
    return false;
  }

  if (!lastReadAt) {
    return true;
  }

  return message.created_at > lastReadAt;
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, game, platform, status, created_at')
      .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
      .in('status', ['pending', 'disputed', 'completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(40);

    if (matchError) {
      return NextResponse.json({ error: 'Could not load inbox' }, { status: 500 });
    }

    const matches = ((matchData ?? []) as InboxMatchRow[]).filter(
      (match) => GAMES[match.game] && match.player1_id !== match.player2_id
    );

    if (matches.length === 0) {
      return NextResponse.json({ threads: [] });
    }

    await Promise.all(
      matches
        .filter((match) => canSendMatchChatMessage(match.status))
        .map((match) => ensureMatchChatSeeded(match.id))
    );

    const matchIds = matches.map((match) => match.id);
    const playerIds = [...new Set(matches.flatMap((match) => [match.player1_id, match.player2_id]))];
    const [profilesResult, messagesResult, readsResult] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url').in('id', playerIds),
      supabase
        .from('match_messages')
        .select('id, match_id, sender_user_id, sender_type, message_type, body, created_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('match_message_reads')
        .select('match_id, user_id, last_read_at')
        .in('match_id', matchIds)
        .eq('user_id', authUser.id),
    ]);

    const profiles = new Map(
      ((profilesResult.data ?? []) as InboxProfileRow[]).map((profile) => [profile.id, profile])
    );
    const messages = (messagesResult.data ?? []) as InboxMessageRow[];
    const reads = new Map(
      ((readsResult.data ?? []) as InboxReadRow[]).map((read) => [read.match_id, read.last_read_at ?? null])
    );
    const messagesByMatch = new Map<string, InboxMessageRow[]>();

    for (const message of messages) {
      const nextMessages = messagesByMatch.get(message.match_id) ?? [];
      nextMessages.push(message);
      messagesByMatch.set(message.match_id, nextMessages);
    }

    const threads = matches
      .map((match) => {
        const isPlayerOne = match.player1_id === authUser.id;
        const opponentId = isPlayerOne ? match.player2_id : match.player1_id;
        const opponent = profiles.get(opponentId) ?? null;
        const threadMessages = messagesByMatch.get(match.id) ?? [];
        const latestMessage = threadMessages.at(-1) ?? null;
        const lastReadAt = reads.get(match.id) ?? null;
        const unreadCount = threadMessages.filter((message) =>
          isUnreadForUser(message, authUser.id, lastReadAt)
        ).length;
        const activityAt = latestMessage?.created_at ?? match.created_at;

        return {
          id: match.id,
          match_id: match.id,
          game: match.game,
          platform: match.platform ?? null,
          status: match.status,
          can_reply: canSendMatchChatMessage(match.status),
          created_at: match.created_at,
          activity_at: activityAt,
          unread_count: unreadCount,
          preview: getPreview(latestMessage),
          latest_message: latestMessage,
          opponent: opponent
            ? {
                id: opponent.id,
                username: opponent.username,
                avatar_url: opponent.avatar_url ?? null,
              }
            : {
                id: opponentId,
                username: 'Unknown player',
                avatar_url: null,
              },
        };
      })
      .filter((thread) => thread.can_reply || thread.latest_message)
      .sort((a, b) => new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime());

    return NextResponse.json({ threads });
  } catch (error) {
    console.error('[Inbox GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
