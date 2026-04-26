import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getCurrentMatch, getProfile } from '../../src/api/mechi';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Card, EmptyState, LoadingState, Screen, SectionTitle, StatPill, textStyles } from '../../src/components/ui';
import { getGame } from '../../src/config/games';
import { colors, spacing } from '../../src/theme';

export default function HomeTab() {
  const { user } = useAuth();
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const currentMatchQuery = useQuery({
    queryKey: ['matches', 'current'],
    queryFn: getCurrentMatch,
    refetchInterval: 20_000,
  });
  const profile = profileQuery.data?.profile ?? user;
  const match = currentMatchQuery.data?.match ?? null;
  const primaryGame = profile?.selected_games?.[0];

  return (
    <Screen title={`Hi, ${profile?.username ?? 'player'}`} subtitle="Your Mechi player hub.">
      {profileQuery.isLoading ? (
        <LoadingState label="Loading profile" />
      ) : (
        <Card>
          <View style={styles.statsRow}>
            <StatPill label="Level" value={profile?.level ?? 1} />
            <StatPill label="MP" value={profile?.mp ?? 0} />
            <StatPill label="RP" value={profile?.reward_points_available ?? 0} />
          </View>
          <Text style={textStyles.muted}>
            Main game: {primaryGame ? getGame(primaryGame).label : 'Not set'}
          </Text>
        </Card>
      )}

      <SectionTitle title="Active match" />
      {currentMatchQuery.isLoading ? (
        <LoadingState label="Checking active match" />
      ) : match ? (
        <Link href={`/match/${match.id}`} asChild>
          <Pressable style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}>
            <Text style={textStyles.h3}>{getGame(match.game).label}</Text>
            <Text style={styles.matchText}>
              {match.player1?.username ?? 'Player 1'} vs {match.player2?.username ?? 'Player 2'}
            </Text>
            <Text style={styles.matchStatus}>{match.status}</Text>
          </Pressable>
        </Link>
      ) : (
        <EmptyState
          title="No active match"
          body="Join a queue or lobby when you are ready to play."
          icon="flash"
        />
      )}

      <View style={styles.actions}>
        <Link href="/(tabs)/play" asChild>
          <Button label="Find game" icon="search" variant="primary" />
        </Link>
        <Link href="/(tabs)/leaderboard" asChild>
          <Button label="Leaderboard" icon="podium" variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  matchCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  matchText: {
    color: colors.text,
    fontSize: 14,
  },
  matchStatus: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  actions: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
});
