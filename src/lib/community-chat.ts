import { createNotifications } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import type {
  CommunityMessage,
  CommunityMessageSenderType,
  CommunityMessageType,
  CommunityMutedMember,
  CommunityRoom,
  CommunityRoomState,
  Profile,
  UserRole,
} from '@/types';

export const COMMUNITY_MESSAGE_MAX_LENGTH = 500;
const COMMUNITY_NOTIFICATION_ACTIVE_WINDOW_MS = 60 * 1000;
const COMMUNITY_ROOM_SLUG = 'global';
const COMMUNITY_ROOM_NAME = 'PlayMechi Community';
const COMMUNITY_ROOM_DESCRIPTION =
  'The main PlayMechi community room for match-night updates, banter, and operator announcements.';

type CommunityRoomRow = CommunityRoom;

type CommunityMessageRow = {
  id: string;
  room_id: string;
  sender_user_id?: string | null;
  sender_type: CommunityMessageSenderType;
  message_type: CommunityMessageType;
  body?: string | null;
  meta?: Record<string, unknown> | null;
  is_deleted: boolean;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type CommunityMemberRow = {
  room_id: string;
  user_id: string;
  last_read_at?: string | null;
  last_notified_at?: string | null;
  muted_until?: string | null;
  joined_at: string;
  updated_at: string;
};

type CommunityProfilePreview = Pick<Profile, 'id' | 'username' | 'avatar_url' | 'role'>;

type CommunityAccessProfile = {
  id: string;
  username: string;
  role: UserRole;
};

type CommunityMessageResult =
  | { ok: true; message: CommunityMessage }
  | {
      ok: false;
      reason:
        | 'empty'
        | 'too_long'
        | 'locked'
        | 'muted'
        | 'forbidden'
        | 'insert_failed';
      muteUntil?: string | null;
    };

function getSupabase() {
  return createServiceClient();
}

function isModeratorRole(role: UserRole) {
  return role === 'moderator' || role === 'admin';
}

function normalizeMessageBody(body: string) {
  return body.replace(/\s+/g, ' ').trim();
}

function truncatePreview(body: string, maxLength = 96) {
  if (body.length <= maxLength) {
    return body;
  }

  return `${body.slice(0, maxLength - 3).trimEnd()}...`;
}

function getSenderType(role: UserRole): CommunityMessageSenderType {
  if (role === 'admin') {
    return 'admin';
  }

  if (role === 'moderator') {
    return 'moderator';
  }

  return 'user';
}

async function ensureCommunityRoom() {
  const supabase = getSupabase();
  const { data: existing, error: selectError } = await supabase
    .from('community_rooms')
    .select('id, slug, name, description, is_locked, pinned_message_id, created_at, updated_at')
    .eq('slug', COMMUNITY_ROOM_SLUG)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return existing as CommunityRoomRow;
  }

  const now = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from('community_rooms')
    .insert({
      slug: COMMUNITY_ROOM_SLUG,
      name: COMMUNITY_ROOM_NAME,
      description: COMMUNITY_ROOM_DESCRIPTION,
      updated_at: now,
    })
    .select('id, slug, name, description, is_locked, pinned_message_id, created_at, updated_at')
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error('Could not create community room');
  }

  return inserted as CommunityRoomRow;
}

async function ensureCommunityMember(roomId: string, userId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase.from('community_room_members').upsert(
    {
      room_id: roomId,
      user_id: userId,
      updated_at: now,
    },
    {
      onConflict: 'room_id,user_id',
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw error;
  }
}

async function getCommunityMember(roomId: string, userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('community_room_members')
    .select('room_id, user_id, last_read_at, last_notified_at, muted_until, joined_at, updated_at')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CommunityMemberRow | null) ?? null;
}

async function updateCommunityMember(params: {
  roomId: string;
  userId: string;
  lastReadAt?: string | null;
  lastNotifiedAt?: string | null;
  mutedUntil?: string | null;
  mutedBy?: string | null;
}) {
  const supabase = getSupabase();
  const payload: Record<string, string | null> = {
    room_id: params.roomId,
    user_id: params.userId,
    updated_at: new Date().toISOString(),
  };

  if (params.lastReadAt !== undefined) {
    payload.last_read_at = params.lastReadAt;
  }

  if (params.lastNotifiedAt !== undefined) {
    payload.last_notified_at = params.lastNotifiedAt;
  }

  if (params.mutedUntil !== undefined) {
    payload.muted_until = params.mutedUntil;
  }

  if (params.mutedBy !== undefined) {
    payload.muted_by = params.mutedBy;
  }

  const { error } = await supabase.from('community_room_members').upsert(payload, {
    onConflict: 'room_id,user_id',
  });

  if (error) {
    throw error;
  }
}

async function listCommunityMemberRows(roomId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('community_room_members')
    .select('room_id, user_id, last_read_at, last_notified_at, muted_until, joined_at, updated_at')
    .eq('room_id', roomId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as CommunityMemberRow[]) ?? [];
}

async function getCommunityMemberCount(roomId: string) {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from('community_room_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('room_id', roomId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function listCommunityMessageRows(roomId: string, limit = 80) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('community_messages')
    .select(
      'id, room_id, sender_user_id, sender_type, message_type, body, meta, is_deleted, created_at, deleted_at, deleted_by'
    )
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (((data ?? []) as CommunityMessageRow[]) ?? []).reverse();
}

async function mapCommunityMessages(rows: CommunityMessageRow[]): Promise<CommunityMessage[]> {
  const senderIds = [...new Set(rows.map((row) => row.sender_user_id).filter(Boolean))] as string[];
  let senders = new Map<string, CommunityProfilePreview>();

  if (senderIds.length > 0) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role')
      .in('id', senderIds);

    if (error) {
      throw error;
    }

    senders = new Map(
      ((data ?? []) as CommunityProfilePreview[]).map((profile) => [profile.id, profile])
    );
  }

  return rows.map((row) => ({
    ...row,
    body: row.body ?? null,
    meta: row.meta ?? {},
    sender: row.sender_user_id ? senders.get(row.sender_user_id) ?? null : null,
  }));
}

async function getCommunityPinnedMessage(pinnedMessageId: string | null | undefined) {
  if (!pinnedMessageId) {
    return null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('community_messages')
    .select(
      'id, room_id, sender_user_id, sender_type, message_type, body, meta, is_deleted, created_at, deleted_at, deleted_by'
    )
    .eq('id', pinnedMessageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [message] = await mapCommunityMessages([data as CommunityMessageRow]);
  return message ?? null;
}

function buildCommunityRoomState(params: {
  room: CommunityRoomRow;
  messages: CommunityMessageRow[];
  membership: CommunityMemberRow | null;
  currentUserId: string;
}): CommunityRoomState {
  const latestMessage = params.messages.at(-1) ?? null;
  const lastReadAt = params.membership?.last_read_at ?? null;
  const muteUntil = params.membership?.muted_until ?? null;
  const unreadCount = params.messages.filter((message) => {
    if (message.sender_user_id === params.currentUserId) {
      return false;
    }

    if (message.is_deleted) {
      return false;
    }

    if (!lastReadAt) {
      return true;
    }

    return message.created_at > lastReadAt;
  }).length;

  return {
    unread_count: unreadCount,
    my_last_read_at: lastReadAt,
    latest_message_at: latestMessage?.created_at ?? null,
    latest_message_sender_user_id: latestMessage?.sender_user_id ?? null,
    latest_message_sender_type: latestMessage?.sender_type ?? null,
    mute_until: muteUntil,
    room_locked: params.room.is_locked,
  };
}

async function maybeMarkCommunityRead(params: {
  roomId: string;
  userId: string;
  membership: CommunityMemberRow | null;
  latestMessageAt: string | null;
}) {
  if (!params.latestMessageAt) {
    return false;
  }

  if (
    params.membership?.last_read_at &&
    params.membership.last_read_at >= params.latestMessageAt
  ) {
    return false;
  }

  await updateCommunityMember({
    roomId: params.roomId,
    userId: params.userId,
    lastReadAt: new Date().toISOString(),
  });

  return true;
}

export async function getCommunityRoomSnapshot(params: {
  userId: string;
  role: UserRole;
  limit?: number;
}) {
  const room = await ensureCommunityRoom();
  await ensureCommunityMember(room.id, params.userId);
  const messages = await listCommunityMessageRows(room.id, params.limit ?? 80);
  let membership = await getCommunityMember(room.id, params.userId);
  const latestMessageAt = messages.at(-1)?.created_at ?? null;
  const didMarkRead = await maybeMarkCommunityRead({
    roomId: room.id,
    userId: params.userId,
    membership,
    latestMessageAt,
  });

  if (didMarkRead) {
    membership = await getCommunityMember(room.id, params.userId);
  }

  const [mappedMessages, pinnedMessage, memberCount, mutedMembersRaw] = await Promise.all([
    mapCommunityMessages(messages),
    getCommunityPinnedMessage(room.pinned_message_id),
    getCommunityMemberCount(room.id),
    isModeratorRole(params.role) ? listCommunityMemberRows(room.id) : Promise.resolve([]),
  ]);

  let mutedMembers: CommunityMutedMember[] = [];
  if (isModeratorRole(params.role)) {
    const activeMutedRows = mutedMembersRaw.filter((member) => {
      return Boolean(member.muted_until && new Date(member.muted_until).getTime() > Date.now());
    });
    const mutedUserIds = [...new Set(activeMutedRows.map((member) => member.user_id))];

    if (mutedUserIds.length > 0) {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role')
        .in('id', mutedUserIds);

      if (error) {
        throw error;
      }

      const profilesById = new Map(
        ((data ?? []) as CommunityProfilePreview[]).map((profile) => [profile.id, profile])
      );

      mutedMembers = activeMutedRows
        .map((member) => {
          const profile = profilesById.get(member.user_id);
          if (!profile || !member.muted_until) {
            return null;
          }

          return {
            user: profile,
            muted_until: member.muted_until,
          };
        })
        .filter(Boolean) as CommunityMutedMember[];
    }
  }

  return {
    room,
    messages: mappedMessages,
    pinned_message: pinnedMessage,
    state: buildCommunityRoomState({
      room,
      messages,
      membership,
      currentUserId: params.userId,
    }),
    member_count: memberCount,
    muted_members: mutedMembers,
    can_moderate: isModeratorRole(params.role),
    did_mark_read: didMarkRead,
  };
}

async function createCommunitySystemMessage(params: {
  roomId: string;
  body: string;
  messageType?: CommunityMessageType;
  meta?: Record<string, unknown>;
}) {
  const normalizedBody = normalizeMessageBody(params.body);
  if (!normalizedBody) {
    return null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('community_messages')
    .insert({
      room_id: params.roomId,
      sender_user_id: null,
      sender_type: 'system',
      message_type: params.messageType ?? 'system',
      body: normalizedBody,
      meta: params.meta ?? {},
    })
    .select(
      'id, room_id, sender_user_id, sender_type, message_type, body, meta, is_deleted, created_at, deleted_at, deleted_by'
    )
    .single();

  if (error || !data) {
    throw error ?? new Error('Could not create community system message');
  }

  return (data as CommunityMessageRow) ?? null;
}

export async function createCommunityMessage(params: {
  userId: string;
  username: string;
  role: UserRole;
  body: string;
  messageType?: CommunityMessageType;
}): Promise<CommunityMessageResult> {
  const normalizedBody = normalizeMessageBody(params.body);
  if (!normalizedBody) {
    return { ok: false, reason: 'empty' };
  }

  if (normalizedBody.length > COMMUNITY_MESSAGE_MAX_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }

  const room = await ensureCommunityRoom();
  await ensureCommunityMember(room.id, params.userId);
  const membership = await getCommunityMember(room.id, params.userId);
  const isModerator = isModeratorRole(params.role);

  if (membership?.muted_until && new Date(membership.muted_until).getTime() > Date.now()) {
    return { ok: false, reason: 'muted', muteUntil: membership.muted_until };
  }

  if (room.is_locked && !isModerator) {
    return { ok: false, reason: 'locked' };
  }

  if (params.messageType === 'announcement' && !isModerator) {
    return { ok: false, reason: 'forbidden' };
  }

  const supabase = getSupabase();
  const createdAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('community_messages')
    .insert({
      room_id: room.id,
      sender_user_id: params.userId,
      sender_type: getSenderType(params.role),
      message_type: params.messageType ?? 'text',
      body: normalizedBody,
      meta: {
        sender_username: params.username,
      },
      created_at: createdAt,
    })
    .select(
      'id, room_id, sender_user_id, sender_type, message_type, body, meta, is_deleted, created_at, deleted_at, deleted_by'
    )
    .single();

  if (error || !data) {
    return { ok: false, reason: 'insert_failed' };
  }

  await updateCommunityMember({
    roomId: room.id,
    userId: params.userId,
    lastReadAt: createdAt,
    lastNotifiedAt: membership?.last_notified_at ?? null,
  });

  const memberRows = await listCommunityMemberRows(room.id);
  const recipients = memberRows.filter((member) => member.user_id !== params.userId);
  const notificationRecipients = recipients.filter((recipient) => {
    const recipientWasRecentlyActive = Boolean(
      recipient.last_read_at &&
        Date.now() - new Date(recipient.last_read_at).getTime() <
          COMMUNITY_NOTIFICATION_ACTIVE_WINDOW_MS
    );
    const recipientAlreadyHasUnreadPing = Boolean(
      recipient.last_notified_at &&
        (!recipient.last_read_at || recipient.last_notified_at > recipient.last_read_at)
    );

    return !recipientWasRecentlyActive && !recipientAlreadyHasUnreadPing;
  });

  if (notificationRecipients.length > 0) {
    const type = params.messageType === 'announcement' ? 'community_announcement' : 'community_chat_message';
    const title =
      params.messageType === 'announcement'
        ? `${COMMUNITY_ROOM_NAME} announcement`
        : `${params.username} in ${COMMUNITY_ROOM_NAME}`;

    await createNotifications(
      notificationRecipients.map((recipient) => ({
        user_id: recipient.user_id,
        type,
        title,
        body: truncatePreview(normalizedBody),
        href: '/community',
        metadata: {
          room_slug: COMMUNITY_ROOM_SLUG,
          sender_user_id: params.userId,
          sender_username: params.username,
          mobileRoute: '/community',
        },
      }))
    );

    const supabaseForUpdate = getSupabase();
    const { error: notifyError } = await supabaseForUpdate
      .from('community_room_members')
      .update({
        last_notified_at: createdAt,
        updated_at: createdAt,
      })
      .eq('room_id', room.id)
      .in(
        'user_id',
        notificationRecipients.map((recipient) => recipient.user_id)
      );

    if (notifyError) {
      throw notifyError;
    }
  }

  const [message] = await mapCommunityMessages([data as CommunityMessageRow]);
  return { ok: true, message };
}

export async function setCommunityRoomLock(params: {
  actor: CommunityAccessProfile;
  locked: boolean;
}) {
  if (!isModeratorRole(params.actor.role)) {
    return { ok: false as const, reason: 'forbidden' as const };
  }

  const room = await ensureCommunityRoom();
  const now = new Date().toISOString();
  const supabase = getSupabase();
  const { error } = await supabase
    .from('community_rooms')
    .update({
      is_locked: params.locked,
      locked_at: params.locked ? now : null,
      locked_by: params.locked ? params.actor.id : null,
      updated_at: now,
    })
    .eq('id', room.id);

  if (error) {
    throw error;
  }

  await createCommunitySystemMessage({
    roomId: room.id,
    body: params.locked
      ? `${params.actor.username} locked the community for read-only mode.`
      : `${params.actor.username} reopened the community chat.`,
    meta: {
      event: params.locked ? 'room_locked' : 'room_unlocked',
      actor_user_id: params.actor.id,
    },
  });

  return { ok: true as const };
}

export async function pinCommunityMessage(params: {
  actor: CommunityAccessProfile;
  messageId: string | null;
}) {
  if (!isModeratorRole(params.actor.role)) {
    return { ok: false as const, reason: 'forbidden' as const };
  }

  const room = await ensureCommunityRoom();
  if (params.messageId) {
    const supabaseForCheck = getSupabase();
    const { data, error } = await supabaseForCheck
      .from('community_messages')
      .select('id, room_id, is_deleted')
      .eq('id', params.messageId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || data.room_id !== room.id || data.is_deleted) {
      return { ok: false as const, reason: 'not_found' as const };
    }
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('community_rooms')
    .update({
      pinned_message_id: params.messageId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', room.id);

  if (error) {
    throw error;
  }

  return { ok: true as const };
}

export async function deleteCommunityMessage(params: {
  actor: CommunityAccessProfile;
  messageId: string;
}) {
  if (!isModeratorRole(params.actor.role)) {
    return { ok: false as const, reason: 'forbidden' as const };
  }

  const room = await ensureCommunityRoom();
  const now = new Date().toISOString();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('community_messages')
    .update({
      body: null,
      is_deleted: true,
      deleted_at: now,
      deleted_by: params.actor.id,
      meta: {
        deleted_by_username: params.actor.username,
        deleted_event: 'moderation',
      },
    })
    .eq('id', params.messageId)
    .eq('room_id', room.id)
    .eq('is_deleted', false)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { ok: false as const, reason: 'not_found' as const };
  }

  if (room.pinned_message_id === params.messageId) {
    const { error: pinClearError } = await supabase
      .from('community_rooms')
      .update({
        pinned_message_id: null,
        updated_at: now,
      })
      .eq('id', room.id);

    if (pinClearError) {
      throw pinClearError;
    }
  }

  return { ok: true as const };
}

export async function setCommunityMemberMute(params: {
  actor: CommunityAccessProfile;
  targetUserId: string;
  muteUntil: string | null;
}) {
  if (!isModeratorRole(params.actor.role)) {
    return { ok: false as const, reason: 'forbidden' as const };
  }

  if (params.targetUserId === params.actor.id) {
    return { ok: false as const, reason: 'forbidden' as const };
  }

  const room = await ensureCommunityRoom();
  await ensureCommunityMember(room.id, params.targetUserId);
  await updateCommunityMember({
    roomId: room.id,
    userId: params.targetUserId,
    mutedUntil: params.muteUntil,
    mutedBy: params.muteUntil ? params.actor.id : null,
  });

  return { ok: true as const };
}
