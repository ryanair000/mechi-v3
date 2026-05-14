import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getCommunityRoom,
  moderateCommunityRoom,
  sendCommunityMessage,
} from '../../src/api/mechi';
import { ApiError } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import {
  Button,
  ChipGroup,
  ErrorBanner,
  LoadingState,
  Screen,
  StatusBadge,
} from '../../src/components/ui';
import { colors, radii, spacing } from '../../src/theme';
import type { CommunityMessage, CommunityMessageType } from '../../src/types';

const COMMUNITY_QUERY_KEY = ['community-room'];

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatUntil(value?: string | null) {
  if (!value) {
    return 'soon';
  }

  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 1) {
    return 'in under a minute';
  }

  if (diffMinutes < 60) {
    return `in ${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `in ${diffHours}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `in ${diffDays}d`;
}

function isFuture(value?: string | null) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

function getSenderLabel(message: CommunityMessage, currentUserId?: string | null) {
  if (message.sender_type === 'system') {
    return 'Mechi';
  }

  if (message.sender_user_id === currentUserId) {
    return 'You';
  }

  return message.sender?.username ?? 'Community';
}

function getLockedTone(locked: boolean) {
  return locked ? 'warn' : 'good';
}

export default function CommunityTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView | null>(null);
  const [input, setInput] = useState('');
  const [composerMode, setComposerMode] = useState<'text' | 'announcement'>('text');
  const [error, setError] = useState<string | null>(null);

  const roomQuery = useQuery({
    queryKey: COMMUNITY_QUERY_KEY,
    queryFn: () => getCommunityRoom(),
    refetchInterval: 5_000,
  });

  const room = roomQuery.data?.room ?? null;
  const messages = roomQuery.data?.messages ?? [];
  const pinnedMessage = roomQuery.data?.pinned_message ?? null;
  const mutedMembers = roomQuery.data?.muted_members ?? [];
  const canModerate = roomQuery.data?.can_moderate ?? false;
  const mutedUserIds = useMemo(
    () => new Set(mutedMembers.map((member) => member.user.id)),
    [mutedMembers]
  );
  const isMuted = isFuture(roomQuery.data?.state.mute_until);
  const isLocked = Boolean(room?.is_locked);

  useEffect(() => {
    if (!canModerate && composerMode !== 'text') {
      setComposerMode('text');
    }
  }, [canModerate, composerMode]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, pinnedMessage?.id]);

  const sendMutation = useMutation({
    mutationFn: () =>
      sendCommunityMessage({
        message: input.trim(),
        message_type: composerMode,
      }),
    onSuccess: async () => {
      setInput('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: COMMUNITY_QUERY_KEY });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not send community message.');
    },
  });

  const moderationMutation = useMutation({
    mutationFn: moderateCommunityRoom,
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: COMMUNITY_QUERY_KEY });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not update community room.');
    },
  });

  const canSend =
    input.trim().length > 0 &&
    !sendMutation.isPending &&
    (!isLocked || canModerate) &&
    !isMuted;

  function handleSend() {
    if (!canSend) {
      return;
    }

    sendMutation.mutate();
  }

  function confirmDelete(message: CommunityMessage) {
    Alert.alert(
      'Delete message?',
      'This will replace the message body with a deleted placeholder for everyone in the room.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            moderationMutation.mutate({
              action: 'delete_message',
              message_id: message.id,
            }),
        },
      ]
    );
  }

  function confirmMute(message: CommunityMessage) {
    if (!message.sender_user_id || !message.sender) {
      return;
    }

    const muted = mutedUserIds.has(message.sender_user_id);
    Alert.alert(
      muted ? 'Lift mute?' : `Mute ${message.sender.username}?`,
      muted
        ? 'This will let them post in the community room again.'
        : 'This will stop them from posting in the community room for the next 24 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: muted ? 'Unmute' : 'Mute 24h',
          style: muted ? 'default' : 'destructive',
          onPress: () =>
            moderationMutation.mutate(
              muted
                ? {
                    action: 'unmute_user',
                    user_id: message.sender_user_id!,
                  }
                : {
                    action: 'mute_user',
                    user_id: message.sender_user_id!,
                    duration_hours: 24,
                  }
            ),
        },
      ]
    );
  }

  function toggleRoomLock() {
    moderationMutation.mutate({
      action: isLocked ? 'unlock' : 'lock',
    });
  }

  function togglePin(message: CommunityMessage) {
    moderationMutation.mutate(
      pinnedMessage?.id === message.id
        ? {
            action: 'unpin',
          }
        : {
            action: 'pin',
            message_id: message.id,
          }
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Community</Text>
            <Text style={styles.headerTitle}>{room?.name ?? 'Mechi Community'}</Text>
            <Text style={styles.headerSubtitle}>
              Global chat for the whole signed-in Mechi crew. Keep it clean, useful, and ready for
              match night.
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <StatusBadge
              label={isLocked ? 'read only' : 'live'}
              tone={getLockedTone(isLocked)}
            />
            <Text style={styles.headerCount}>
              {roomQuery.data?.member_count ?? 0} joined
            </Text>
            <Text style={styles.headerSync}>
              {roomQuery.isFetching && !roomQuery.isLoading ? 'Syncing...' : 'Live poll 5s'}
            </Text>
          </View>
        </View>

        {isLocked ? (
          <View style={[styles.banner, styles.bannerWarn]}>
            <Text style={styles.bannerTitle}>Community is in read-only mode</Text>
            <Text style={styles.bannerBody}>
              Mods can still post updates, but everyone else is temporarily locked from sending.
            </Text>
          </View>
        ) : null}

        {isMuted ? (
          <View style={[styles.banner, styles.bannerDanger]}>
            <Text style={styles.bannerTitle}>You are muted in community</Text>
            <Text style={styles.bannerBody}>
              You can read messages, but posting unlocks after{' '}
              {formatDateTime(roomQuery.data?.state.mute_until ?? '')}.
            </Text>
          </View>
        ) : null}

        {canModerate ? (
          <View style={styles.adminPanel}>
            <View style={styles.adminHeader}>
              <Text style={styles.adminTitle}>Moderator controls</Text>
              <Pressable
                onPress={toggleRoomLock}
                style={({ pressed }) => [
                  styles.adminButton,
                  isLocked && styles.adminButtonWarn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.adminButtonText}>
                  {isLocked ? 'Unlock room' : 'Lock room'}
                </Text>
              </Pressable>
            </View>

            <ChipGroup
              options={[
                { label: 'Message', value: 'text' as const, icon: 'chatbubble-ellipses' },
                { label: 'Announcement', value: 'announcement' as const, icon: 'megaphone' },
              ]}
              value={composerMode}
              onChange={setComposerMode}
            />

            {mutedMembers.length ? (
              <View style={styles.mutedWrap}>
                <Text style={styles.mutedLabel}>Muted users</Text>
                <View style={styles.mutedList}>
                  {mutedMembers.map((member) => (
                    <Pressable
                      key={member.user.id}
                      onPress={() =>
                        moderationMutation.mutate({
                          action: 'unmute_user',
                          user_id: member.user.id,
                        })
                      }
                      style={({ pressed }) => [styles.mutedChip, pressed && styles.pressed]}
                    >
                      <Text style={styles.mutedChipTitle}>{member.user.username}</Text>
                      <Text style={styles.mutedChipMeta}>
                        until {formatUntil(member.muted_until)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {pinnedMessage ? (
          <View style={styles.pinnedCard}>
            <View style={styles.pinnedHeader}>
              <Text style={styles.pinnedEyebrow}>Pinned message</Text>
              {canModerate ? (
                <Pressable
                  onPress={() => moderationMutation.mutate({ action: 'unpin' })}
                  style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}
                >
                  <Text style={styles.inlineActionText}>Unpin</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.pinnedSender}>
              {getSenderLabel(pinnedMessage, user?.id)} · {formatTime(pinnedMessage.created_at)}
            </Text>
            <Text style={styles.pinnedBody}>
              {pinnedMessage.is_deleted ? 'This pinned message was deleted.' : pinnedMessage.body}
            </Text>
          </View>
        ) : null}

        <ErrorBanner message={error} />
        {roomQuery.isError && !error ? (
          <ErrorBanner message="Could not load community chat right now." />
        ) : null}

        <View style={styles.messagesShell}>
          {roomQuery.isLoading && messages.length === 0 ? (
            <LoadingState label="Opening community" />
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyBody}>
                Start the room with a quick hello, match-night question, or a useful update.
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.messageList}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((message) => {
                const mine = message.sender_user_id === user?.id;
                const system = message.sender_type === 'system';
                const announcement = message.message_type === 'announcement';
                const muted = Boolean(
                  message.sender_user_id && mutedUserIds.has(message.sender_user_id)
                );

                if (system) {
                  return (
                    <View key={message.id} style={styles.systemCard}>
                      <Text style={styles.systemTitle}>Mechi update</Text>
                      <Text style={styles.systemBody}>{message.body}</Text>
                    </View>
                  );
                }

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageRow,
                      mine ? styles.messageRowMine : styles.messageRowOther,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        mine && styles.messageBubbleMine,
                        announcement && styles.messageBubbleAnnouncement,
                        message.is_deleted && styles.messageBubbleDeleted,
                      ]}
                    >
                      <View style={styles.messageMetaRow}>
                        <Text style={styles.messageSender}>
                          {getSenderLabel(message, user?.id)}
                          {message.sender?.role && !mine
                            ? ` · ${message.sender.role}`
                            : ''}
                        </Text>
                        <Text style={styles.messageTime}>{formatTime(message.created_at)}</Text>
                      </View>
                      <Text
                        style={[
                          styles.messageBody,
                          message.is_deleted && styles.messageBodyDeleted,
                        ]}
                      >
                        {message.is_deleted ? 'Message deleted by moderation.' : message.body}
                      </Text>
                      {announcement ? (
                        <Text style={styles.announcementTag}>Announcement</Text>
                      ) : null}
                    </View>

                    {canModerate &&
                    message.sender_user_id &&
                    message.sender_type !== 'system' &&
                    !message.is_deleted &&
                    message.sender_user_id !== user?.id ? (
                      <View style={styles.messageAdminRow}>
                        <Pressable
                          onPress={() => togglePin(message)}
                          style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}
                        >
                          <Text style={styles.inlineActionText}>
                            {pinnedMessage?.id === message.id ? 'Unpin' : 'Pin'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => confirmDelete(message)}
                          style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}
                        >
                          <Text style={styles.inlineActionText}>Delete</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => confirmMute(message)}
                          style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}
                        >
                          <Text style={styles.inlineActionText}>
                            {muted ? 'Unmute' : 'Mute'}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.composer}>
          <View style={styles.composerTop}>
            <Text style={styles.composerHint}>
              {composerMode === 'announcement'
                ? 'Announcement mode is live for moderators.'
                : isLocked && !canModerate
                  ? 'Room is locked for read-only mode.'
                  : isMuted
                    ? 'You are currently muted in community.'
                    : 'Keep it helpful, concise, and community-safe.'}
            </Text>
            <Text style={styles.composerCount}>{input.trim().length}/500</Text>
          </View>
          <View style={styles.composerRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={
                composerMode === 'announcement'
                  ? 'Post a moderator announcement...'
                  : 'Write to the Mechi community...'
              }
              placeholderTextColor={colors.faint}
              multiline
              maxLength={500}
              style={styles.composerInput}
            />
            <View style={styles.sendButtonWrap}>
              <Button
                label={composerMode === 'announcement' ? 'Announce' : 'Send'}
                icon={composerMode === 'announcement' ? 'megaphone' : 'send'}
                loading={sendMutation.isPending}
                disabled={!canSend}
                onPress={handleSend}
              />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  headerMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  headerCount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  headerSync: {
    color: colors.faint,
    fontSize: 11,
  },
  banner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerWarn: {
    borderColor: 'rgba(255, 184, 107, 0.26)',
    backgroundColor: 'rgba(255, 184, 107, 0.12)',
  },
  bannerDanger: {
    borderColor: 'rgba(255, 92, 119, 0.28)',
    backgroundColor: 'rgba(255, 92, 119, 0.12)',
  },
  bannerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  bannerBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  adminPanel: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(50, 224, 196, 0.2)',
    borderRadius: radii.md,
    backgroundColor: '#0f1b18',
    padding: spacing.md,
    gap: spacing.md,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  adminTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  adminButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonWarn: {
    borderColor: 'rgba(255, 184, 107, 0.26)',
    backgroundColor: 'rgba(255, 184, 107, 0.12)',
  },
  adminButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  mutedWrap: {
    gap: spacing.sm,
  },
  mutedLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  mutedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mutedChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  mutedChipTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  mutedChipMeta: {
    color: colors.muted,
    fontSize: 11,
  },
  pinnedCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.28)',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 209, 102, 0.1)',
    padding: spacing.md,
    gap: spacing.xs,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pinnedEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pinnedSender: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  pinnedBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  messagesShell: {
    flex: 1,
    marginTop: spacing.md,
  },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  systemCard: {
    borderWidth: 1,
    borderColor: 'rgba(50, 224, 196, 0.18)',
    borderRadius: radii.md,
    backgroundColor: 'rgba(50, 224, 196, 0.08)',
    padding: spacing.md,
    gap: spacing.xs,
  },
  systemTitle: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  systemBody: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  messageRow: {
    gap: spacing.xs,
  },
  messageRowMine: {
    alignItems: 'flex-end',
  },
  messageRowOther: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '88%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.panel2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  messageBubbleMine: {
    backgroundColor: 'rgba(50, 224, 196, 0.14)',
    borderColor: 'rgba(50, 224, 196, 0.22)',
  },
  messageBubbleAnnouncement: {
    backgroundColor: 'rgba(255, 209, 102, 0.12)',
    borderColor: 'rgba(255, 209, 102, 0.24)',
  },
  messageBubbleDeleted: {
    backgroundColor: colors.panel,
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  messageSender: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  messageTime: {
    color: colors.faint,
    fontSize: 11,
  },
  messageBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  messageBodyDeleted: {
    color: colors.muted,
    fontStyle: 'italic',
  },
  announcementTag: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  messageAdminRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineAction: {
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  composerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  composerHint: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  composerCount: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '800',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
    minHeight: 52,
    maxHeight: 128,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.panel,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  sendButtonWrap: {
    width: 122,
  },
  pressed: {
    opacity: 0.82,
  },
});
