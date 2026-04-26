import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getLeaderboard } from '../../src/api/mechi';
import { Card, ChipGroup, EmptyState, LoadingState, Screen, SectionTitle } from '../../src/components/ui';
import { getGame, getSelectableGames } from '../../src/config/games';
import { colors, spacing } from '../../src/theme';
import type { GameKey } from '../../src/types';

const games = getSelectableGames();

export default function LeaderboardTab() {
  const [game, setGame] = useState<GameKey>('efootball');
  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', game],
    queryFn: () => getLeaderboard(game),
  });
  const entries = leaderboardQuery.data?.leaderboard ?? [];

  return (
    <Screen title="Leaderboard" subtitle="Compare ratings, records, divisions, and tournament wins.">
      <Card>
        <SectionTitle title="Game" />
        <ChipGroup
          options={games.map((item) => ({ value: item.key, label: item.label }))}
          value={game}
          onChange={setGame}
        />
      </Card>

      <Card>
        <SectionTitle title={getGame(game).label} />
        {leaderboardQuery.isLoading ? (
          <LoadingState label="Loading leaderboard" />
        ) : entries.length ? (
          <View style={styles.list}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Text style={styles.rank}>#{entry.rank}</Text>
                <View style={styles.player}>
                  <Text style={styles.username}>{entry.username}</Text>
                  <Text style={styles.meta}>
                    {entry.division} . {entry.wins}W {entry.losses}L
                  </Text>
                </View>
                <View style={styles.ratingBox}>
                  <Text style={styles.rating}>{entry.rating}</Text>
                  <Text style={styles.ratingLabel}>rating</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="No ranked results" body="Players appear here after completed matches." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  entry: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rank: {
    width: 42,
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  player: {
    flex: 1,
  },
  username: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  ratingBox: {
    alignItems: 'flex-end',
  },
  rating: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  ratingLabel: {
    color: colors.muted,
    fontSize: 10,
  },
});
