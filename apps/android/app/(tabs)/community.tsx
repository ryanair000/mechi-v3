import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { getCommunityRoom, sendCommunityMessage } from '../../src/api/mechi';
import { Button, Card, ErrorBanner, LoadingState, Screen, StatusBadge, textStyles } from '../../src/components/ui';
import { colors, radii, spacing } from '../../src/theme';

const COMMUNITY_QUERY_KEY = ['community-room'];

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
    <Screen title="Community" subtitle="Chat, reactions, squad energy, and player callouts.">
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="flash" color={colors.slate} size={22} />
          </View>
          <View style={styles.heroCopy}>
            <StatusBadge label={isLocked ? 'Read only' : 'Live now'} tone={isLocked ? 'warn' : 'good'} />
            <Text style={styles.heroTitle}>Talk clean. Challenge loud. Play fair.</Text>
            <Text style={styles.heroBody}>
              Use this space for match invites, score talk, lobby help, and PlayMechi community heat.
            </Text>
          </View>
        </View>
      </Card>

      <ErrorBanner message={error} />

      <Card style={styles.composerCard}>
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

      {roomQuery.isLoading ? (
        <LoadingState label="Loading chat" />
      ) : messages.length ? (
        <View style={styles.messageList}>
          {messages.map((message) => (
            <View key={message.id} style={styles.messageCard}>
              <View style={styles.messageTop}>
                <Text style={styles.sender}>
                  {message.sender?.username ?? (message.sender_type === 'system' ? 'PlayMechi' : 'Player')}
                </Text>
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
            </View>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.emptyTitle}>No callouts yet.</Text>
          <Text style={textStyles.muted}>Start with a clean challenge, lobby request, or match update.</Text>
        </Card>
      )}
    </Screen>
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
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 26,
  },
  heroBody: {
    color: colors.neutral,
    fontSize: 13,
    lineHeight: 19,
  },
  composerCard: {
    gap: spacing.sm,
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
    gap: spacing.sm,
  },
  messageCard: {
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
});
