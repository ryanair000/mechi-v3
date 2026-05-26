import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { getTournamentState, submitTournamentResult } from '../../src/api/mechi';
import { Card, KineticScreen, Label, PrimaryButton } from '../../src/components/kinetic';
import {
  TOURNAMENT_GAME_BY_KEY,
  TOURNAMENT_GAMES,
  TOURNAMENT_REGISTER_URL,
  formatStatus,
  getGameFromParam,
  isBattleRoyaleTournamentGame,
} from '../../src/config/tournament';
import { colors, radii, spacing } from '../../src/theme';
import type {
  OnlineTournamentGameKey,
  OnlineTournamentResultSubmission,
  OnlineTournamentRoom,
} from '../../src/types';

type ScreenshotAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export default function ArenaTab() {
  const params = useLocalSearchParams<{ game?: string }>();
  const queryClient = useQueryClient();
  const [activeGame, setActiveGame] = useState<OnlineTournamentGameKey>(() =>
    getGameFromParam(params.game)
  );
  const [screenshot, setScreenshot] = useState<ScreenshotAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const stateQuery = useQuery({
    queryKey: ['tournament-state'],
    queryFn: getTournamentState,
    refetchInterval: 25_000,
  });
  const state = stateQuery.data;
  const config = TOURNAMENT_GAME_BY_KEY[activeGame];
  const registration =
    state?.myRegistrations.find((item) => item.game === activeGame) ?? null;
  const rooms = useMemo(
    () => (state?.rooms ?? []).filter((room) => room.game === activeGame),
    [activeGame, state?.rooms]
  );
  const submissions = useMemo(
    () => (state?.mySubmissions ?? []).filter((submission) => submission.game === activeGame),
    [activeGame, state?.mySubmissions]
  );
  const room = rooms.find((item) => item.credentials_released) ?? rooms[0] ?? null;
  const standing = activeGame === 'pubgm' || activeGame === 'codm'
    ? state?.standings?.[activeGame]?.find((item) => item.registration.id === registration?.id)
    : null;

  useEffect(() => {
    const nextGame = getGameFromParam(params.game, activeGame);
    if (nextGame !== activeGame) {
      setActiveGame(nextGame);
      setScreenshot(null);
      setError(null);
      setNotice(null);
    }
  }, [activeGame, params.game]);

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!registration) {
        throw new Error('Register first before uploading proof.');
      }

      if (!screenshot) {
        throw new Error('Choose a proof screenshot first.');
      }

      if (activeGame === 'efootball') {
        const fixture = state?.fixtures.find(
          (item) =>
            item.player1_registration_id === registration.id ||
            item.player2_registration_id === registration.id
        );

        if (!fixture) {
          throw new Error('No pending eFootball fixture was found for this account.');
        }

        return submitTournamentResult({
          game: 'efootball',
          uri: screenshot.uri,
          name: screenshot.fileName,
          mimeType: screenshot.mimeType,
          fixture_id: fixture.id,
          player1_score: 0,
          player2_score: 0,
        });
      }

      return submitTournamentResult({
        game: activeGame,
        uri: screenshot.uri,
        name: screenshot.fileName,
        mimeType: screenshot.mimeType,
        match_number: room?.match_number ?? 1,
        kills: 0,
        placement: 1,
      });
    },
    onSuccess: async (nextState) => {
      setError(null);
      setNotice('Proof submitted. Admin review is now pending.');
      setScreenshot(null);
      queryClient.setQueryData(['tournament-state'], nextState);
      await queryClient.invalidateQueries({ queryKey: ['tournament-registration'] });
    },
    onError: (err) => {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Proof upload failed. Try again.'
      );
    },
  });

  async function pickScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (!result.canceled && result.assets[0]) {
      setScreenshot(result.assets[0]);
      setError(null);
    }
  }

  async function openRegister() {
    await Linking.openURL(TOURNAMENT_REGISTER_URL);
  }

  async function launchGame() {
    await Linking.openURL(config.whatsappGroupUrl);
  }

  return (
    <KineticScreen dark title="PLAYMECHI">
      <View style={styles.gameRail}>
        {TOURNAMENT_GAMES.map((game) => (
          <Pressable
            key={game.game}
            style={[styles.gameChip, game.game === activeGame && styles.gameChipActive]}
            onPress={() => {
              setActiveGame(game.game);
              setScreenshot(null);
              setError(null);
              setNotice(null);
            }}
          >
            <Text style={[styles.gameChipText, game.game === activeGame && styles.gameChipTextActive]}>
              {game.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.tournamentHead}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>PMGC Qualifiers - Week 3</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <Text style={styles.dateLine}>
            <Ionicons name="calendar-outline" size={17} color={colors.mutedDark} /> Today, 18:00 UTC
          </Text>
        </View>
      </View>

      <View style={styles.taskRail}>
        <Task icon="apps-outline" label="Register" />
        <Task icon="checkmark-circle-outline" label="Check-in" />
        <Task icon="enter-outline" label="Room" active />
        <Task icon="list-outline" label="Fixtures" />
        <Task icon="cloud-upload-outline" label="Proof" />
      </View>

      <Card dark style={styles.roomCard}>
        <View style={styles.accentLine} />
        <View style={styles.roomHead}>
          <View style={styles.roomCopy}>
            <Text style={styles.roomTitle}>Match Room Credentials</Text>
            <Text style={styles.darkMuted}>Join the custom room before the countdown ends.</Text>
          </View>
          <View style={styles.startsBox}>
            <Text style={styles.startsLabel}>Starts In</Text>
            <Text style={styles.startsValue}>04:59</Text>
          </View>
        </View>
        <View style={styles.timerTrack}>
          <View style={styles.timerFill} />
        </View>
        <Credential label="Room ID" value={room?.credentials_released ? room.room_id || '8472910' : 'Locked'} />
        <Credential
          label="Password"
          value={room?.credentials_released ? room.room_password || 'mechi123' : 'Locked'}
        />
        <View style={styles.matchChecklist}>
          <ChecklistItem label="Registered" done={Boolean(registration)} />
          <ChecklistItem label="Checked in" done={Boolean(room)} />
          <ChecklistItem label="Proof pending" done={submissions.length > 0} />
        </View>
        <View style={styles.actionRow}>
          <PrimaryButton label="Report Issue" danger onPress={() => void Linking.openURL(config.whatsappGroupUrl)} />
          <View style={styles.launchButtonWrap}>
            <PrimaryButton label={`Launch ${config.label}`} onPress={() => void launchGame()} />
          </View>
        </View>
      </Card>

      <View style={styles.bentoGrid}>
        <Card dark style={styles.bentoCard}>
          <Ionicons name="list-outline" color={colors.primary} size={28} />
          <Text style={styles.bentoKicker}>Group A</Text>
          <Text style={styles.bentoTitle}>Current Standings</Text>
          <Text style={styles.darkMuted}>
            {standing ? `You are in ${standing.rank} place.` : 'You are in 4th place.'}
          </Text>
        </Card>
        <Card dark style={styles.bentoCard}>
          <Ionicons name="git-compare-outline" color={colors.primary} size={28} />
          <Text style={styles.bentoKicker}>Rules</Text>
          <Text style={styles.bentoTitle}>Match Rules</Text>
          <Text style={styles.darkMuted}>{config.format}</Text>
        </Card>
      </View>

      <Card style={styles.proofCard}>
        <Text style={styles.proofTitle}>Submit Result Proof</Text>
        <Text style={styles.proofBody}>
          Upload a clear screenshot of the post-match scoreboard to verify your placement.
        </Text>
        <Label muted>Select Match</Label>
        <View style={styles.selectBox}>
          <Text style={styles.selectText}>{registration ? `${config.label} pending match` : 'Choose a pending match...'}</Text>
          <Ionicons name="chevron-down" color={colors.muted} size={24} />
        </View>
        <Label muted>Screenshot Evidence</Label>
        <Pressable style={styles.uploadBox} onPress={() => void pickScreenshot()}>
          <View style={styles.uploadIcon}>
            <Ionicons name="cloud-upload-outline" color={colors.text} size={36} />
          </View>
          <Text style={styles.uploadTitle}>
            {screenshot ? screenshot.fileName ?? 'Screenshot selected' : 'Tap to upload image'}
          </Text>
          <Text style={styles.uploadMeta}>PNG, JPG up to 10MB. Must clearly show all player scores.</Text>
        </Pressable>
        {error ? <Text selectable style={styles.errorText}>{error}</Text> : null}
        {notice ? <Text selectable style={styles.noticeText}>{notice}</Text> : null}
        <PrimaryButton
          label={uploadMutation.isPending ? 'Submitting...' : 'Submit Proof'}
          icon="checkmark-circle-outline"
          disabled={!registration || !screenshot || uploadMutation.isPending}
          onPress={() => uploadMutation.mutate()}
        />
        {!registration ? (
          <PrimaryButton label="Register First" onPress={() => void openRegister()} />
        ) : null}
      </Card>

      <View style={styles.recent}>
        <Label muted>Recent Submissions</Label>
        <View style={styles.divider} />
        {(submissions.length ? submissions : getFallbackSubmissions()).slice(0, 3).map((submission, index) => (
          <SubmissionRow key={submission.id} submission={submission} fallbackIndex={index} />
        ))}
      </View>
    </KineticScreen>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.checklistItem}>
      <View style={[styles.checklistDot, done && styles.checklistDotDone]} />
      <Text style={[styles.checklistText, done && styles.checklistTextDone]}>{label}</Text>
    </View>
  );
}

function Task({
  icon,
  label,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
}) {
  return (
    <View style={[styles.task, !active && styles.taskDim]}>
      <View style={[styles.taskIcon, active && styles.taskIconActive]}>
        <Ionicons name={icon} color={active ? colors.slate : colors.mutedDark} size={26} />
      </View>
      <Text style={[styles.taskText, active && styles.taskTextActive]}>{label}</Text>
    </View>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.credential}>
      <View>
        <Text style={styles.credentialLabel}>{label}</Text>
        <Text selectable style={styles.credentialValue}>{value}</Text>
      </View>
      <Pressable style={styles.copyButton}>
        <Ionicons name="copy-outline" color={colors.primary} size={28} />
      </Pressable>
    </View>
  );
}

function SubmissionRow({
  submission,
  fallbackIndex,
}: {
  submission: Pick<OnlineTournamentResultSubmission, 'id' | 'status' | 'admin_note'> & {
    label?: string;
    time?: string;
  };
  fallbackIndex: number;
}) {
  const tone =
    submission.status === 'approved'
      ? 'approved'
      : submission.status === 'rejected'
        ? 'rejected'
        : 'pending';
  const labels = ['Weekly Brawl - QF', 'Scrims - Lobby B', 'Scrims - Lobby A'];
  const times = ['Today, 14:30', 'Yesterday, 19:00', 'Blurry image'];

  return (
    <View style={[styles.submissionRow, tone === 'rejected' && styles.submissionRejected]}>
      <View style={[styles.thumb, tone === 'rejected' && styles.thumbRejected]}>
        <Ionicons
          name={tone === 'approved' ? 'image' : tone === 'rejected' ? 'image-outline' : 'image-outline'}
          color={tone === 'rejected' ? colors.accent : colors.muted}
          size={27}
        />
      </View>
      <View style={styles.submissionCopy}>
        <Text style={styles.submissionTitle}>{submission.label ?? labels[fallbackIndex]}</Text>
        <Text style={[styles.submissionMeta, tone === 'rejected' && styles.submissionMetaRejected]}>
          {submission.admin_note ?? submission.time ?? times[fallbackIndex]}
        </Text>
      </View>
      <View style={[styles.statusBadge, styles[`status_${tone}`]]}>
        <View style={[styles.statusSmallDot, styles[`statusDot_${tone}`]]} />
        <Text style={[styles.statusText, styles[`statusText_${tone}`]]}>
          {formatStatus(submission.status)}
        </Text>
      </View>
    </View>
  );
}

function getFallbackSubmissions() {
  return [
    { id: 'fallback-pending', status: 'pending', admin_note: 'Today, 14:30' },
    { id: 'fallback-approved', status: 'approved', admin_note: 'Yesterday, 19:00' },
    { id: 'fallback-rejected', status: 'rejected', admin_note: 'Blurry image' },
  ];
}

const styles = StyleSheet.create({
  gameRail: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: 14,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(186,202,197,0.12)',
  },
  gameChip: {
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(186,202,197,0.28)',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gameChipText: {
    color: colors.mutedDark,
    fontSize: 14,
    fontWeight: '900',
  },
  gameChipTextActive: {
    color: colors.slate,
  },
  tournamentHead: {
    gap: spacing.md,
  },
  titleBlock: {
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    color: colors.white,
    flex: 1,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  liveBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.35)',
    backgroundColor: 'rgba(255,107,107,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  liveText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  dateLine: {
    color: colors.mutedDark,
    fontSize: 14,
    fontWeight: '700',
  },
  taskRail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  task: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskDim: {
    opacity: 0.42,
  },
  taskIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(186,202,197,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  taskText: {
    color: colors.mutedDark,
    fontSize: 12,
    fontWeight: '900',
  },
  taskTextActive: {
    color: colors.primary,
  },
  roomCard: {
    position: 'relative',
    overflow: 'hidden',
    gap: spacing.lg,
    boxShadow: '0 0 18px rgba(50,224,196,0.1)',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.primary,
  },
  roomHead: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roomCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  roomTitle: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  darkMuted: {
    color: colors.mutedDark,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  startsBox: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(186,202,197,0.15)',
    backgroundColor: 'rgba(11,17,33,0.45)',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startsLabel: {
    color: colors.mutedDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.7,
  },
  startsValue: {
    color: colors.accent,
    fontSize: 19,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timerTrack: {
    height: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  timerFill: {
    width: '62%',
    height: '100%',
    backgroundColor: colors.accent,
  },
  credential: {
    minHeight: 74,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(186,202,197,0.12)',
    backgroundColor: colors.slate,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  credentialLabel: {
    color: colors.mutedDark,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  credentialValue: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  copyButton: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(50,224,196,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchChecklist: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(186,202,197,0.12)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  checklistItem: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checklistDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.mutedDark,
  },
  checklistDotDone: {
    backgroundColor: colors.primary,
  },
  checklistText: {
    color: colors.mutedDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  checklistTextDone: {
    color: colors.neutral,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  launchButtonWrap: {
    flex: 2,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bentoCard: {
    flex: 1,
    minHeight: 120,
  },
  bentoKicker: {
    color: colors.mutedDark,
    alignSelf: 'flex-end',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  bentoTitle: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  proofCard: {
    gap: spacing.lg,
  },
  proofTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  proofBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  selectBox: {
    minHeight: 56,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  selectText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  uploadBox: {
    minHeight: 160,
    borderRadius: radii.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#bacac5',
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  uploadMeta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  recent: {
    gap: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  submissionRow: {
    minHeight: 72,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  submissionRejected: {
    borderColor: 'rgba(255,107,107,0.35)',
    backgroundColor: 'rgba(255,107,107,0.05)',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#bacac5',
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRejected: {
    borderColor: 'rgba(255,107,107,0.25)',
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  submissionCopy: {
    flex: 1,
  },
  submissionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  submissionMeta: {
    color: colors.muted,
    fontSize: 15,
  },
  submissionMetaRejected: {
    color: colors.accent,
  },
  statusBadge: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  status_pending: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  status_approved: {
    backgroundColor: 'rgba(50,224,196,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(50,224,196,0.28)',
  },
  status_rejected: {
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.28)',
  },
  statusSmallDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  statusDot_pending: {
    backgroundColor: colors.muted,
  },
  statusDot_approved: {
    backgroundColor: colors.primary,
  },
  statusDot_rejected: {
    backgroundColor: colors.accent,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '900',
  },
  statusText_pending: {
    color: colors.muted,
  },
  statusText_approved: {
    color: colors.primaryDark,
  },
  statusText_rejected: {
    color: colors.accent,
  },
});
