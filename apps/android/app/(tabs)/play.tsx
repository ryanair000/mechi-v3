import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { createLobby, getActiveQueue, getCurrentMatch, getLobbies, getProfile, joinLobby, joinQueue } from '../../src/api/mechi';
import {
  Button,
  Card,
  ChipGroup,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingState,
  Screen,
  SectionTitle,
  textStyles,
} from '../../src/components/ui';
import {
  getConfiguredPlatform,
  getDefaultLobbyMap,
  getDefaultLobbyMode,
  getGame,
  getSelectableGames,
  supportsLobbyMode,
} from '../../src/config/games';
import { colors, spacing } from '../../src/theme';
import type { GameKey } from '../../src/types';

const selectableGames = getSelectableGames();

function defaultScheduleIso() {
  const next = new Date(Date.now() + 60 * 60 * 1000);
  return next.toISOString();
}

export default function PlayTab() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const profile = profileQuery.data?.profile;
  const [selectedGame, setSelectedGame] = useState<GameKey>('efootball');
  const [lobbyTitle, setLobbyTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firstGame = profile?.selected_games?.[0];
    if (firstGame) {
      setSelectedGame(firstGame);
    }
  }, [profile?.selected_games]);

  const game = getGame(selectedGame);
  const queueMode = game.mode === '1v1';
  const lobbyMode = game.mode === 'lobby' || supportsLobbyMode(selectedGame);
  const configuredPlatform = profile
    ? getConfiguredPlatform(selectedGame, profile.game_ids ?? {}, profile.platforms ?? [])
    : null;
  const gameOptions = useMemo(() => {
    const selectedKeys = profile?.selected_games?.length ? profile.selected_games : selectableGames.map((item) => item.key);
    const uniqueKeys = Array.from(new Set(selectedKeys));
    return uniqueKeys.map((key) => ({ value: key, label: getGame(key).label }));
  }, [profile?.selected_games]);

  const activeQueueQuery = useQuery({
    queryKey: ['queue', 'active'],
    queryFn: () => getActiveQueue(100),
    refetchInterval: 25_000,
  });
  const lobbiesQuery = useQuery({
    queryKey: ['lobbies', selectedGame],
    queryFn: () => getLobbies(selectedGame),
    enabled: lobbyMode,
    refetchInterval: 25_000,
  });
  const currentMatchQuery = useQuery({
    queryKey: ['matches', 'current'],
    queryFn: getCurrentMatch,
    refetchInterval: 20_000,
  });

  const joinQueueMutation = useMutation({
    mutationFn: () => joinQueue({ game: selectedGame, platform: configuredPlatform }),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['queue', 'active'] }),
        queryClient.invalidateQueries({ queryKey: ['matches', 'current'] }),
      ]);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not join queue.');
    },
  });

  const createLobbyMutation = useMutation({
    mutationFn: () =>
      createLobby({
        game: selectedGame,
        title: lobbyTitle.trim(),
        visibility: 'public',
        mode: getDefaultLobbyMode(selectedGame),
        map_name: getDefaultLobbyMap(selectedGame) || null,
        scheduled_for: defaultScheduleIso(),
      }),
    onSuccess: async () => {
      setError(null);
      setLobbyTitle('');
      await queryClient.invalidateQueries({ queryKey: ['lobbies', selectedGame] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not create lobby.');
    },
  });

  const joinLobbyMutation = useMutation({
    mutationFn: joinLobby,
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['lobbies', selectedGame] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not join lobby.');
    },
  });

  const queuePlayers = (activeQueueQuery.data?.players ?? []).filter((player) => player.game === selectedGame);
  const currentMatch = currentMatchQuery.data?.match;

  if (profileQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading play hub" />
      </Screen>
    );
  }

  return (
    <Screen title="Play" subtitle="Pick a game, join the queue, or enter a lobby.">
      <Card>
        <SectionTitle title="Game" />
        <ChipGroup options={gameOptions} value={selectedGame} onChange={setSelectedGame} />
        <Text style={textStyles.muted}>
          {queueMode ? '1v1 matchmaking' : 'Lobby matchmaking'}
          {configuredPlatform ? ` on ${configuredPlatform}` : ''}
        </Text>
      </Card>

      {currentMatch ? (
        <Link href={`/match/${currentMatch.id}`} asChild>
          <Pressable style={({ pressed }) => [styles.activeMatch, pressed && styles.pressed]}>
            <View>
              <Text style={textStyles.h3}>Active match ready</Text>
              <Text style={textStyles.muted}>{getGame(currentMatch.game).label}</Text>
            </View>
            <Text style={styles.openText}>Open</Text>
          </Pressable>
        </Link>
      ) : null}

      <ErrorBanner message={error} />

      {queueMode ? (
        <Card>
          <SectionTitle title="1v1 queue" />
          <Button
            label="Join queue"
            icon="flash"
            onPress={() => joinQueueMutation.mutate()}
            loading={joinQueueMutation.isPending}
            disabled={!configuredPlatform}
          />
          {!configuredPlatform ? (
            <Text style={styles.warning}>Add this game to your profile before joining queue.</Text>
          ) : null}
          <SectionTitle title="Waiting players" />
          {activeQueueQuery.isLoading ? (
            <LoadingState label="Loading queue" />
          ) : queuePlayers.length ? (
            <View style={styles.list}>
              {queuePlayers.map((player) => (
                <View key={player.id} style={styles.row}>
                  <View>
                    <Text style={styles.rowTitle}>{player.username}</Text>
                    <Text style={styles.rowMeta}>
                      Level {player.level} . {player.wait_minutes} min
                    </Text>
                  </View>
                  <Text style={styles.rowMeta}>{player.platform ?? 'any'}</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title="Queue is quiet" body="Join first and Mechi will look for an opponent." />
          )}
        </Card>
      ) : null}

      {lobbyMode ? (
        <Card>
          <SectionTitle title="Lobbies" />
          <Field
            label="Lobby title"
            value={lobbyTitle}
            onChangeText={setLobbyTitle}
            placeholder={`${game.label} match`}
          />
          <Button
            label="Create public lobby"
            icon="add-circle"
            variant="secondary"
            onPress={() => createLobbyMutation.mutate()}
            loading={createLobbyMutation.isPending}
            disabled={!lobbyTitle.trim()}
          />

          {lobbiesQuery.isLoading ? (
            <LoadingState label="Loading lobbies" />
          ) : lobbiesQuery.data?.lobbies.length ? (
            <View style={styles.list}>
              {lobbiesQuery.data.lobbies.map((lobby) => (
                <View key={lobby.id} style={styles.lobbyCard}>
                  <View style={styles.lobbyHeader}>
                    <View style={styles.lobbyTitleWrap}>
                      <Text style={styles.rowTitle}>{lobby.title}</Text>
                      <Text style={styles.rowMeta}>
                        {lobby.mode ?? getDefaultLobbyMode(selectedGame)} . {lobby.status}
                      </Text>
                    </View>
                    <Text style={styles.roomCode}>{lobby.room_code ?? 'ROOM'}</Text>
                  </View>
                  <View style={styles.lobbyActions}>
                    <Link href={`/lobby/${lobby.id}`} asChild>
                      <Button label="Details" icon="information-circle" variant="ghost" />
                    </Link>
                    <Button
                      label={lobby.is_member ? 'Joined' : 'Join'}
                      icon="enter"
                      variant="secondary"
                      disabled={lobby.is_member || joinLobbyMutation.isPending}
                      onPress={() => joinLobbyMutation.mutate(lobby.id)}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title="No lobbies yet" body="Create one and invite players into the room." />
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  activeMatch: {
    backgroundColor: '#173629',
    borderColor: '#246a4c',
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openText: {
    color: colors.primary,
    fontWeight: '900',
  },
  warning: {
    color: colors.warning,
    fontSize: 13,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    minHeight: 54,
    backgroundColor: colors.panel2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  lobbyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    gap: spacing.md,
  },
  lobbyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  lobbyTitleWrap: {
    flex: 1,
  },
  roomCode: {
    color: colors.accent,
    fontWeight: '900',
    fontSize: 12,
  },
  lobbyActions: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
});
