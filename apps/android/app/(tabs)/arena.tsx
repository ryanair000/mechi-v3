import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  checkInTournament,
  getTournamentState,
  submitTournamentResult,
} from '../../src/api/mechi';
import { ApiError } from '../../src/api/client';
import {
  Button,
  Card,
  ChipGroup,
  ErrorBanner,
  Field,
  InfoRow,
  LoadingState,
  Screen,
  SectionTitle,
  StatusBadge,
  textStyles,
} from '../../src/components/ui';
import {
  TOURNAMENT_GAME_BY_KEY,
  TOURNAMENT_GAMES,
  formatStatus,
  getGameFromParam,
  getPrizeLabels,
  isBattleRoyaleTournamentGame,
} from '../../src/config/tournament';
import { colors, spacing } from '../../src/theme';
import type {
  OnlineTournamentFixture,
  OnlineTournamentGameKey,
  OnlineTournamentPlayerState,
  OnlineTournamentRegistration,
  OnlineTournamentResultSubmission,
  OnlineTournamentRoom,
  OnlineTournamentStanding,
} from '../../src/types';

const MATCH_NUMBERS = ['1', '2', '3'] as const;

type ScreenshotAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function getStatusTone(status: string | null | undefined): 'good' | 'warn' | 'danger' | 'info' | 'neutral' {
  if (status === 'verified' || status === 'checked_in' || status === 'released' || status === 'completed' || status === 'paid') {
    return 'good';
  }
  if (status === 'rejected' || status === 'disqualified' || status === 'ineligible' || status === 'failed') {
    return 'danger';
  }
  if (status === 'pending' || status === 'registered' || status === 'draft') {
    return 'warn';
  }
  if (status === 'ready') {
    return 'info';
  }
  return 'neutral';
}

function getPlayerName(player: OnlineTournamentFixture['player1']) {
  return player?.in_game_username || player?.username || 'TBA';
}

function getSubmissionLabel(submission: OnlineTournamentResultSubmission) {
  if (submission.match_number) {
    return `Match ${submission.match_number}: ${submission.kills ?? 0} kills, #${submission.placement ?? '-'}`;
  }

  if (submission.player1_score !== null && submission.player2_score !== null) {
    return `${submission.player1_score}-${submission.player2_score}`;
  }

  return formatStatus(submission.status);
}

export default function ArenaTab() {
  const params = useLocalSearchParams<{ game?: string }>();
  const queryClient = useQueryClient();
  const [activeGame, setActiveGame] = useState<OnlineTournamentGameKey>(() =>
    getGameFromParam(params.game)
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [matchNumber, setMatchNumber] = useState<(typeof MATCH_NUMBERS)[number]>('1');
  const [kills, setKills] = useState('');
  const [placement, setPlacement] = useState('');
  const [fixtureId, setFixtureId] = useState('');
  const [player1Score, setPlayer1Score] = useState('');
  const [player2Score, setPlayer2Score] = useState('');
  const [screenshot, setScreenshot] = useState<ScreenshotAsset | null>(null);

  const stateQuery = useQuery({
    queryKey: ['tournament-state'],
    queryFn: getTournamentState,
    refetchInterval: 25_000,
  });
  const state = stateQuery.data;
  const config = TOURNAMENT_GAME_BY_KEY[activeGame];
  const myRegistration =
    state?.myRegistrations.find((registration) => registration.game === activeGame) ?? null;
  const myRegistrationIds = useMemo(
    () => new Set(state?.myRegistrations.map((registration) => registration.id) ?? []),
    [state?.myRegistrations]
  );
  const activeRooms = useMemo(
    () => (state?.rooms ?? []).filter((room) => room.game === activeGame),
    [activeGame, state?.rooms]
  );
  const activeSubmissions = useMemo(
    () => (state?.mySubmissions ?? []).filter((submission) => submission.game === activeGame),
    [activeGame, state?.mySubmissions]
  );
  const activeFixtures = useMemo(
    () => [...(state?.fixtures ?? [])].sort((left, right) => left.slot - right.slot),
    [state?.fixtures]
  );
  const myFixtures = useMemo(
    () =>
      activeFixtures.filter(
        (fixture) =>
          Boolean(fixture.player1_registration_id && myRegistrationIds.has(fixture.player1_registration_id)) ||
          Boolean(fixture.player2_registration_id && myRegistrationIds.has(fixture.player2_registration_id))
      ),
    [activeFixtures, myRegistrationIds]
  );
  const selectableFixtures = myFixtures.filter(
    (fixture) => fixture.status !== 'completed' && fixture.status !== 'bye'
  );
  const selectedFixtureId = selectableFixtures.some((fixture) => fixture.id === fixtureId)
    ? fixtureId
    : selectableFixtures[0]?.id || '';
  const standings =
    activeGame === 'pubgm' || activeGame === 'codm' ? state?.standings[activeGame] ?? [] : [];

  const checkInMutation = useMutation({
    mutationFn: () => checkInTournament(activeGame),
    onSuccess: async (nextState) => {
      setError(null);
      setNotice('Checked in for match night.');
      queryClient.setQueryData(['tournament-state'], nextState);
      await queryClient.invalidateQueries({ queryKey: ['tournament-registration'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not check in.');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!screenshot) {
        throw new Error('Choose a screenshot first.');
      }

      if (activeGame === 'efootball') {
        return submitTournamentResult({
          game: 'efootball',
          uri: screenshot.uri,
          name: screenshot.fileName,
          mimeType: screenshot.mimeType,
          fixture_id: selectedFixtureId,
          player1_score: Number(player1Score),
          player2_score: Number(player2Score),
        });
      }

      return submitTournamentResult({
        game: activeGame,
        uri: screenshot.uri,
        name: screenshot.fileName,
        mimeType: screenshot.mimeType,
        match_number: Number(matchNumber),
        kills: Number(kills),
        placement: Number(placement),
      });
    },
    onSuccess: async (nextState) => {
      setError(null);
      setNotice('Result uploaded for admin review.');
      setKills('');
      setPlacement('');
      setPlayer1Score('');
      setPlayer2Score('');
      setScreenshot(null);
      queryClient.setQueryData(['tournament-state'], nextState);
      await queryClient.invalidateQueries({ queryKey: ['tournament-registration'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not upload result.');
    },
  });

  async function pickScreenshot() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to upload proof.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) return;

    setScreenshot(result.assets[0]);
  }

  async function openWhatsAppGroup() {
    await Linking.openURL(config.whatsappGroupUrl);
  }

  const canUploadBattleRoyale =
    Boolean(myRegistration && screenshot) &&
    activeGame !== 'efootball' &&
    kills.trim() !== '' &&
    placement.trim() !== '';
  const canUploadEfootball =
    Boolean(myRegistration && screenshot) &&
    activeGame === 'efootball' &&
    Boolean(selectedFixtureId) &&
    player1Score.trim() !== '' &&
    player2Score.trim() !== '';

  return (
    <Screen title="Tournament Desk" subtitle="Check in, view rooms or fixtures, and upload results.">
      <Card>
        <SectionTitle title="Game desk" />
        <ChipGroup
          options={TOURNAMENT_GAMES.map((game) => ({ label: game.shortLabel, value: game.game }))}
          value={activeGame}
          onChange={(value) => {
            setActiveGame(value);
            setError(null);
            setNotice(null);
            setScreenshot(null);
          }}
        />
        <InfoRow label="Match day" value={`${config.dateLabel}, ${config.timeLabel}`} />
        <InfoRow label="Format" value={config.format} />
      </Card>

      {stateQuery.isLoading ? <LoadingState label="Loading tournament desk" /> : null}
      {stateQuery.isError ? (
        <ErrorBanner message="Could not load the tournament desk. This usually means the live tournament storage or API connection needs attention." />
      ) : null}
      <ErrorBanner message={error} />
      {notice ? (
        <Card>
          <Text style={textStyles.body}>{notice}</Text>
        </Card>
      ) : null}

      <PlayerStatusCard
        activeGame={activeGame}
        registration={myRegistration}
        onCheckIn={() => checkInMutation.mutate()}
        checkingIn={checkInMutation.isPending}
        onOpenGroup={() => void openWhatsAppGroup()}
      />

      {isBattleRoyaleTournamentGame(activeGame) ? (
        <>
          <BattleRoyaleRooms rooms={activeRooms as OnlineTournamentRoom[]} />
          <BattleRoyaleStandings standings={standings} />
        </>
      ) : (
        <EfootballFixtures fixtures={activeFixtures} myRegistrationIds={myRegistrationIds} />
      )}

      <ResultUploadCard
        activeGame={activeGame}
        registration={myRegistration}
        matchNumber={matchNumber}
        kills={kills}
        placement={placement}
        fixtureId={selectedFixtureId}
        fixtures={selectableFixtures}
        player1Score={player1Score}
        player2Score={player2Score}
        screenshot={screenshot}
        uploading={uploadMutation.isPending}
        canUpload={canUploadBattleRoyale || canUploadEfootball}
        onMatchNumberChange={setMatchNumber}
        onKillsChange={setKills}
        onPlacementChange={setPlacement}
        onFixtureChange={setFixtureId}
        onPlayer1ScoreChange={setPlayer1Score}
        onPlayer2ScoreChange={setPlayer2Score}
        onPickScreenshot={() => void pickScreenshot()}
        onUpload={() => uploadMutation.mutate()}
      />

      <MySubmissions submissions={activeSubmissions} />
      <PrizePanel activeGame={activeGame} state={state} />
    </Screen>
  );
}

function PlayerStatusCard({
  activeGame,
  registration,
  onCheckIn,
  checkingIn,
  onOpenGroup,
}: {
  activeGame: OnlineTournamentGameKey;
  registration: OnlineTournamentRegistration | null;
  onCheckIn: () => void;
  checkingIn: boolean;
  onOpenGroup: () => void;
}) {
  const config = TOURNAMENT_GAME_BY_KEY[activeGame];

  if (!registration) {
    return (
      <Card>
        <SectionTitle title="No slot yet" />
        <Text style={textStyles.muted}>
          Register for {config.label} before room credentials, fixtures, and result uploads unlock.
        </Text>
        <Link href={`/(tabs)/register?game=${activeGame}`} asChild>
          <Button label={`Register for ${config.shortLabel}`} icon="ticket" />
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle title={registration.in_game_username} />
      <View style={styles.badgeRow}>
        <StatusBadge label={formatStatus(registration.check_in_status)} tone={getStatusTone(registration.check_in_status)} />
        <StatusBadge label={formatStatus(registration.eligibility_status)} tone={getStatusTone(registration.eligibility_status)} />
      </View>
      <InfoRow label="Instagram" value={registration.instagram_username ? `@${registration.instagram_username}` : 'Not submitted'} selectable />
      <InfoRow label="YouTube" value={registration.youtube_name ?? 'Not submitted'} selectable />
      <View style={styles.actionGrid}>
        <Button
          label={registration.check_in_status === 'checked_in' ? 'Checked in' : 'Check in'}
          icon="checkmark-circle"
          loading={checkingIn}
          disabled={registration.check_in_status === 'checked_in'}
          onPress={onCheckIn}
        />
        <Button
          label="WhatsApp group"
          icon="logo-whatsapp"
          variant="secondary"
          onPress={onOpenGroup}
        />
      </View>
    </Card>
  );
}

function BattleRoyaleRooms({ rooms }: { rooms: OnlineTournamentRoom[] }) {
  const roomByMatch = new Map(rooms.map((room) => [room.match_number, room]));

  return (
    <Card>
      <SectionTitle title="Rooms" />
      <View style={styles.roomGrid}>
        {MATCH_NUMBERS.map((matchNumber) => {
          const room = roomByMatch.get(Number(matchNumber));
          const released = Boolean(room?.credentials_released);

          return (
            <View key={matchNumber} style={styles.roomCard}>
              <View style={styles.roomHeader}>
                <Text style={styles.roomTitle}>Match {matchNumber}</Text>
                <StatusBadge label={formatStatus(room?.status ?? 'draft')} tone={getStatusTone(room?.status)} />
              </View>
              <InfoRow label="Map" value={room?.map_name ?? room?.title ?? 'TBA'} />
              <InfoRow label="Room ID" value={released ? room?.room_id || 'TBA' : 'Locked'} selectable={released} />
              <InfoRow label="Password" value={released ? room?.room_password || 'TBA' : 'Locked'} selectable={released} />
              {room?.instructions ? <Text style={textStyles.muted}>{room.instructions}</Text> : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function BattleRoyaleStandings({ standings }: { standings: OnlineTournamentStanding[] }) {
  return (
    <Card>
      <SectionTitle title="Verified standings" />
      {standings.length ? (
        <View style={styles.list}>
          {standings.slice(0, 12).map((standing) => (
            <View key={standing.registration.id} style={styles.standingRow}>
              <Text style={styles.rank}>#{standing.rank}</Text>
              <View style={styles.listCopy}>
                <Text style={styles.rowTitle}>{standing.registration.in_game_username}</Text>
                <Text style={styles.rowMeta}>
                  M1 {standing.matchKills[1]} | M2 {standing.matchKills[2]} | M3 {standing.matchKills[3]}
                </Text>
              </View>
              <Text style={styles.kills}>{standing.totalKills} kills</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={textStyles.muted}>Standings appear after admins verify result screenshots.</Text>
      )}
    </Card>
  );
}

function EfootballFixtures({
  fixtures,
  myRegistrationIds,
}: {
  fixtures: OnlineTournamentFixture[];
  myRegistrationIds: Set<string>;
}) {
  return (
    <Card>
      <SectionTitle title="eFootball bracket" />
      {fixtures.length ? (
        <View style={styles.list}>
          {fixtures.map((fixture) => {
            const mine =
              Boolean(fixture.player1_registration_id && myRegistrationIds.has(fixture.player1_registration_id)) ||
              Boolean(fixture.player2_registration_id && myRegistrationIds.has(fixture.player2_registration_id));

            return (
              <View key={fixture.id} style={[styles.fixtureCard, mine && styles.fixtureMine]}>
                <View style={styles.fixtureHeader}>
                  <Text style={styles.rowMeta}>
                    {fixture.round_label} #{fixture.slot + 1}
                  </Text>
                  <StatusBadge label={formatStatus(fixture.status)} tone={getStatusTone(fixture.status)} />
                </View>
                <FixturePlayer
                  name={getPlayerName(fixture.player1)}
                  score={fixture.player1_score}
                  winner={fixture.winner_registration_id === fixture.player1_registration_id}
                />
                <FixturePlayer
                  name={getPlayerName(fixture.player2)}
                  score={fixture.player2_score}
                  winner={fixture.winner_registration_id === fixture.player2_registration_id}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={textStyles.muted}>Bracket seeding will appear here once admins publish fixtures.</Text>
      )}
    </Card>
  );
}

function FixturePlayer({ name, score, winner }: { name: string; score: number | null; winner: boolean }) {
  return (
    <View style={styles.fixturePlayer}>
      <Text style={styles.fixtureName}>{name}</Text>
      <Text style={[styles.fixtureScore, winner && styles.fixtureWinner]}>{score ?? '-'}</Text>
    </View>
  );
}

function ResultUploadCard({
  activeGame,
  registration,
  matchNumber,
  kills,
  placement,
  fixtureId,
  fixtures,
  player1Score,
  player2Score,
  screenshot,
  uploading,
  canUpload,
  onMatchNumberChange,
  onKillsChange,
  onPlacementChange,
  onFixtureChange,
  onPlayer1ScoreChange,
  onPlayer2ScoreChange,
  onPickScreenshot,
  onUpload,
}: {
  activeGame: OnlineTournamentGameKey;
  registration: OnlineTournamentRegistration | null;
  matchNumber: (typeof MATCH_NUMBERS)[number];
  kills: string;
  placement: string;
  fixtureId: string;
  fixtures: OnlineTournamentFixture[];
  player1Score: string;
  player2Score: string;
  screenshot: ScreenshotAsset | null;
  uploading: boolean;
  canUpload: boolean;
  onMatchNumberChange: (value: (typeof MATCH_NUMBERS)[number]) => void;
  onKillsChange: (value: string) => void;
  onPlacementChange: (value: string) => void;
  onFixtureChange: (value: string) => void;
  onPlayer1ScoreChange: (value: string) => void;
  onPlayer2ScoreChange: (value: string) => void;
  onPickScreenshot: () => void;
  onUpload: () => void;
}) {
  return (
    <Card>
      <SectionTitle title="Upload result" />
      {!registration ? (
        <Text style={textStyles.muted}>Register for this game before uploading screenshots.</Text>
      ) : activeGame === 'efootball' ? (
        <>
          {fixtures.length ? (
            <ChipGroup
              options={fixtures.map((fixture) => ({
                label: `${fixture.round_label} #${fixture.slot + 1}`,
                value: fixture.id,
              }))}
              value={fixtureId || fixtures[0]?.id || ''}
              onChange={onFixtureChange}
            />
          ) : (
            <Text style={textStyles.muted}>No active fixture assigned yet.</Text>
          )}
          <View style={styles.scoreGrid}>
            <Field
              label="Player 1 score"
              value={player1Score}
              onChangeText={onPlayer1ScoreChange}
              keyboardType="number-pad"
              placeholder="0"
            />
            <Field
              label="Player 2 score"
              value={player2Score}
              onChangeText={onPlayer2ScoreChange}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
        </>
      ) : (
        <>
          <ChipGroup
            options={MATCH_NUMBERS.map((value) => ({ label: `Match ${value}`, value }))}
            value={matchNumber}
            onChange={onMatchNumberChange}
          />
          <View style={styles.scoreGrid}>
            <Field label="Kills" value={kills} onChangeText={onKillsChange} keyboardType="number-pad" placeholder="0" />
            <Field label="Placement" value={placement} onChangeText={onPlacementChange} keyboardType="number-pad" placeholder="1" />
          </View>
        </>
      )}
      <Pressable style={({ pressed }) => [styles.uploadBox, pressed && styles.pressed]} onPress={onPickScreenshot}>
        <Text style={styles.uploadTitle}>{screenshot ? screenshot.fileName ?? 'Screenshot selected' : 'Choose screenshot'}</Text>
        <Text style={styles.uploadMeta}>PNG, JPG, or WEBP under 10MB</Text>
      </Pressable>
      <Button
        label="Submit for admin review"
        icon="cloud-upload"
        loading={uploading}
        disabled={!canUpload}
        onPress={onUpload}
      />
    </Card>
  );
}

function MySubmissions({ submissions }: { submissions: OnlineTournamentResultSubmission[] }) {
  return (
    <Card>
      <SectionTitle title="My submissions" />
      {submissions.length ? (
        <View style={styles.list}>
          {submissions.slice(0, 6).map((submission) => (
            <View key={submission.id} style={styles.submissionRow}>
              <View style={styles.listCopy}>
                <Text style={styles.rowTitle}>{getSubmissionLabel(submission)}</Text>
                {submission.admin_note ? <Text style={styles.rowMeta}>{submission.admin_note}</Text> : null}
              </View>
              <StatusBadge label={formatStatus(submission.status)} tone={getStatusTone(submission.status)} />
            </View>
          ))}
        </View>
      ) : (
        <Text style={textStyles.muted}>No uploaded screenshots yet.</Text>
      )}
    </Card>
  );
}

function PrizePanel({
  activeGame,
  state,
}: {
  activeGame: OnlineTournamentGameKey;
  state: OnlineTournamentPlayerState | undefined;
}) {
  const prizes = getPrizeLabels(activeGame);
  const payouts = state?.payouts.filter((payout) => payout.game === activeGame) ?? [];

  return (
    <Card>
      <SectionTitle title="Prize desk" />
      <View style={styles.list}>
        {prizes.map((prize, index) => {
          const payout = payouts.find((item) => item.placement === index + 1);
          return (
            <View key={prize} style={styles.prizeRow}>
              <View>
                <Text style={styles.rowTitle}>#{index + 1}</Text>
                <Text style={styles.rowMeta}>{payout?.prize_label ?? prize}</Text>
              </View>
              <StatusBadge
                label={formatStatus(payout?.payout_status ?? 'pending')}
                tone={getStatusTone(payout?.payout_status)}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionGrid: {
    gap: spacing.sm,
  },
  roomGrid: {
    gap: spacing.md,
  },
  roomCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  roomTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  list: {
    gap: spacing.sm,
  },
  standingRow: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rank: {
    color: colors.accent,
    width: 42,
    fontSize: 15,
    fontWeight: '900',
  },
  listCopy: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  kills: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  fixtureCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fixtureMine: {
    borderColor: 'rgba(50, 224, 196, 0.32)',
    backgroundColor: 'rgba(50, 224, 196, 0.08)',
  },
  fixtureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  fixturePlayer: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  fixtureName: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  fixtureScore: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  fixtureWinner: {
    color: colors.accent,
  },
  scoreGrid: {
    gap: spacing.sm,
  },
  uploadBox: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  uploadTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  uploadMeta: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  submissionRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  prizeRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
});
