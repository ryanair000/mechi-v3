import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getTournamentRegistrationSummary } from '../../src/api/mechi';
import { useAuth } from '../../src/auth/AuthProvider';
import { Card, KineticScreen, Label, PrimaryButton } from '../../src/components/kinetic';
import { PLAYMECHI_SUPPORT_URL, TOURNAMENT_REGISTER_URL } from '../../src/config/tournament';
import { PLAYMECHI_FEED_POSTS } from '../../src/config/feed';
import { colors, radii, spacing } from '../../src/theme';

export default function HomeTab() {
  const { user } = useAuth();
  const summaryQuery = useQuery({
    queryKey: ['tournament-registration'],
    queryFn: getTournamentRegistrationSummary,
  });
  const registrations = summaryQuery.data?.registrations ?? [];
  const activeName = registrations[0]?.in_game_username || user?.username || 'PlayerOne';
  const announcement = PLAYMECHI_FEED_POSTS[0];

  async function openRegister() {
    await Linking.openURL(TOURNAMENT_REGISTER_URL);
  }

  async function openSupport() {
    await Linking.openURL(PLAYMECHI_SUPPORT_URL);
  }

  return (
    <KineticScreen>
      <View style={styles.welcomeRow}>
        <View style={styles.welcomeCopy}>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.playerName}>{activeName}</Text>
        </View>
        <Image source={require('../../assets/icon.png')} style={styles.avatar} />
      </View>

      <View style={styles.commandCard}>
        <View style={styles.commandTop}>
          <View style={styles.commandCopy}>
            <Label>Live Registration</Label>
            <Text style={styles.commandTitle}>Weekend Cup Season 1</Text>
            <Text style={styles.commandMeta}>Free Fire - Squad - 50,000 Prizepool</Text>
          </View>
          <View style={styles.closingSoon}>
            <View style={styles.statusDot} />
            <Text style={styles.closingText}>Closing{'\n'}Soon</Text>
          </View>
        </View>
        <View style={styles.timerBox}>
          <Ionicons name="time-outline" color={colors.neutral} size={24} />
          <Text style={styles.timerLabel}>Registration closes in:</Text>
          <Text style={styles.timer}>02:14:59</Text>
        </View>
        <View style={styles.commandStats}>
          <CommandStat label="Slots" value="48/64" />
          <CommandStat label="Entry" value="Free" />
          <CommandStat label="Mode" value="Squad" />
        </View>
        <PrimaryButton label="Register Now" onPress={() => void openRegister()} />
      </View>

      <View style={styles.section}>
        <Label muted>My Active Matches</Label>
        <Card style={styles.matchCard}>
          <View style={styles.matchIcon}>
            <Ionicons name="game-controller-outline" color={colors.white} size={27} />
          </View>
          <View style={styles.matchCopy}>
            <Text style={styles.matchTitle}>PUBG Mobile Daily Scrims</Text>
            <Text style={styles.matchMeta}>Match starts in 45 mins</Text>
          </View>
          <Link href="/(tabs)/arena" asChild>
            <Pressable style={styles.checkInButton}>
              <Text style={styles.checkInText}>Check-in</Text>
            </Pressable>
          </Link>
        </Card>
      </View>

      <Link href="/(tabs)/feed" asChild>
        <Pressable style={({ pressed }) => [styles.announcement, pressed && styles.pressed]}>
          <View style={styles.announcementShade} />
          <View style={styles.announcementGrid}>
            <View style={styles.announcementPanel} />
            <View style={styles.announcementPanelSmall} />
            <View style={styles.announcementPanelTall} />
          </View>
          <Text style={styles.pill}>Announcement</Text>
          <Text style={styles.announcementTitle}>
            {announcement?.title ?? 'New Season Prizes Revealed!'}
          </Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsText}>View Details</Text>
            <Ionicons name="arrow-forward" color={colors.primary} size={24} />
          </View>
        </Pressable>
      </Link>

      <View style={styles.quickGrid}>
        <QuickTile href="/(tabs)/arena" icon="trophy-outline" label="Arena" />
        <QuickTile href="/(tabs)/feed" icon="logo-rss" label="Feed" />
        <QuickTile href="/(tabs)/community" icon="people-outline" label="Community" />
        <Pressable style={styles.quickTile} onPress={() => void openSupport()}>
          <View style={styles.quickIcon}>
            <Ionicons name="help-circle-outline" color={colors.text} size={25} />
          </View>
          <Text style={styles.quickText}>Support</Text>
        </Pressable>
      </View>

      <Card style={styles.operationsCard}>
        <View style={styles.operationTitleRow}>
          <Ionicons name="library-outline" color={colors.muted} size={20} />
          <Label muted>Command Center</Label>
        </View>
        <OperationRow
          icon="shield-checkmark-outline"
          title="Tournament Pass"
          description="Confirm entry, lobby, and proof status"
          tag="Ready"
        />
        <OperationRow
          icon="flag-outline"
          title="Weekend Cup"
          description="Free Fire squad registration is open"
          tag="Live"
          accent
        />
        <OperationRow
          icon="people-outline"
          title="Community"
          description="Join squads and get match support"
          tag="Open"
        />
      </Card>
    </KineticScreen>
  );
}

function CommandStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.commandStat}>
      <Text style={styles.commandStatValue}>{value}</Text>
      <Text style={styles.commandStatLabel}>{label}</Text>
    </View>
  );
}

function QuickTile({
  href,
  icon,
  label,
}: {
  href: '/(tabs)/arena' | '/(tabs)/feed' | '/(tabs)/community';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.quickTile}>
        <View style={styles.quickIcon}>
          <Ionicons name={icon} color={colors.text} size={25} />
        </View>
        <Text style={styles.quickText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function OperationRow({
  icon,
  title,
  description,
  tag,
  accent = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tag: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.operationRow}>
      <View style={styles.operationIcon}>
        <Ionicons name={icon} color={colors.muted} size={20} />
      </View>
      <View style={styles.operationCopy}>
        <Text style={styles.operationTitle}>{title}</Text>
        <Text style={styles.operationDescription}>{description}</Text>
      </View>
      <View style={[styles.operationTag, accent && styles.operationTagAccent]}>
        <Text style={[styles.operationTagText, accent && styles.operationTagTextAccent]}>{tag}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeCopy: {
    gap: spacing.xs,
  },
  welcome: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
  },
  playerName: {
    color: colors.slate,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 13,
    backgroundColor: colors.slate,
  },
  commandCard: {
    backgroundColor: colors.slate,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(50,224,196,0.25)',
    boxShadow: '0 8px 18px rgba(50,224,196,0.12)',
    padding: spacing.lg,
    gap: spacing.md,
  },
  commandTop: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commandCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  commandTitle: {
    color: colors.white,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  commandMeta: {
    color: colors.neutral,
    fontSize: 16,
    lineHeight: 23,
  },
  closingSoon: {
    minWidth: 118,
    height: 58,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.55)',
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,107,107,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  closingText: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  timerBox: {
    minHeight: 62,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timerLabel: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  timer: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  commandStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commandStat: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  commandStatValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  commandStatLabel: {
    color: colors.neutral,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  section: {
    gap: spacing.lg,
  },
  matchCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.slate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  matchTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  matchMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  checkInButton: {
    minHeight: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  announcement: {
    minHeight: 150,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.slate,
    padding: spacing.lg,
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  announcementShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d2630',
  },
  announcementGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  announcementPanel: {
    width: 58,
    height: 96,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(50,224,196,0.2)',
  },
  announcementPanelSmall: {
    width: 44,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  announcementPanelTall: {
    width: 36,
    height: 118,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,107,107,0.16)',
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    color: colors.slate,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  announcementTitle: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    maxWidth: 310,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailsText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickTile: {
    flex: 1,
    minHeight: 94,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: '#dde3eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  pressed: {
    opacity: 0.82,
  },
  operationsCard: {
    gap: spacing.md,
  },
  operationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  operationRow: {
    minHeight: 62,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  operationIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationCopy: {
    flex: 1,
    gap: 2,
  },
  operationTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  operationDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  operationTag: {
    borderRadius: radii.sm,
    backgroundColor: colors.neutral,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  operationTagAccent: {
    backgroundColor: 'rgba(255,107,107,0.12)',
  },
  operationTagText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  operationTagTextAccent: {
    color: colors.accent,
  },
});
