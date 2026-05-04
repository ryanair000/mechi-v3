import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import {
  getProfile,
  getTournamentRegistrationSummary,
  registerForTournament,
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
  ProgressBar,
  Screen,
  SectionTitle,
  StatusBadge,
  textStyles,
} from '../../src/components/ui';
import {
  PLAYMECHI_INSTAGRAM_URL,
  PLAYMECHI_YOUTUBE_URL,
  TOURNAMENT_GAME_BY_KEY,
  TOURNAMENT_GAMES,
  formatStatus,
  getFallbackTournamentSummary,
  getGameFromParam,
} from '../../src/config/tournament';
import { getConfiguredGameId } from '../../src/config/games';
import { colors, spacing } from '../../src/theme';
import type { OnlineTournamentGameKey, Profile } from '../../src/types';

function getProfileGameId(profile: Profile | null | undefined, game: OnlineTournamentGameKey) {
  return getConfiguredGameId(game, 'mobile', profile?.game_ids ?? {});
}

function getFormKey(params: {
  game: OnlineTournamentGameKey;
  registrationId?: string;
  profileId?: string;
}) {
  return `${params.game}:${params.registrationId ?? 'new'}:${params.profileId ?? 'no-profile'}`;
}

export default function RegisterTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ game?: string }>();
  const queryClient = useQueryClient();
  const [selectedGame, setSelectedGame] = useState<OnlineTournamentGameKey>(() =>
    getGameFromParam(params.game)
  );
  const [inGameUsername, setInGameUsername] = useState('');
  const [followedInstagram, setFollowedInstagram] = useState(true);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [subscribedYoutube, setSubscribedYoutube] = useState(true);
  const [youtubeName, setYoutubeName] = useState('');
  const [availableAt8pm, setAvailableAt8pm] = useState(true);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const summaryQuery = useQuery({
    queryKey: ['tournament-registration'],
    queryFn: getTournamentRegistrationSummary,
    refetchInterval: 25_000,
  });

  const profile = profileQuery.data?.profile;
  const summary = summaryQuery.data ?? getFallbackTournamentSummary();
  const currentRegistration = summary.registrations.find(
    (registration) => registration.game === selectedGame
  );
  const selectedConfig = TOURNAMENT_GAME_BY_KEY[selectedGame];
  const selectedSummary = summary.games[selectedGame];
  const registered = selectedSummary?.registered ?? 0;
  const slots = selectedSummary?.slots ?? selectedConfig.slots;
  const spotsLeft = selectedSummary?.spotsLeft ?? Math.max(0, slots - registered);
  const registrationClosed = Boolean(
    selectedConfig.registrationClosed || (selectedSummary?.full && !currentRegistration)
  );
  const formKey = useMemo(
    () =>
      getFormKey({
        game: selectedGame,
        registrationId: currentRegistration?.id,
        profileId: profile?.id,
      }),
    [currentRegistration?.id, profile?.id, selectedGame]
  );

  useEffect(() => {
    const nextGame = getGameFromParam(params.game, selectedGame);
    if (nextGame !== selectedGame) {
      setSelectedGame(nextGame);
    }
  }, [params.game, selectedGame]);

  useEffect(() => {
    if (currentRegistration) {
      setInGameUsername(currentRegistration.in_game_username);
      setFollowedInstagram(currentRegistration.followed_instagram);
      setInstagramUsername(currentRegistration.instagram_username ?? '');
      setSubscribedYoutube(currentRegistration.subscribed_youtube);
      setYoutubeName(currentRegistration.youtube_name ?? '');
      setAvailableAt8pm(true);
      setAcceptedRules(true);
      return;
    }

    setInGameUsername(getProfileGameId(profile, selectedGame));
    setFollowedInstagram(true);
    setInstagramUsername('');
    setSubscribedYoutube(true);
    setYoutubeName('');
    setAvailableAt8pm(true);
    setAcceptedRules(false);
  }, [currentRegistration, formKey, profile, selectedGame]);

  const mutation = useMutation({
    mutationFn: () =>
      registerForTournament({
        game: selectedGame,
        in_game_username: inGameUsername.trim(),
        followed_instagram: followedInstagram,
        instagram_username: instagramUsername.trim().replace(/^@+/, ''),
        subscribed_youtube: subscribedYoutube,
        youtube_name: youtubeName.trim(),
        available_at_8pm: availableAt8pm,
        accepted_rules: acceptedRules,
      }),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tournament-registration'] }),
        queryClient.invalidateQueries({ queryKey: ['tournament-state'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]);
      router.push(`/(tabs)/arena?game=${selectedGame}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save tournament registration.');
    },
  });

  const canSubmit =
    !registrationClosed &&
    inGameUsername.trim().length >= 2 &&
    availableAt8pm &&
    acceptedRules &&
    (!followedInstagram || instagramUsername.trim().replace(/^@+/, '').length >= 2) &&
    (!subscribedYoutube || youtubeName.trim().length >= 2);

  async function openExternal(url: string) {
    await Linking.openURL(url);
  }

  return (
    <Screen title="Register" subtitle="Lock one PlayMechi tournament slot with your exact gamer tag.">
      <Card>
        <SectionTitle title="Choose game" />
        <ChipGroup
          options={TOURNAMENT_GAMES.map((game) => ({
            label: game.shortLabel,
            value: game.game,
          }))}
          value={selectedGame}
          onChange={setSelectedGame}
        />
        <View style={styles.slotHeader}>
          <Text style={styles.slotText}>
            {registered}/{slots} registered
          </Text>
          <StatusBadge
            label={registrationClosed ? 'closed' : `${spotsLeft} slots left`}
            tone={registrationClosed ? 'danger' : 'good'}
          />
        </View>
        <ProgressBar value={slots > 0 ? Math.round((registered / slots) * 100) : 0} />
        <InfoRow label="Match day" value={`${selectedConfig.dateLabel}, ${selectedConfig.timeLabel}`} />
        <InfoRow label="Format" value={selectedConfig.format} />
      </Card>

      {summaryQuery.isLoading ? <LoadingState label="Checking available slots" /> : null}
      {summaryQuery.isError ? (
        <ErrorBanner message="Live slot sync is unavailable. Try again once the API connection is healthy." />
      ) : null}
      <ErrorBanner message={error} />

      {currentRegistration ? (
        <Card>
          <SectionTitle title="Saved slot" />
          <InfoRow label="Gamer tag" value={currentRegistration.in_game_username} selectable />
          <InfoRow label="Reward review" value={formatStatus(currentRegistration.eligibility_status)} />
          <InfoRow label="Check-in" value={formatStatus(currentRegistration.check_in_status)} />
          <Button
            label={`Join ${selectedConfig.shortLabel} WhatsApp group`}
            icon="logo-whatsapp"
            variant="secondary"
            onPress={() => void openExternal(selectedConfig.whatsappGroupUrl)}
          />
        </Card>
      ) : null}

      <Card>
        <SectionTitle title="Player details" />
        <Field
          label={`${selectedConfig.shortLabel} gamer tag`}
          value={inGameUsername}
          onChangeText={setInGameUsername}
          placeholder="Exact in-game username"
        />
        <Text style={textStyles.muted}>
          This is the name admins and opponents will use to verify you. Do not use a different
          account on match night.
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Reward verification" />
        <ToggleRow
          title="Followed PlayMechi on Instagram"
          subtitle="Required before match day to qualify for rewards."
          value={followedInstagram}
          onValueChange={setFollowedInstagram}
        />
        {followedInstagram ? (
          <Field
            label="Instagram username"
            value={instagramUsername}
            onChangeText={(value) => setInstagramUsername(value.replace(/^@+/, ''))}
            placeholder="yourhandle"
          />
        ) : null}
        <ToggleRow
          title="Subscribed to PlayMechi on YouTube"
          subtitle="Required before match day to qualify for rewards."
          value={subscribedYoutube}
          onValueChange={setSubscribedYoutube}
        />
        {subscribedYoutube ? (
          <Field
            label="YouTube email or channel"
            value={youtubeName}
            onChangeText={setYoutubeName}
            placeholder="Email or channel name"
          />
        ) : null}
        <View style={styles.linkRow}>
          <Button
            label="Open Instagram"
            icon="logo-instagram"
            variant="secondary"
            onPress={() => void openExternal(PLAYMECHI_INSTAGRAM_URL)}
          />
          <Button
            label="Open YouTube"
            icon="logo-youtube"
            variant="secondary"
            onPress={() => void openExternal(PLAYMECHI_YOUTUBE_URL)}
          />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Confirm rules" />
        <ToggleRow
          title={`Available at ${selectedConfig.timeLabel}`}
          subtitle={selectedConfig.dateLabel}
          value={availableAt8pm}
          onValueChange={setAvailableAt8pm}
        />
        <ToggleRow
          title="I accept tournament rules"
          subtitle="Admins verify results, reward eligibility, disputes, and final standings."
          value={acceptedRules}
          onValueChange={setAcceptedRules}
        />
      </Card>

      <Button
        label={
          currentRegistration
            ? 'Update registration'
            : registrationClosed
              ? 'Registration closed'
              : 'Lock my slot'
        }
        icon="ticket"
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={!canSubmit}
      />
    </Screen>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryDark }}
        thumbColor={value ? colors.primary : colors.faint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  slotText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  linkRow: {
    gap: spacing.sm,
  },
  toggleRow: {
    minHeight: 68,
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
  toggleCopy: {
    flex: 1,
    gap: 3,
  },
  toggleTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  toggleSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
});
