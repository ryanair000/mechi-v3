import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  checkInTournament,
  getTournamentState,
  submitTournamentResult,
} from '../../src/api/mechi';
import { ApiError } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
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
  TOURNAMENT_PUBLIC_URL,
  TOURNAMENT_GAME_BY_KEY,
  TOURNAMENT_GAMES,
  TOURNAMENT_REGISTER_URL,
  formatEatDateTime,
  formatStatus,
  formatTournamentLobby,
  getGameFromParam,
  getPrizeLabels,
  isBattleRoyaleTournamentGame,
  normalizeTournamentDeviceSerialLast6,
  requiresTournamentDeviceSerialLast6,
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

type PlayerCheckInDetails = {
  ign: string;
  uid: string;
  device: string;
  whatsappNumber: string;
  deviceSerialLast6: string;
};

function getStatusTone(
  status: string | null | undefined
): 'good' | 'warn' | 'danger' | 'info' | 'neutral' {
  if (
    status === 'verified' ||
    status === 'checked_in' ||
    status === 'released' ||
    status === 'completed' ||
    status === 'paid'
  ) {
    return 'good';
  }

  if (
    status === 'rejected' ||
    status === 'disqualified' ||
    status === 'ineligible' ||
    status === 'failed'
  ) {
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

function buildPlayerCheckInDetails(params: {
  registration: OnlineTournamentRegistration | null;
  fallbackWhatsappNumber: string;
}): PlayerCheckInDetails {
  const { registration, fallbackWhatsappNumber } = params;

  return {
    ign: registration?.in_game_username ?? '',
    uid: registration?.game_uid ?? '',
    device: registration?.device_model ?? '',
    whatsappNumber: registration?.whatsapp_number ?? fallbackWhatsappNumber,
    deviceSerialLast6: registration?.device_serial_last6 ?? '',
  };
}

function getSavedCheckInLength(value: string | null | undefined) {
  return value?.trim().length ?? 0;
}

function hasSubmittedCheckIn(registration: OnlineTournamentRegistration | null) {
  return Boolean(
    registration &&
      registration.check_in_status === 'checked_in' &&
      registration.eligibility_status !== 'disqualified'
  );
}

function hasRequiredCheckInDetailsExcludingSerial(
  registration: OnlineTournamentRegistration | null
) {
  if (!registration) {
    return false;
  }

  return Boolean(
    getSavedCheckInLength(registration.in_game_username) >= 2 &&
      getSavedCheckInLength(registration.game_uid) >= 2 &&
      getSavedCheckInLength(registration.device_model) >= 2 &&
      getSavedCheckInLength(registration.whatsapp_number) >= 7
  );
}

function hasLegacySerialSyncGap(registration: OnlineTournamentRegistration | null) {
  if (!registration || !requiresTournamentDeviceSerialLast6(registration.game)) {
    return false;
  }

  if (
    registration.check_in_status !== 'checked_in' ||
    registration.eligibility_status === 'disqualified'
  ) {
    return false;
  }

  if (!hasRequiredCheckInDetailsExcludingSerial(registration)) {
    return false;
  }

  if (normalizeTournamentDeviceSerialLast6(registration.device_serial_last6).length === 6) {
    return false;
  }

  return Boolean(
    registration.checked_in_at ||
      (registration.tournament_lobby_number && registration.tournament_lobby_slot)
  );
}

function getMissingCheckInFields(registration: OnlineTournamentRegistration | null) {
  if (!registration) {
    return [];
  }

  const missingFields: string[] = [];

  if (getSavedCheckInLength(registration.in_game_username) < 2) {
    missingFields.push('IGN');
  }

  if (getSavedCheckInLength(registration.game_uid) < 2) {
    missingFields.push('UID');
  }

  if (getSavedCheckInLength(registration.device_model) < 2) {
    missingFields.push('device model');
  }

  if (getSavedCheckInLength(registration.whatsapp_number) < 7) {
    missingFields.push('WhatsApp number');
  }

  if (
    requiresTournamentDeviceSerialLast6(registration.game) &&
    normalizeTournamentDeviceSerialLast6(registration.device_serial_last6).length !== 6 &&
    !hasLegacySerialSyncGap(registration)
  ) {
    missingFields.push('serial last 6');
  }

  return missingFields;
}

function formatFieldList(fields: string[]) {
  if (fields.length === 0) {
    return '';
  }

  if (fields.length === 1) {
    return fields[0];
  }

  if (fields.length === 2) {
    return `${fields[0]} and ${fields[1]}`;
  }

  return `${fields.slice(0, -1).join(', ')}, and ${fields.at(-1)}`;
}

function getArenaNextTask({
  registration,
  submissions,
}: {
  registration: OnlineTournamentRegistration | null;
  submissions: OnlineTournamentResultSubmission[];
}) {
  if (!registration) {
    return {
      label: 'Register first',
      body: 'Your entry is not found for this game yet. Register on web, then return here.',
      tone: 'warn' as const,
      icon: 'globe-outline' as const,
    };
  }

  if (registration.eligibility_status === 'disqualified') {
    return {
      label: 'Entry locked',
      body: 'This entry is disqualified. Contact support if you think this is wrong.',
      tone: 'danger' as const,
      icon: 'lock-closed' as const,
    };
  }

  if (!hasSubmittedCheckIn(registration)) {
    return {
      label: 'Check in now',
      body: 'Confirm your IGN, UID, device, and WhatsApp before lobby details matter.',
      tone: 'warn' as const,
      icon: 'checkmark-circle' as const,
    };
  }

  if (!submissions.length) {
    return {
      label: 'Proof ready',
      body: 'After your match, upload a clear result screenshot from the Proof section.',
      tone: 'info' as const,
      icon: 'cloud-upload' as const,
    };
  }

  return {
    label: 'Proof submitted',
    body: 'Your latest proof is in review. Watch this desk for admin status updates.',
    tone: 'good' as const,
    icon: 'shield-checkmark' as const,
  };
}

export default function ArenaTab() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ game?: string }>();
  const queryClient = useQueryClient();
  const checkInHydrationRef = useRef<string | null>(null);
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
  const [checkInDetails, setCheckInDetails] = useState<PlayerCheckInDetails>({
    ign: '',
    uid: '',
    device: '',
    whatsappNumber: '',
    deviceSerialLast6: '',
  });

  const stateQuery = useQuery({
    queryKey: ['tournament-state'],
    queryFn: getTournamentState,
    refetchInterval: 25_000,
  });
  const state = stateQuery.data;
  const config = TOURNAMENT_GAME_BY_KEY[activeGame];
  const myRegistration =
    state?.myRegistrations.find((registration) => registration.game === activeGame) ?? null;
  const requiresDeviceSerial = requiresTournamentDeviceSerialLast6(activeGame);
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
          Boolean(
            fixture.player1_registration_id &&
              myRegistrationIds.has(fixture.player1_registration_id)
          ) ||
          Boolean(
            fixture.player2_registration_id &&
              myRegistrationIds.has(fixture.player2_registration_id)
          )
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

  useEffect(() => {
    const nextGame = getGameFromParam(params.game, activeGame);
    if (nextGame !== activeGame) {
      setActiveGame(nextGame);
      setError(null);
      setNotice(null);
      setScreenshot(null);
    }
  }, [activeGame, params.game]);

  useEffect(() => {
    const hydrationKey = [
      activeGame,
      myRegistration?.id ?? 'none',
      myRegistration?.updated_at ?? 'none',
      myRegistration?.checked_in_at ?? 'none',
      user?.phone ?? '',
      user?.whatsapp_number ?? '',
    ].join('|');

    if (checkInHydrationRef.current === hydrationKey) {
      return;
    }

    checkInHydrationRef.current = hydrationKey;
    setCheckInDetails(
      buildPlayerCheckInDetails({
        registration: myRegistration,
        fallbackWhatsappNumber: user?.whatsapp_number ?? user?.phone ?? '',
      })
    );
  }, [
    activeGame,
    myRegistration,
    myRegistration?.checked_in_at,
    myRegistration?.updated_at,
    user?.phone,
    user?.whatsapp_number,
  ]);

  const checkInMutation = useMutation({
    mutationFn: () =>
      checkInTournament({
        game: activeGame,
        in_game_username: checkInDetails.ign.trim(),
        game_uid: checkInDetails.uid.trim(),
        device_model: checkInDetails.device.trim(),
        whatsapp_number: checkInDetails.whatsappNumber.trim(),
        ...(requiresDeviceSerial
          ? {
              device_serial_last6: normalizeTournamentDeviceSerialLast6(
                checkInDetails.deviceSerialLast6
              ),
            }
          : {}),
      }),
    onSuccess: async (nextState) => {
      setError(null);
      setNotice(nextState.warning ?? 'Check-in saved. You are on the match desk.');
      queryClient.setQueryData(['tournament-state'], nextState);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tournament-registration'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Check-in failed. Confirm your details and try again.');
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
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Result upload failed. Try again.'
      );
    },
  });

  async function pickScreenshot() {
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

  async function openTournamentRegistration() {
    await Linking.openURL(TOURNAMENT_REGISTER_URL);
  }

  async function openTournamentHome() {
    await Linking.openURL(TOURNAMENT_PUBLIC_URL);
  }

  const canSubmitCheckIn = Boolean(myRegistration) &&
    checkInDetails.ign.trim().length >= 2 &&
    checkInDetails.uid.trim().length >= 2 &&
    checkInDetails.device.trim().length >= 2 &&
    checkInDetails.whatsappNumber.trim().length >= 7 &&
    (!requiresDeviceSerial ||
      normalizeTournamentDeviceSerialLast6(checkInDetails.deviceSerialLast6).length === 6);

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
  const canUpload = activeGame === 'efootball' ? canUploadEfootball : canUploadBattleRoyale;
  const nextTask = getArenaNextTask({
    registration: myRegistration,
    submissions: activeSubmissions,
  });

  return (
    <Screen
      title="Arena"
      subtitle="Match-day desk: check-in, room credentials, fixtures, standings, and result upload."
    >
      <Card tone="command" style={styles.arenaCommand}>
        <View style={styles.arenaCommandTop}>
          <View style={styles.arenaCommandIcon}>
            <Ionicons name={nextTask.icon} color={colors.slate} size={22} />
          </View>
          <View style={styles.arenaCommandCopy}>
            <Text style={styles.arenaEyebrow}>{config.shortLabel} desk</Text>
            <Text style={styles.arenaCommandTitle}>{nextTask.label}</Text>
            <Text style={styles.arenaCommandBody}>{nextTask.body}</Text>
          </View>
        </View>
        <View style={styles.arenaStatusRail}>
          <View style={styles.arenaStatusItem}>
            <Text style={styles.arenaStatusLabel}>Entry</Text>
            <Text style={styles.arenaStatusValue}>
              {myRegistration ? formatStatus(myRegistration.eligibility_status) : 'Missing'}
            </Text>
          </View>
          <View style={styles.arenaStatusItem}>
            <Text style={styles.arenaStatusLabel}>Check-in</Text>
            <Text style={styles.arenaStatusValue}>
              {myRegistration ? formatStatus(myRegistration.check_in_status) : 'Locked'}
            </Text>
          </View>
          <View style={styles.arenaStatusItem}>
            <Text style={styles.arenaStatusLabel}>Proof</Text>
            <Text style={styles.arenaStatusValue}>{activeSubmissions.length}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle title="Choose game" />
        <ChipGroup
          options={TOURNAMENT_GAMES.map((game) => ({
            label: game.shortLabel,
            value: game.game,
          }))}
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
        <InfoRow label="Registration closes" value={formatEatDateTime(config.registrationClosesAt)} />
      </Card>

      {!stateQuery.isLoading && !myRegistration ? (
      <Card>
        <SectionTitle title="Register on web" />
        <Text style={textStyles.muted}>
          Paid slots are verified on mechi.club. Register there first, then return here for match
          night tools.
        </Text>
        <View style={styles.actionGrid}>
          <Button
            label="Register now"
            icon="globe-outline"
            onPress={() => void openTournamentRegistration()}
          />
          <Button
            label="Tournament info"
            icon="open-outline"
            variant="secondary"
            onPress={() => void openTournamentHome()}
          />
        </View>
      </Card>
      ) : null}

      {stateQuery.isLoading ? <LoadingState label="Loading Arena" /> : null}
      {stateQuery.isError ? (
        <ErrorBanner message="Arena could not load right now. Check your connection and try again." />
      ) : null}
      <ErrorBanner message={error} />
      {notice ? (
        <Card style={styles.noticeCard}>
          <Text style={textStyles.body}>{notice}</Text>
        </Card>
      ) : null}

      <PlayerDeskCard
        activeGame={activeGame}
        registration={myRegistration}
        checkInDetails={checkInDetails}
        canSubmitCheckIn={canSubmitCheckIn}
        checkingIn={checkInMutation.isPending}
        onCheckIn={() => checkInMutation.mutate()}
        onCheckInDetailsChange={setCheckInDetails}
        onOpenGroup={() => void openWhatsAppGroup()}
        onOpenRegistration={() => void openTournamentRegistration()}
      />

      <TournamentRulesPanel activeGame={activeGame} />

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
        canUpload={canUpload}
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

function PlayerDeskCard({
  activeGame,
  registration,
  checkInDetails,
  canSubmitCheckIn,
  checkingIn,
  onCheckIn,
  onCheckInDetailsChange,
  onOpenGroup,
  onOpenRegistration,
}: {
  activeGame: OnlineTournamentGameKey;
  registration: OnlineTournamentRegistration | null;
  checkInDetails: PlayerCheckInDetails;
  canSubmitCheckIn: boolean;
  checkingIn: boolean;
  onCheckIn: () => void;
  onCheckInDetailsChange: (value: PlayerCheckInDetails) => void;
  onOpenGroup: () => void;
  onOpenRegistration: () => void;
}) {
  const config = TOURNAMENT_GAME_BY_KEY[activeGame];
  const isCheckedIn = hasSubmittedCheckIn(registration);
  const isDisqualified = registration?.eligibility_status === 'disqualified';
  const hasLegacySerialSyncIssue = hasLegacySerialSyncGap(registration);
  const missingCheckInFields = getMissingCheckInFields(registration);
  const needsDetailCompletion = isCheckedIn && missingCheckInFields.length > 0;
  const shouldShowCheckInForm = Boolean(
    registration && !isDisqualified && (!isCheckedIn || needsDetailCompletion)
  );
  const shouldShowCheckInSummary = Boolean(registration && isCheckedIn && !needsDetailCompletion);
  const requiresDeviceSerial = requiresTournamentDeviceSerialLast6(activeGame);

  if (!registration) {
    return (
      <Card>
        <SectionTitle title="No entry yet" />
        <Text style={textStyles.muted}>
          Register for {config.label} on mechi.club first. Room codes, brackets, and result tools
          unlock after your entry is found.
        </Text>
        <Button
          label={`Enter ${config.shortLabel}`}
          icon="globe-outline"
          onPress={onOpenRegistration}
        />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle title={registration.in_game_username || 'Ready up'} />
      <View style={styles.badgeRow}>
        <StatusBadge
          label={formatStatus(registration.check_in_status)}
          tone={getStatusTone(registration.check_in_status)}
        />
        <StatusBadge
          label={formatStatus(registration.eligibility_status)}
          tone={getStatusTone(registration.eligibility_status)}
        />
        <StatusBadge label={config.format} tone="neutral" />
      </View>

      {isDisqualified ? (
        <View style={[styles.noticeBox, styles.noticeDanger]}>
          <Text style={styles.noticeText}>
            This entry is disqualified. Arena access is locked for this game.
          </Text>
        </View>
      ) : null}

      {needsDetailCompletion ? (
        <View style={[styles.noticeBox, styles.noticeWarn]}>
          <Text style={styles.noticeText}>
            Check-in is saved. Add your {formatFieldList(missingCheckInFields)} so admins can verify
            you cleanly.
          </Text>
        </View>
      ) : null}

      {hasLegacySerialSyncIssue ? (
        <View style={[styles.noticeBox, styles.noticeInfo]}>
          <Text style={styles.noticeText}>
            Check-in is confirmed and your lobby access is live. Serial sync is pending, but you do
            not need to submit again.
          </Text>
        </View>
      ) : null}

      {shouldShowCheckInForm ? (
        <View style={styles.fieldStack}>
          <Field
            label="IGN"
            value={checkInDetails.ign}
            onChangeText={(value) => onCheckInDetailsChange({ ...checkInDetails, ign: value })}
            placeholder="Exact in-game name"
          />
          <Field
            label="UID"
            value={checkInDetails.uid}
            onChangeText={(value) => onCheckInDetailsChange({ ...checkInDetails, uid: value })}
            placeholder="Game UID or player ID"
          />
          <Field
            label="Device model"
            value={checkInDetails.device}
            onChangeText={(value) =>
              onCheckInDetailsChange({ ...checkInDetails, device: value })
            }
            placeholder="Samsung A15"
          />
          <Field
            label="WhatsApp number"
            value={checkInDetails.whatsappNumber}
            onChangeText={(value) =>
              onCheckInDetailsChange({ ...checkInDetails, whatsappNumber: value })
            }
            placeholder="0712345678"
            keyboardType="phone-pad"
          />
          {requiresDeviceSerial ? (
            <>
              <Field
                label="Serial last 6"
                value={checkInDetails.deviceSerialLast6}
                onChangeText={(value) =>
                  onCheckInDetailsChange({
                    ...checkInDetails,
                    deviceSerialLast6: normalizeTournamentDeviceSerialLast6(value),
                  })
                }
                placeholder="A1B2C3"
                autoCapitalize="characters"
                maxLength={6}
              />
              <View style={[styles.noticeBox, styles.noticeInfo]}>
                <Text style={styles.noticeText}>
                  CODM check: use your exact IGN and UID. For serial last 6, open Settings {'>'} About
                  phone and copy the final 6 characters.
                </Text>
              </View>
            </>
          ) : null}
          <Button
            label={isCheckedIn ? 'Save details' : 'Check in now'}
            icon="checkmark-circle"
            loading={checkingIn}
            disabled={!canSubmitCheckIn}
            onPress={onCheckIn}
          />
        </View>
      ) : null}

      {shouldShowCheckInSummary ? (
        <View style={styles.summaryList}>
          <InfoRow label="IGN" value={registration.in_game_username} selectable />
          <InfoRow label="UID" value={registration.game_uid ?? 'Not provided'} selectable />
          <InfoRow label="Device model" value={registration.device_model ?? 'Not provided'} />
          <InfoRow
            label="WhatsApp number"
            value={registration.whatsapp_number ?? 'Not provided'}
            selectable
          />
          {requiresDeviceSerial ? (
            <InfoRow
              label="Serial last 6"
              value={
                hasLegacySerialSyncIssue
                  ? 'Syncing'
                  : registration.device_serial_last6 ?? 'Not provided'
              }
            />
          ) : null}
          <InfoRow
            label="Tournament lobby"
            value={formatTournamentLobby(registration)}
          />
          <InfoRow
            label="Checked in"
            value={
              registration.checked_in_at
                ? formatEatDateTime(registration.checked_in_at)
                : 'Waiting'
            }
          />
          {registration.admin_note ? (
            <InfoRow label="Admin note" value={registration.admin_note} selectable />
          ) : null}
        </View>
      ) : null}

      <View style={styles.actionGrid}>
        <Button
          label={`Join ${config.shortLabel} group`}
          icon="logo-whatsapp"
          variant="secondary"
          onPress={onOpenGroup}
        />
      </View>
    </Card>
  );
}

function TournamentRulesPanel({ activeGame }: { activeGame: OnlineTournamentGameKey }) {
  const rules = TOURNAMENT_GAME_BY_KEY[activeGame].deskRules;

  if (!rules) {
    return null;
  }

  return (
    <Card>
      <SectionTitle title={rules.heading} />
      <View style={styles.ruleSectionList}>
        {rules.sections.map((section) => (
          <View key={section.title} style={styles.ruleSectionCard}>
            <Text style={styles.ruleSectionTitle}>{section.title}</Text>
            <View style={styles.ruleList}>
              {section.items.map((item) => (
                <View key={item} style={styles.ruleRow}>
                  <View style={styles.ruleDot} />
                  <Text style={styles.ruleText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

function BattleRoyaleRooms({ rooms }: { rooms: OnlineTournamentRoom[] }) {
  const roomByMatch = new Map(rooms.map((room) => [room.match_number, room]));

  return (
    <Card>
      <SectionTitle title="Room codes" />
      <View style={styles.roomGrid}>
        {MATCH_NUMBERS.map((matchNumber) => {
          const room = roomByMatch.get(Number(matchNumber));
          const released = Boolean(room?.credentials_released);

          return (
            <View key={matchNumber} style={styles.roomCard}>
              <View style={styles.roomHeader}>
                <Text style={styles.roomTitle}>Match {matchNumber}</Text>
                <StatusBadge
                  label={formatStatus(room?.status ?? 'draft')}
                  tone={getStatusTone(room?.status)}
                />
              </View>
              <InfoRow label="Map" value={room?.map_name ?? room?.title ?? 'TBA'} />
              <InfoRow
                label="Room ID"
                value={released ? room?.room_id || 'TBA' : 'Locked'}
                selectable={released}
              />
              <InfoRow
                label="Password"
                value={released ? room?.room_password || 'TBA' : 'Locked'}
                selectable={released}
              />
              <InfoRow
                label="Starts"
                value={room?.starts_at ? formatEatDateTime(room.starts_at) : 'Watch admin updates.'}
              />
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
      <SectionTitle title="Live standings" />
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
        <Text style={textStyles.muted}>Standings update after admins verify result proof.</Text>
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
              Boolean(
                fixture.player1_registration_id &&
                  myRegistrationIds.has(fixture.player1_registration_id)
              ) ||
              Boolean(
                fixture.player2_registration_id &&
                  myRegistrationIds.has(fixture.player2_registration_id)
              );

            return (
              <View key={fixture.id} style={[styles.fixtureCard, mine && styles.fixtureMine]}>
                <View style={styles.fixtureHeader}>
                  <Text style={styles.rowMeta}>
                    {fixture.round_label} #{fixture.slot + 1}
                  </Text>
                  <StatusBadge
                    label={formatStatus(fixture.status)}
                    tone={getStatusTone(fixture.status)}
                  />
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
        <Text style={textStyles.muted}>Fixtures appear here once admins publish the bracket.</Text>
      )}
    </Card>
  );
}

function FixturePlayer({
  name,
  score,
  winner,
}: {
  name: string;
  score: number | null;
  winner: boolean;
}) {
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
      <SectionTitle title="Upload proof" />
      {!registration ? (
        <Text style={textStyles.muted}>
          Register on mechi.club before uploading proof for this game.
        </Text>
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
            <Field
              label="Kills"
              value={kills}
              onChangeText={onKillsChange}
              keyboardType="number-pad"
              placeholder="0"
            />
            <Field
              label="Placement"
              value={placement}
              onChangeText={onPlacementChange}
              keyboardType="number-pad"
              placeholder="1"
            />
          </View>
        </>
      )}
      <Pressable
        style={({ pressed }) => [styles.uploadBox, pressed && styles.pressed]}
        onPress={onPickScreenshot}
      >
        <Text style={styles.uploadTitle}>
          {screenshot ? screenshot.fileName ?? 'Proof selected' : 'Choose proof screenshot'}
        </Text>
        <Text style={styles.uploadMeta}>PNG, JPG, or WEBP under 10MB. Keep scores visible.</Text>
      </Pressable>
      <Button
        label="Send for review"
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
      <SectionTitle title="My proof" />
      {submissions.length ? (
        <View style={styles.list}>
          {submissions.slice(0, 6).map((submission) => (
            <View key={submission.id} style={styles.submissionRow}>
              <View style={styles.listCopy}>
                <Text style={styles.rowTitle}>{getSubmissionLabel(submission)}</Text>
                {submission.admin_note ? (
                  <Text style={styles.rowMeta}>{submission.admin_note}</Text>
                ) : null}
              </View>
              <StatusBadge
                label={formatStatus(submission.status)}
                tone={getStatusTone(submission.status)}
              />
            </View>
          ))}
        </View>
      ) : (
        <Text style={textStyles.muted}>No proof uploaded yet.</Text>
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
      <SectionTitle title="Prize status" />
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
  arenaCommand: {
    gap: spacing.md,
  },
  arenaCommandTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  arenaCommandIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arenaCommandCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  arenaEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  arenaCommandTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 29,
  },
  arenaCommandBody: {
    color: colors.neutral,
    fontSize: 13,
    lineHeight: 19,
  },
  arenaStatusRail: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  arenaStatusItem: {
    flex: 1,
    minHeight: 62,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  arenaStatusLabel: {
    color: '#b7c5d8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  arenaStatusValue: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  noticeCard: {
    borderColor: 'rgba(50, 224, 196, 0.22)',
    backgroundColor: 'rgba(50, 224, 196, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fieldStack: {
    gap: spacing.sm,
  },
  summaryList: {
    gap: spacing.xs,
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
  },
  noticeWarn: {
    borderColor: 'rgba(255, 184, 107, 0.24)',
    backgroundColor: 'rgba(255, 184, 107, 0.12)',
  },
  noticeInfo: {
    borderColor: 'rgba(116, 185, 255, 0.24)',
    backgroundColor: 'rgba(116, 185, 255, 0.12)',
  },
  noticeDanger: {
    borderColor: 'rgba(255, 92, 119, 0.24)',
    backgroundColor: 'rgba(255, 92, 119, 0.12)',
  },
  noticeText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  actionGrid: {
    gap: spacing.sm,
  },
  ruleSectionList: {
    gap: spacing.md,
  },
  ruleSectionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    padding: spacing.md,
    gap: spacing.md,
  },
  ruleSectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
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
