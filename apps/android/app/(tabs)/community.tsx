import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { getCommunityRoom, sendCommunityMessage } from '../../src/api/mechi';
import { Button, ErrorBanner, LoadingState, textStyles } from '../../src/components/ui';
import { Card, KineticScreen, Label } from '../../src/components/kinetic';
import { colors, radii, spacing } from '../../src/theme';

const COMMUNITY_QUERY_KEY = ['community-room'];
const CHALLENGE_PROMPTS = ['1v1?', 'Squad up', 'Need teammate', 'Scrim call'];

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PM';
}

export default function CommunityScreen() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const roomQuery = useQuery({
    queryKey: COMMUNITY_QUERY_KEY,
    queryFn: () => getCommunityRoom(),
    refetchInterval: 15_000,
  });

  const messages = roomQuery.data?.messages ?? [];
  const room = roomQuery.data?.room ?? null;
  const isLocked = Boolean(room?.is_locked);
  const canModerate = Boolean(roomQuery.data?.can_moderate);

  const sendMutation = useMutation({
    mutationFn: () =>
      sendCommunityMessage({
        message: input.trim(),
        message_type: 'text',
      }),
    onSuccess: async () => {
      setInput('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: COMMUNITY_QUERY_KEY });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Message did not send. Try again.');
    },
  });

  const canSend = input.trim().length > 0 && !sendMutation.isPending && (!isLocked || canModerate);

  function handleSend() {
    if (canSend) {
      sendMutation.mutate();
    }
  }

  return (
    <KineticScreen>
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="flash" color={colors.slate} size={22} />
          </View>
          <View style={styles.heroCopy}>
            <Label>{isLocked ? 'Read Only' : 'Live Now'}</Label>
            <Text style={styles.heroTitle}>Squad up, challenge clean, keep it fair.</Text>
            <Text style={styles.heroBody}>
              Match invites, lobby help, result talk, and PlayMechi community energy in one room.
            </Text>
          </View>
        </View>
      </Card>

      <ErrorBanner message={error} />

      <View style={styles.challengeRail}>
        {CHALLENGE_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            accessibilityRole="button"
            onPress={() => setInput((current) => (current.trim() ? current : prompt))}
            style={({ pressed }) => [styles.challengeChip, pressed && styles.pressed]}
          >
            <Ionicons name="flash-outline" size={14} color={colors.accent} />
            <Text style={styles.challengeText}>{prompt}</Text>
          </Pressable>
        ))}
      </View>

      {roomQuery.isLoading ? (
        <LoadingState label="Loading chat" />
      ) : messages.length ? (
        <View style={styles.messageList}>
          {messages.map((message) => {
            const senderName =
              message.sender?.username ?? (message.sender_type === 'system' ? 'PlayMechi' : 'Player');

            return (
            <View key={message.id} style={styles.messageBubbleRow}>
              <View style={[styles.avatar, message.sender_type === 'system' && styles.avatarOfficial]}>
                <Text style={styles.avatarText}>{getInitials(senderName)}</Text>
              </View>
              <View style={styles.messageBubble}>
                <View style={styles.messageTop}>
                  <Text style={styles.sender}>{senderName}</Text>
                  <Text style={styles.time}>
                    {new Date(message.created_at).toLocaleTimeString('en-KE', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text selectable style={[textStyles.body, message.is_deleted && styles.deleted]}>
                  {message.is_deleted ? 'Removed by moderation.' : message.body}
                </Text>
                <View style={styles.reactionRow}>
                  <Text style={styles.reactionText}>Reply</Text>
                  <Text style={styles.reactionText}>Challenge</Text>
                </View>
              </View>
            </View>
          );
          })}
        </View>
      ) : (
        <Card>
          <Text style={styles.emptyTitle}>No callouts yet.</Text>
          <Text style={textStyles.muted}>Start with a clean challenge, lobby request, or match update.</Text>
        </Card>
      )}

      <Card style={styles.composerCard}>
        <Text style={styles.composerTitle}>Send a clean callout</Text>
        <TextInput
          multiline
          maxLength={500}
          onChangeText={setInput}
          placeholder={isLocked && !canModerate ? 'Chat is read-only right now.' : 'Drop a challenge, update, or lobby call...'}
          placeholderTextColor={colors.faint}
          style={styles.input}
          value={input}
        />
        <Button
          label="Send"
          icon="send"
          loading={sendMutation.isPending}
          disabled={!canSend}
          onPress={handleSend}
        />
      </Card>
    </KineticScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.slate,
    borderColor: colors.slate,
  },
  heroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  heroBody: {
    color: colors.neutral,
    fontSize: 13,
    lineHeight: 19,
  },
  composerCard: {
    gap: spacing.sm,
  },
  composerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  input: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.panel2,
    color: colors.text,
    fontSize: 15,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  messageList: {
    gap: spacing.md,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.slate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOfficial: {
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  messageBubble: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.panel,
    padding: spacing.md,
    gap: spacing.sm,
  },
  messageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sender: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  time: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '800',
  },
  deleted: {
    color: colors.muted,
    fontStyle: 'italic',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  challengeRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  challengeChip: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  challengeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  reactionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  reactionText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});
