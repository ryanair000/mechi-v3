import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { getProfile, getTournamentRegistrationSummary } from '../../src/api/mechi';
import { useAuth } from '../../src/auth/AuthProvider';
import {
  Button,
  Card,
  InfoRow,
  LoadingState,
  Screen,
  SectionTitle,
  StatusBadge,
  textStyles,
} from '../../src/components/ui';
import {
  PLAYMECHI_SUPPORT_LABEL,
  PLAYMECHI_SUPPORT_URL,
  TOURNAMENT_GAME_BY_KEY,
  formatStatus,
} from '../../src/config/tournament';
import {
  getPushNotificationStatusMessage,
  registerForPushNotificationsAsync,
} from '../../src/lib/push-notifications';
import { colors, spacing } from '../../src/theme';

function getStatusTone(status: string | null | undefined): 'good' | 'warn' | 'danger' | 'neutral' {
  if (status === 'verified' || status === 'checked_in') return 'good';
  if (status === 'ineligible' || status === 'disqualified' || status === 'no_show') return 'danger';
  if (status === 'pending' || status === 'registered') return 'warn';
  return 'neutral';
}

export default function AccountTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut, user } = useAuth();
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const summaryQuery = useQuery({
    queryKey: ['tournament-registration'],
    queryFn: getTournamentRegistrationSummary,
  });
  const profile = profileQuery.data?.profile ?? user;
  const registrations = summaryQuery.data?.registrations ?? [];
  const [notificationMessage, setNotificationMessage] = useState('Checking notification access...');
  const [enablingNotifications, setEnablingNotifications] = useState(false);

  useEffect(() => {
    let mounted = true;

    getPushNotificationStatusMessage()
      .then((message) => {
        if (mounted) {
          setNotificationMessage(message);
        }
      })
      .catch(() => {
        if (mounted) {
          setNotificationMessage('Could not check notification access.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  async function openSupport() {
    await Linking.openURL(PLAYMECHI_SUPPORT_URL);
  }

  async function enableNotifications() {
    try {
      setEnablingNotifications(true);
      const result = await registerForPushNotificationsAsync();
      setNotificationMessage(result.message);
    } catch {
      setNotificationMessage('Could not enable app notifications.');
    } finally {
      setEnablingNotifications(false);
    }
  }

  return (
    <Screen title="Account" subtitle="Your PlayMechi tournament profile, support, and policy links.">
      {profileQuery.isLoading && !profile ? (
        <LoadingState label="Loading account" />
      ) : (
        <>
          <Card>
            <Text style={styles.username}>{profile?.username}</Text>
            <Text selectable style={textStyles.muted}>
              {profile?.email ?? profile?.phone}
            </Text>
            <InfoRow label="Phone" value={profile?.phone ?? 'Not set'} selectable />
            <InfoRow label="Region" value={profile?.region ?? 'Not set'} />
            <Link href="/(onboarding)/profile" asChild>
              <Button label="Edit tournament profile" icon="create" variant="secondary" />
            </Link>
          </Card>

          <Card>
            <SectionTitle title="My tournament slots" />
            {summaryQuery.isLoading ? (
              <LoadingState label="Loading registrations" />
            ) : registrations.length ? (
              <View style={styles.slotList}>
                {registrations.map((registration) => (
                  <View key={registration.id} style={styles.slotRow}>
                    <View style={styles.slotCopy}>
                      <Text style={styles.slotTitle}>
                        {TOURNAMENT_GAME_BY_KEY[registration.game].label}
                      </Text>
                      <Text selectable style={styles.slotMeta}>
                        {registration.in_game_username}
                      </Text>
                      <View style={styles.badgeRow}>
                        <StatusBadge
                          label={formatStatus(registration.check_in_status)}
                          tone={getStatusTone(registration.check_in_status)}
                        />
                        <StatusBadge
                          label={formatStatus(registration.eligibility_status)}
                          tone={getStatusTone(registration.eligibility_status)}
                        />
                      </View>
                    </View>
                    <Link href={`/(tabs)/arena?game=${registration.game}`} asChild>
                      <Button label="Desk" icon="clipboard" variant="ghost" />
                    </Link>
                  </View>
                ))}
              </View>
            ) : (
              <>
                <Text style={textStyles.muted}>
                  You have not locked a PlayMechi slot yet.
                </Text>
                <Link href="/(tabs)/register" asChild>
                  <Button label="Register now" icon="ticket" />
                </Link>
              </>
            )}
          </Card>

          <Card>
            <SectionTitle title="Support & policy" />
            <Text style={textStyles.muted}>
              Use support for sign-in help, registration issues, room access, result screenshots, or
              account requests. Payout and reward eligibility must be verified by admins.
            </Text>
            <Button
              label={`WhatsApp support: ${PLAYMECHI_SUPPORT_LABEL}`}
              icon="logo-whatsapp"
              onPress={() => void openSupport()}
            />
            <Link href="/legal" asChild>
              <Button label="Privacy, terms, deletion" icon="shield-checkmark" variant="secondary" />
            </Link>
          </Card>

          <Card>
            <SectionTitle title="App notifications" />
            <Text style={textStyles.muted}>{notificationMessage}</Text>
            <Button
              label="Enable app notifications"
              icon="notifications"
              variant="secondary"
              loading={enablingNotifications}
              onPress={() => void enableNotifications()}
            />
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
  slotList: {
    gap: spacing.sm,
  },
  slotRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    gap: spacing.md,
  },
  slotCopy: {
    gap: spacing.xs,
  },
  slotTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  slotMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
