import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getProfile } from '../../src/api/mechi';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Card, LoadingState, Screen, SectionTitle, StatPill, textStyles } from '../../src/components/ui';
import { getGame } from '../../src/config/games';
import { colors, spacing } from '../../src/theme';

export default function ProfileTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut, user } = useAuth();
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const profile = profileQuery.data?.profile ?? user;
  const primaryGame = profile?.selected_games?.[0];

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  return (
    <Screen title="Profile" subtitle="Manage your player setup and session.">
      {profileQuery.isLoading && !profile ? (
        <LoadingState label="Loading profile" />
      ) : (
        <>
          <Card>
            <Text style={styles.username}>{profile?.username}</Text>
            <Text style={textStyles.muted}>{profile?.email ?? profile?.phone}</Text>
            <View style={styles.statsRow}>
              <StatPill label="Level" value={profile?.level ?? 1} />
              <StatPill label="MP" value={profile?.mp ?? 0} />
              <StatPill label="Streak" value={profile?.win_streak ?? 0} />
            </View>
          </Card>

          <Card>
            <SectionTitle title="Game setup" />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Main game</Text>
              <Text style={styles.infoValue}>{primaryGame ? getGame(primaryGame).label : 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Region</Text>
              <Text style={styles.infoValue}>{profile?.region ?? 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>WhatsApp alerts</Text>
              <Text style={styles.infoValue}>{profile?.whatsapp_notifications ? 'On' : 'Off'}</Text>
            </View>
            <Link href="/(onboarding)/profile" asChild>
              <Button label="Edit profile" icon="create" variant="secondary" />
            </Link>
          </Card>

          <Card>
            <SectionTitle title="Rewards" />
            <View style={styles.statsRow}>
              <StatPill label="Available RP" value={profile?.reward_points_available ?? 0} />
              <StatPill label="Pending RP" value={profile?.reward_points_pending ?? 0} />
            </View>
          </Card>

          <Button label="Log out" icon="log-out" variant="danger" onPress={handleSignOut} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  username: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  infoRow: {
    minHeight: 40,
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
});
