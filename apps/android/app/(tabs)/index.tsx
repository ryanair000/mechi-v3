import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getProfile, getTournamentRegistrationSummary } from '../../src/api/mechi';
import { useAuth } from '../../src/auth/AuthProvider';
import {
  Button,
  Card,
  ErrorBanner,
  InfoRow,
  LoadingState,
  ProgressBar,
  Screen,
  SectionTitle,
  StatPill,
  StatusBadge,
  textStyles,
} from '../../src/components/ui';
import {
  PLAYMECHI_SUPPORT_LABEL,
  PLAYMECHI_SUPPORT_URL,
  TOURNAMENT_DATES,
  TOURNAMENT_GAME_BY_KEY,
  TOURNAMENT_GAMES,
  TOURNAMENT_PRIZE_POOL,
  TOURNAMENT_RULES,
  TOURNAMENT_TIME,
  TOURNAMENT_TITLE,
  formatStatus,
  getFallbackTournamentSummary,
  getTournamentTotals,
} from '../../src/config/tournament';
import { colors, spacing } from '../../src/theme';
import type { OnlineTournamentGameKey, OnlineTournamentRegistrationSummary } from '../../src/types';

function getStatusTone(status: string | null | undefined): 'good' | 'warn' | 'danger' | 'neutral' {
  if (status === 'verified' || status === 'checked_in') return 'good';
  if (status === 'ineligible' || status === 'disqualified' || status === 'no_show') return 'danger';
  if (status === 'pending' || status === 'registered') return 'warn';
  return 'neutral';
}

function getSummaryProgress(summary: OnlineTournamentRegistrationSummary) {
  const totals = getTournamentTotals(summary);
  return totals.slots > 0 ? Math.round((totals.registered / totals.slots) * 100) : 0;
}

export default function OverviewTab() {
  const { user } = useAuth();
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const summaryQuery = useQuery({
    queryKey: ['tournament-registration'],
    queryFn: getTournamentRegistrationSummary,
    refetchInterval: 30_000,
  });

  const profile = profileQuery.data?.profile ?? user;
  const summary = summaryQuery.data ?? getFallbackTournamentSummary();
  const totals = getTournamentTotals(summary);
  const registrations = summary.registrations ?? [];
  const primaryRegistration = registrations[0];

  async function openSupport() {
    await Linking.openURL(PLAYMECHI_SUPPORT_URL);
  }

  return (
    <Screen
      title={TOURNAMENT_TITLE}
      subtitle={`Tournament-only app for ${TOURNAMENT_DATES}. Matches start at ${TOURNAMENT_TIME}.`}
    >
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <StatusBadge label="Registration live" tone="good" />
            <Text style={styles.heroTitle}>Claim your PlayMechi slot</Text>
            <Text style={textStyles.muted}>
              PUBG Mobile, CODM, and eFootball players compete online for {TOURNAMENT_PRIZE_POOL}.
            </Text>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>{totals.registered}</Text>
            <Text style={styles.scoreLabel}>players</Text>
          </View>
        </View>
        <ProgressBar value={getSummaryProgress(summary)} />
        <View style={styles.statsRow}>
          <StatPill label="Slots" value={totals.slots} />
          <StatPill label="Left" value={totals.spotsLeft} />
          <StatPill label="Prize" value={TOURNAMENT_PRIZE_POOL} />
        </View>
      </Card>

      {summaryQuery.isError ? (
        <ErrorBanner message="Live slot sync is unavailable in this session. The app will still show fixed tournament facts." />
      ) : null}

      {summaryQuery.isLoading ? <LoadingState label="Syncing tournament slots" /> : null}

      {primaryRegistration ? (
        <Card>
          <SectionTitle title={`Your slot: ${TOURNAMENT_GAME_BY_KEY[primaryRegistration.game].label}`} />
          <InfoRow label="Gamer tag" value={primaryRegistration.in_game_username} selectable />
          <View style={styles.badgeRow}>
            <StatusBadge
              label={formatStatus(primaryRegistration.check_in_status)}
              tone={getStatusTone(primaryRegistration.check_in_status)}
            />
            <StatusBadge
              label={formatStatus(primaryRegistration.eligibility_status)}
              tone={getStatusTone(primaryRegistration.eligibility_status)}
            />
          </View>
          <Link href={`/(tabs)/arena?game=${primaryRegistration.game}`} asChild>
            <Button label="Open tournament desk" icon="clipboard" />
          </Link>
        </Card>
      ) : (
        <Card>
          <SectionTitle title={`Hi, ${profile?.username ?? 'player'}`} />
          <Text style={textStyles.muted}>
            Register for one game, confirm your exact in-game username, and add your PlayMechi
            Instagram/YouTube proof for reward review.
          </Text>
          <Link href="/(tabs)/register" asChild>
            <Button label="Register for PlayMechi" icon="ticket" />
          </Link>
        </Card>
      )}

      <SectionTitle title="Games" />
      <View style={styles.gameList}>
        {TOURNAMENT_GAMES.map((game) => (
          <GameOverviewCard key={game.game} game={game.game} summary={summary} />
        ))}
      </View>

      <Card>
        <SectionTitle title="Match-night checklist" />
        <View style={styles.ruleList}>
          {TOURNAMENT_RULES.slice(0, 5).map((rule) => (
            <View key={rule} style={styles.ruleRow}>
              <View style={styles.ruleDot} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Button
        label={`WhatsApp support: ${PLAYMECHI_SUPPORT_LABEL}`}
        icon="logo-whatsapp"
        variant="secondary"
        onPress={() => void openSupport()}
      />
    </Screen>
  );
}

function GameOverviewCard({
  game,
  summary,
}: {
  game: OnlineTournamentGameKey;
  summary: OnlineTournamentRegistrationSummary;
}) {
  const config = TOURNAMENT_GAME_BY_KEY[game];
  const count = summary.games[game];
  const registered = count?.registered ?? 0;
  const slots = count?.slots ?? config.slots;
  const spotsLeft = count?.spotsLeft ?? Math.max(0, slots - registered);
  const full = Boolean(count?.full || config.registrationClosed);
  const progress = slots > 0 ? Math.round((registered / slots) * 100) : 0;

  return (
    <Link href={`/(tabs)/register?game=${game}`} asChild>
      <Pressable style={({ pressed }) => [styles.gameCard, pressed && styles.pressed]}>
        <View style={styles.gameHeader}>
          <View style={styles.gameTitleWrap}>
            <Text style={styles.gameTitle}>{config.label}</Text>
            <Text style={styles.gameMeta}>
              {config.dateLabel} . {config.timeLabel}
            </Text>
          </View>
          <StatusBadge label={full ? 'closed' : `${spotsLeft} left`} tone={full ? 'danger' : 'good'} />
        </View>
        <ProgressBar value={progress} />
        <View style={styles.gameDetails}>
          <InfoRow label="Format" value={config.matchCount} />
          <InfoRow label="Prize" value={`${config.firstPrize} / ${config.secondPrize}`} />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderColor: 'rgba(50, 224, 196, 0.28)',
    backgroundColor: '#0f1b14',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  scoreBadge: {
    width: 82,
    minHeight: 82,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.28)',
    backgroundColor: 'rgba(255, 209, 102, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gameList: {
    gap: spacing.md,
  },
  gameCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  gameTitleWrap: {
    flex: 1,
  },
  gameTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  gameMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  gameDetails: {
    gap: spacing.xs,
  },
  ruleList: {
    gap: spacing.sm,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  ruleDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  ruleText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.82,
  },
});
