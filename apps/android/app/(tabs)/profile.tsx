import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getProfile, getTournamentRegistrationSummary } from '../../src/api/mechi';
import { useAuth } from '../../src/auth/AuthProvider';
import { Card, KineticScreen, Label, PrimaryButton } from '../../src/components/kinetic';
import {
  PLAYMECHI_SUPPORT_URL,
  TOURNAMENT_GAME_BY_KEY,
  TOURNAMENT_REGISTER_URL,
} from '../../src/config/tournament';
import {
  getPushNotificationStatusMessage,
  registerForPushNotificationsAsync,
} from '../../src/lib/push-notifications';
import { colors, radii, spacing } from '../../src/theme';

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
      .then((message) => mounted && setNotificationMessage(message))
      .catch(() => mounted && setNotificationMessage('Could not check notification access.'));
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  async function enableNotifications() {
    try {
      setEnablingNotifications(true);
      const result = await registerForPushNotificationsAsync();
      setNotificationMessage(result.message);
    } catch {
      setNotificationMessage('Notifications did not turn on. Check phone settings and try again.');
    } finally {
      setEnablingNotifications(false);
    }
  }

  return (
    <KineticScreen>
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          <Image source={require('../../assets/icon.png')} style={styles.avatar} />
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL 42</Text>
          </View>
        </View>
        <Text style={styles.username}>{profile?.username ?? 'ProGamer_99'}</Text>
        <View style={styles.regionRow}>
          <Ionicons name="location-outline" color={colors.text} size={20} />
          <Text style={styles.region}>{profile?.region ?? 'South Asia'}</Text>
        </View>
        <Link href="/(onboarding)/profile" asChild>
          <Pressable style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
        </Link>
        <View style={styles.profileRail}>
          <ProfileRailItem label="Tier" value="Gold" />
          <ProfileRailItem label="Region" value={profile?.region ?? 'South Asia'} />
          <ProfileRailItem label="Status" value="Ready" accent />
        </View>
      </View>

      <Card>
        <View style={styles.sectionTitle}>
          <Ionicons name="id-card-outline" color={colors.text} size={20} />
          <Label muted>Game Identities</Label>
        </View>
        <IdentityRow label="PUBG Mobile" value={getGameId(profile?.game_ids, 'pubgm') || '5190234876'} />
        <IdentityRow label="CODM" value={getGameId(profile?.game_ids, 'codm') || 'ProGamer99#21'} />
        <IdentityRow label="eFootball" value={getGameId(profile?.game_ids, 'efootball') || '900-123-456'} />
      </Card>

      <Card>
        <View style={styles.sectionTitle}>
          <Ionicons name="stats-chart" color={colors.text} size={20} />
          <Label muted>Tournament Stats</Label>
        </View>
        <View style={styles.statsGrid}>
          <Stat value={String(registrations.length || 124)} label="Joined" />
          <Stat value="18" label="Won" accent />
        </View>
      </Card>

      <Card>
        <View style={styles.sectionTitle}>
          <Ionicons name="checkmark-circle-outline" color={colors.text} size={20} />
          <Label muted>Player Readiness</Label>
        </View>
        <ReadinessRow icon="person-outline" label="Profile Completion" value="90%" />
        <ReadinessRow icon="pulse-outline" label="Activity Level" value="75%" />
        <ReadinessRow icon="star-outline" label="Reputation" value="85%" />
      </Card>

      <Card style={styles.menuCard}>
        <MenuRow
          icon="notifications-outline"
          label="Notifications"
          value={notificationMessage}
          loading={enablingNotifications}
          onPress={() => void enableNotifications()}
        />
        <MenuRow
          icon="help-circle-outline"
          label="Support"
          onPress={() => void Linking.openURL(PLAYMECHI_SUPPORT_URL)}
        />
        <MenuRow
          icon="settings-outline"
          label="Settings"
          onPress={() => void Linking.openURL(TOURNAMENT_REGISTER_URL)}
        />
        <MenuRow icon="log-out-outline" label="Sign Out" danger onPress={() => void handleSignOut()} />
      </Card>

      {registrations.length ? (
        <Card>
          <Label muted>My Entries</Label>
          {registrations.map((registration) => (
            <View key={registration.id} style={styles.entryRow}>
              <Text style={styles.entryGame}>{TOURNAMENT_GAME_BY_KEY[registration.game].label}</Text>
              <Text style={styles.entryMeta}>{registration.in_game_username}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </KineticScreen>
  );
}

function getGameId(gameIds: Record<string, string> | undefined | null, key: string) {
  return gameIds?.[key] ?? gameIds?.[key.replace('pubgm', 'pubg_mobile')] ?? '';
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.identityRow}>
      <Text style={styles.identityLabel}>{label}</Text>
      <Text selectable style={styles.identityValue}>
        {value}
      </Text>
    </View>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileRailItem({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.profileRailItem}>
      <Text style={[styles.profileRailValue, accent && styles.profileRailAccent]}>{value}</Text>
      <Text style={styles.profileRailLabel}>{label}</Text>
    </View>
  );
}

function ReadinessRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: '90%' | '75%' | '85%';
}) {
  return (
    <View style={styles.readinessRow}>
      <View style={styles.readinessMeta}>
        <Ionicons name={icon} color={colors.muted} size={16} />
        <Text style={styles.readinessLabel}>{label}</Text>
        <Text style={styles.readinessValue}>{value}</Text>
      </View>
      <View style={styles.readinessTrack}>
        <View style={[styles.readinessFill, { width: value }]} />
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  value,
  danger = false,
  loading = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  loading?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]} onPress={onPress}>
      <Ionicons name={icon} color={danger ? colors.accent : colors.text} size={27} />
      <View style={styles.menuCopy}>
        <Text style={[styles.menuText, danger && styles.menuDanger]}>{label}</Text>
        {value ? <Text numberOfLines={1} style={styles.menuMeta}>{loading ? 'Working...' : value}</Text> : null}
      </View>
      {!danger ? <Ionicons name="chevron-forward" color={colors.muted} size={22} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  avatarWrap: {
    position: 'relative',
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 98,
    height: 98,
    borderRadius: 14,
    borderWidth: 6,
    borderColor: colors.white,
    backgroundColor: colors.slate,
  },
  levelBadge: {
    position: 'absolute',
    right: 0,
    bottom: 10,
    borderRadius: 18,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  levelText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  username: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  region: {
    color: colors.text,
    fontSize: 14,
  },
  editButton: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 0,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  editButtonText: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  profileRail: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  profileRailItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  profileRailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  profileRailAccent: {
    color: colors.primaryDark,
  },
  profileRailLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  readinessRow: {
    gap: spacing.sm,
  },
  readinessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  readinessLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  readinessValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  readinessTrack: {
    height: 7,
    borderRadius: radii.sm,
    backgroundColor: colors.neutral,
    overflow: 'hidden',
  },
  readinessFill: {
    height: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identityRow: {
    minHeight: 68,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  identityLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  identityValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    minHeight: 94,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statValue: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  statAccent: {
    color: colors.accent,
  },
  statLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuRow: {
    minHeight: 62,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  menuCopy: {
    flex: 1,
    gap: 2,
  },
  menuText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  menuMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  menuDanger: {
    color: colors.accent,
  },
  entryRow: {
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.xs,
  },
  entryGame: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  entryMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
  },
});
