import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { getLobby, joinLobby, submitLobbyResult } from '../../src/api/mechi';
import { useAuth } from '../../src/auth/AuthProvider';
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  LoadingState,
  Screen,
  SectionTitle,
  textStyles,
} from '../../src/components/ui';
import { getGame } from '../../src/config/games';
import { colors, spacing } from '../../src/theme';

export default function LobbyDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user, initializing } = useAuth();
  const [placement, setPlacement] = useState('');
  const [kills, setKills] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lobbyQuery = useQuery({
    queryKey: ['lobby', id],
    queryFn: () => getLobby(id),
    enabled: Boolean(id && token),
  });
  const lobby = lobbyQuery.data?.lobby;
  const members = lobbyQuery.data?.members ?? [];
  const isMember = members.some((member) => member.user_id === user?.id);

  const joinMutation = useMutation({
    mutationFn: () => joinLobby(id),
    onSuccess: async () => {
      setError(null);
      setNotice('Joined lobby.');
      await queryClient.invalidateQueries({ queryKey: ['lobby', id] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not join lobby.');
    },
  });

  const resultMutation = useMutation({
    mutationFn: () =>
      submitLobbyResult(id, {
        placement: Number(placement),
        kills: Number(kills || 0),
        total_players: lobby?.max_players,
      }),
    onSuccess: async (result) => {
      setError(null);
      setNotice(`Performance submitted. +${result.score_gained} lobby score.`);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not submit lobby result.');
    },
  });

  if (initializing) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Checking session" />
      </Screen>
    );
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  if (lobbyQuery.isLoading || !lobby) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading lobby" />
      </Screen>
    );
  }

  return (
    <Screen title={lobby.title} subtitle={`${getGame(lobby.game).label} . ${lobby.status}`}>
      <Card>
        <SectionTitle title="Room" />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Code</Text>
          <Text style={styles.roomCode}>{lobby.room_code ?? 'Not set'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mode</Text>
          <Text style={styles.infoValue}>{lobby.mode ?? 'Lobby'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Map</Text>
          <Text style={styles.infoValue}>{lobby.map_name ?? 'Any'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Host</Text>
          <Text style={styles.infoValue}>{lobby.host?.username ?? 'Unknown'}</Text>
        </View>
        {!isMember ? (
          <Button
            label="Join lobby"
            icon="enter"
            onPress={() => joinMutation.mutate()}
            loading={joinMutation.isPending}
          />
        ) : null}
      </Card>

      <ErrorBanner message={error} />
      {notice ? (
        <Card>
          <Text style={textStyles.body}>{notice}</Text>
        </Card>
      ) : null}

      <Card>
        <SectionTitle title="Members" />
        {members.length ? (
          <View style={styles.memberList}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <Text style={styles.memberName}>{member.user?.username ?? member.user_id}</Text>
                <Text style={styles.memberMeta}>{member.user_id === lobby.host_id ? 'Host' : 'Player'}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={textStyles.muted}>No members loaded yet.</Text>
        )}
      </Card>

      {isMember ? (
        <Card>
          <SectionTitle title="Submit performance" />
          <Field
            label="Placement"
            value={placement}
            onChangeText={setPlacement}
            placeholder="1"
            keyboardType="number-pad"
          />
          <Field label="Kills" value={kills} onChangeText={setKills} placeholder="0" keyboardType="number-pad" />
          <Button
            label="Submit lobby result"
            icon="checkmark-done"
            variant="secondary"
            onPress={() => resultMutation.mutate()}
            loading={resultMutation.isPending}
            disabled={!placement.trim()}
          />
        </Card>
      ) : null}

      <Button label="Back" icon="arrow-back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  infoValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  roomCode: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '900',
  },
  memberList: {
    gap: spacing.sm,
  },
  memberRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    color: colors.text,
    fontWeight: '900',
  },
  memberMeta: {
    color: colors.muted,
    fontSize: 12,
  },
});
