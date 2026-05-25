import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { getCommunityRoom, getTournamentRegistrationSummary } from '../../src/api/mechi';
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
  PLAYMECHI_SUPPORT_URL,
  TOURNAMENT_GAME_BY_KEY,
  TOURNAMENT_GAMES,
  TOURNAMENT_REGISTER_URL,
  formatStatus,
} from '../../src/config/tournament';
import { PLAYMECHI_FEED_POSTS } from '../../src/config/feed';
import { colors, radii, spacing } from '../../src/theme';

type HomeAction =
  | {
      type: 'external';
      title: string;
      body: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      external: string;
    }
  | {
      type: 'internal';
      title: string;
      body: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      href: '/(tabs)/arena';
    };

function getStatusTone(status: string | null | undefined): 'good' | 'warn' | 'danger' | 'neutral' {
  if (status === 'verified' || status === 'checked_in' || status === 'paid') return 'good';
  if (status === 'ineligible' || status === 'disqualified' || status === 'no_show') return 'danger';
  if (status === 'pending' || status === 'registered') return 'warn';
  return 'neutral';
}

function getNextTournamentGame(now = new Date()) {
  return (
    TOURNAMENT_GAMES.find((game) => new Date(game.matchStartsAt).getTime() >= now.getTime()) ??
    TOURNAMENT_GAMES[TOURNAMENT_GAMES.length - 1] ??
    null
  );
}

function getCountdownLabel(value: string, now = new Date()) {
  const diffMs = new Date(value).getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Live now';
  }

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getNextAction(registrations: Array<{ check_in_status?: string | null }>): HomeAction {
  if (!registrations.length) {
    return {
      type: 'external',
      title: 'Lock your Weekend Cup slot',
      body: 'Secure your entry on mechi.club. Once you are in, this app becomes your live match desk.',
      label: 'Register now',
      icon: 'globe-outline',
      external: TOURNAMENT_REGISTER_URL,
    };
  }

  const needsCheckIn = registrations.some((registration) => registration.check_in_status !== 'checked_in');
  if (needsCheckIn) {
    return {
      type: 'internal',
      title: 'Check in before lobby drop',
      body: 'Confirm your IGN, UID, device, and WhatsApp so admins can send the right room details.',
      label: 'Open Arena',
      icon: 'trophy-outline',
      href: '/(tabs)/arena',
    };
  }

  return {
    type: 'internal',
    title: 'You are match-ready',
    body: 'Track rooms, fixtures, standings, and admin calls from the Arena desk.',
    label: 'Open match desk',
    icon: 'radio-outline',
    href: '/(tabs)/arena',
  };
}

export default function HomeTab() {
  const { user } = useAuth();
  const summaryQuery = useQuery({
    queryKey: ['tournament-registration'],
    queryFn: getTournamentRegistrationSummary,
  });
  const communityQuery = useQuery({
    queryKey: ['community-room-home'],
    queryFn: () => getCommunityRoom(3),
    staleTime: 20_000,
  });

  const registrations = summaryQuery.data?.registrations ?? [];
  const nextAction = getNextAction(registrations);
  const communityMessages = communityQuery.data?.messages ?? [];
  const latestCommunityMessage = communityMessages[0] ?? null;
  const activeTournament = getNextTournamentGame();
  const countdownLabel = activeTournament ? getCountdownLabel(activeTournament.matchStartsAt) : 'TBA';
  const announcement = PLAYMECHI_FEED_POSTS[0] ?? {
    title: 'PlayMechi updates land here.',
    body: 'Watch this space for official tournament announcements, stream calls, and match-day instructions.',
  };
  const hasEntries = registrations.length > 0;
  const checkedInCount = registrations.filter(
    (registration) => registration.check_in_status === 'checked_in'
  ).length;
  const commandTitle = hasEntries ? 'Weekend Cup command center' : 'Lock your Weekend Cup slot';
  const commandBody = hasEntries
    ? 'Your entries are live. Track check-in, rooms, proof, and announcements from here.'
    : 'Register on mechi.club first. After verification, this app becomes your live match desk.';

  async function openExternal(url: string) {
    await Linking.openURL(url);
  }

  return (
    <Screen title="Home" subtitle="Your active tournament, status, next action, countdown, and official updates.">
      <Card tone="command" style={styles.commandCard}>
        <View style={styles.commandTop}>
          <View style={styles.logoMark}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.commandCopy}>
            <Text style={styles.eyebrow}>PlayMechi HQ</Text>
            <Text style={styles.commandTitle}>{commandTitle}</Text>
            <Text style={styles.commandMeta}>Signed in as {user?.username ?? 'player'}</Text>
          </View>
        </View>
        <Text style={styles.commandBody}>
          {commandBody}
        </Text>
        <View style={styles.commandStats}>
          <View style={styles.commandStat}>
            <Text style={styles.commandStatLabel}>Next match</Text>
            <Text style={styles.commandStatValue}>{countdownLabel}</Text>
          </View>
          <View style={styles.commandStat}>
            <Text style={styles.commandStatLabel}>Entries</Text>
            <Text style={styles.commandStatValue}>{registrations.length}</Text>
          </View>
          <View style={styles.commandStat}>
            <Text style={styles.commandStatLabel}>Checked in</Text>
            <Text style={styles.commandStatValue}>{checkedInCount}</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          {nextAction.type === 'internal' ? (
            <Link href={nextAction.href} asChild>
              <Button label={nextAction.label} icon={nextAction.icon} />
            </Link>
          ) : (
            <Button
              label={nextAction.label}
              icon={nextAction.icon}
              onPress={() => void openExternal(nextAction.external)}
            />
          )}
          <Link href="/(tabs)/feed" asChild>
            <Button label="See Feed" icon="images-outline" variant="secondary" />
          </Link>
        </View>
      </Card>

      <Card style={styles.nextCard} tone={hasEntries ? 'success' : 'default'}>
        <View style={styles.nextIcon}>
          <Ionicons name={nextAction.icon} color={colors.slate} size={20} />
        </View>
        <View style={styles.nextCopy}>
          <Text style={styles.nextTitle}>{nextAction.title}</Text>
          <Text style={textStyles.muted}>{nextAction.body}</Text>
        </View>
      </Card>

      <Card>
        <SectionTitle title="My match desk" />
        {summaryQuery.isLoading ? (
          <LoadingState label="Checking your entries" />
        ) : registrations.length ? (
          <View style={styles.slotList}>
            {registrations.slice(0, 3).map((registration) => (
              <View key={registration.id} style={styles.slotRow}>
                <View style={styles.slotGameIcon}>
                  <Text style={styles.slotGameText}>
                    {TOURNAMENT_GAME_BY_KEY[registration.game].shortLabel.slice(0, 2)}
                  </Text>
                </View>
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
              </View>
            ))}
            <Link href="/(tabs)/arena" asChild>
              <Button label="Open Arena desk" icon="trophy" variant="secondary" />
            </Link>
          </View>
        ) : (
          <>
            <Text style={textStyles.muted}>
              No event entry found yet. Register on mechi.club first, then your rooms, status, and
              results live here.
            </Text>
            <Button
              label="Register on mechi.club"
              icon="globe-outline"
              onPress={() => void openExternal(TOURNAMENT_REGISTER_URL)}
            />
          </>
        )}
      </Card>

      <Card>
        <SectionTitle title="Official announcement" />
        <Text style={styles.announcementTitle}>{announcement.title}</Text>
        <Text style={textStyles.muted}>{announcement.body}</Text>
        <Link href="/(tabs)/feed" asChild>
          <Button label="Read official updates" icon="newspaper" variant="secondary" />
        </Link>
      </Card>

      <Card>
        <SectionTitle title="Quick actions" />
        <View style={styles.quickActions}>
          <Link href="/(tabs)/arena" asChild>
            <Button label="Arena" icon="trophy" />
          </Link>
          <Link href="/(tabs)/community" asChild>
            <Button label="Community" icon="chatbubbles-outline" variant="secondary" />
          </Link>
          <Button
            label="WhatsApp help"
            icon="logo-whatsapp"
            variant="secondary"
            onPress={() => void openExternal(PLAYMECHI_SUPPORT_URL)}
          />
        </View>
        {latestCommunityMessage ? (
          <View style={styles.messageRow}>
            <Text style={styles.messageSender}>
              {latestCommunityMessage.sender?.username ??
                (latestCommunityMessage.sender_type === 'system' ? 'PlayMechi' : 'Player')}
            </Text>
            <Text numberOfLines={2} style={styles.messageBody}>
              {latestCommunityMessage.is_deleted ? 'Removed by moderation.' : latestCommunityMessage.body}
            </Text>
          </View>
        ) : null}
        <InfoRow label="Community members" value={communityQuery.data?.member_count ?? 0} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  commandCard: {
    gap: spacing.md,
  },
  commandTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  commandCopy: {
    flex: 1,
    gap: 3,
  },
  commandTitle: {
    color: colors.white,
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 30,
  },
  commandMeta: {
    color: colors.neutral,
    fontSize: 12,
    fontWeight: '700',
  },
  commandBody: {
    color: colors.neutral,
    fontSize: 14,
    lineHeight: 21,
  },
  commandStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commandStat: {
    flex: 1,
    minHeight: 68,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  commandStatLabel: {
    color: '#b7c5d8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  commandStatValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  hero: {
    borderRadius: radii.md,
    backgroundColor: colors.slate,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoMark: {
    width: 62,
    height: 62,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 42,
    height: 42,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 31,
  },
  heroBody: {
    color: '#dbeafe',
    fontSize: 14,
    lineHeight: 21,
  },
  heroActions: {
    gap: spacing.sm,
  },
  tournamentCard: {
    gap: spacing.md,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tournamentIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  tournamentCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  tournamentTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  countdownPill: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  countdownLabel: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  countdownValue: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  announcementTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  nextTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  slotList: {
    gap: spacing.sm,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    padding: spacing.md,
  },
  slotGameIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.slate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotGameText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  slotCopy: {
    flex: 1,
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
  },
  socialCard: {
    borderColor: 'rgba(50, 224, 196, 0.45)',
  },
  socialTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  socialGrid: {
    gap: spacing.sm,
  },
  socialActions: {
    gap: spacing.sm,
  },
  socialPill: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  socialPillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  messageList: {
    gap: spacing.sm,
  },
  messageRow: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    gap: spacing.xs,
  },
  messageSender: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  messageBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  quickActions: {
    gap: spacing.sm,
  },
});
