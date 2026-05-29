import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkInTournament, getTournamentRegistrationSummary, getTournamentState, registerForTournament, submitTournamentResult, verifyWeekendCupPayment } from '../api/mechi';
import { useAuth } from '../auth/AuthProvider';
import { TOURNAMENT_ENTRY_FROM_LABEL, TOURNAMENT_GAME_BY_KEY, TOURNAMENT_GAMES, TOURNAMENT_PRIZE_POOL, TOURNAMENT_PUBLIC_URL, TOURNAMENT_REGULAR_PRICING_LABEL, TOURNAMENT_RULES, getFallbackTournamentSummary, getGameFromParam, getTournamentTotals } from '../config/tournament';
import { Card, Field, HeroCard, PrimaryButton, RowCard, Screen, SectionTitle, Stat, StatusPill, images, p, useToast } from '../ui/production-ui';
import type { OnlineTournamentGameKey } from '../types';

const img: Record<OnlineTournamentGameKey, any> = {
  pubgm: images.pubg,
  codm: images.codm,
  efootball: images.efootball,
  freefire: images.freefire,
};

export function TournamentDetailsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const game = getGameFromParam(id, 'pubgm');
  const config = TOURNAMENT_GAME_BY_KEY[game];
  const summaryQuery = useQuery({ queryKey: ['tournament-registration'], queryFn: getTournamentRegistrationSummary });
  const stateQuery = useQuery({ queryKey: ['tournament-state'], queryFn: getTournamentState, refetchInterval: 30_000 });
  const summary = summaryQuery.data ?? getFallbackTournamentSummary();
  const totals = getTournamentTotals(summary);
  const gameSummary = summary.games[game];
  const releasedRooms = stateQuery.data?.rooms.filter((room) => room.game === game && room.credentials_released).length ?? 0;

  return (
    <Screen
      title={config.label}
      subtitle={`${config.format} | ${config.dateLabel} | ${config.timeLabel}`}
      breadcrumbs={[{ label: 'Home', href: '/(tabs)' }, { label: 'Arena', href: '/(tabs)/arena' }, { label: config.shortLabel }]}
      backTo="/(tabs)/arena"
      backLabel="Arena"
    >
      <HeroCard image={img[game]} label="Live on Mechi" title="Weekend Cup" subtitle={config.shortLabel} meta={`${TOURNAMENT_PRIZE_POOL} | ${config.entryFeeLabel} | Limited slots`} action="Register" onPress={() => router.push({ pathname: '/(tabs)/register', params: { game } })} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat label="Registered" value={gameSummary?.registered ?? 0} icon="people-outline" />
        <Stat label="Checked In" value={gameSummary?.checkedIn ?? 0} icon="flash-outline" />
        <Stat label="Rooms" value={releasedRooms} icon="key-outline" tone="amber" />
      </View>
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 17, fontWeight: '900' }}>Prize Desk</Text>
        <Text selectable style={{ color: p.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' }}>1st: {config.firstPrize} | 2nd: {config.secondPrize} | 3rd: {config.thirdPrize}</Text>
      </Card>
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 17, fontWeight: '900' }}>Entry Payment</Text>
        <Text selectable style={{ color: p.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' }}>
          {config.entryFeeLabel}. Paystack confirms your slot after payment clears.
        </Text>
      </Card>
      <SectionTitle title="Rules" />
      {TOURNAMENT_RULES.slice(0, 5).map((rule) => (
        <RowCard key={rule} icon="checkmark-circle-outline" title={rule} right={<View />} />
      ))}
      <PrimaryButton label="Register Now" icon="arrow-forward" onPress={() => router.push({ pathname: '/(tabs)/register', params: { game } })} />
      <PrimaryButton
        label="Open Web Page"
        icon="open-outline"
        onPress={async () => {
          try {
            await Linking.openURL(TOURNAMENT_PUBLIC_URL);
            toast.showToast({ title: 'Opening web page', body: 'PlayMechi tournament page.', tone: 'info' });
          } catch {
            toast.showToast({ title: 'Could not open page', body: 'Try again from mechi.club/playmechi/register.', tone: 'error' });
          }
        }}
      />
    </Screen>
  );
}

export function RegisterTournamentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ game?: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const selectedGame = getGameFromParam(params.game, 'pubgm');
  const { user } = useAuth();
  const [game, setGame] = useState<OnlineTournamentGameKey>(selectedGame);
  const [ign, setIgn] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const summaryQuery = useQuery({ queryKey: ['tournament-registration'], queryFn: getTournamentRegistrationSummary, refetchInterval: 30_000 });
  const registration = summaryQuery.data?.registrations.find((item) => item.game === game);
  const isPaid = registration?.payment_status === 'paid';

  useEffect(() => {
    const current = summaryQuery.data?.registrations.find((item) => item.game === game);
    if (!current) return;
    if (!ign && current.in_game_username) setIgn(current.in_game_username);
    if (!paymentReference && current.payment_reference) setPaymentReference(current.payment_reference);
  }, [game, ign, paymentReference, summaryQuery.data?.registrations]);

  const mutation = useMutation({
    mutationFn: registerForTournament,
    onSuccess: async (response) => {
      const nextReference = response.reference ?? response.registration?.payment_reference ?? '';
      if (nextReference) setPaymentReference(nextReference);
      await queryClient.invalidateQueries({ queryKey: ['tournament-registration'] });
      await queryClient.invalidateQueries({ queryKey: ['tournament-state'] });
      if (response.authorization_url) {
        try {
          await Linking.openURL(response.authorization_url);
        } catch {
          toast.showToast({ title: 'Open payment link failed', body: 'Use the Paystack link from the registration response or try again.', tone: 'error' });
          return;
        }
        toast.showToast({ title: 'Payment opened', body: 'Return here after payment and verify.', tone: 'info' });
      } else {
        toast.showToast({ title: 'Registration saved', body: 'Your slot is now on the tournament desk.', tone: 'success' });
      }
    },
    onError: (error) => toast.showToast({ title: 'Registration failed', body: error instanceof Error ? error.message : 'Try again.', tone: 'error' }),
  });

  async function verify(reference: string) {
    const cleanReference = reference.trim();
    if (!cleanReference) {
      toast.showToast({ title: 'Add payment reference', body: 'Paste or keep the Paystack reference before verifying.', tone: 'warning' });
      return;
    }
    try {
      const response = await verifyWeekendCupPayment(cleanReference);
      setPaymentReference(response.reference ?? response.registration?.payment_reference ?? cleanReference);
      await queryClient.invalidateQueries({ queryKey: ['tournament-registration'] });
      await queryClient.invalidateQueries({ queryKey: ['tournament-state'] });
      toast.showToast({
        title: response.registration?.payment_status === 'paid' || response.status === 'paid' ? 'Payment verified' : 'Payment checked',
        body: response.registration?.payment_status === 'paid' || response.status === 'paid' ? 'You can check in when the window is open.' : 'Paystack has not marked this entry paid yet.',
        tone: response.registration?.payment_status === 'paid' || response.status === 'paid' ? 'success' : 'warning',
      });
    } catch (error) {
      toast.showToast({ title: 'Verification failed', body: error instanceof Error ? error.message : 'Try later.', tone: 'error' });
    }
  }

  return (
    <Screen
      title="Register"
      subtitle="One clean form. Exact handles only."
      breadcrumbs={[{ label: 'Home', href: '/(tabs)' }, { label: 'Arena', href: '/(tabs)/arena' }, { label: 'Register' }]}
      backTo="/(tabs)/arena"
      backLabel="Arena"
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TOURNAMENT_GAMES.map((item) => (
          <Pressable
            key={item.game}
            onPress={() => {
              setGame(item.game);
              toast.showToast({ title: `${item.shortLabel} selected`, body: 'Registration will use this tournament game.', tone: 'info' });
            }}
          >
            <StatusPill label={item.shortLabel} tone={game === item.game ? 'teal' : 'blue'} />
          </Pressable>
        ))}
      </View>
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 16, fontWeight: '900' }}>{TOURNAMENT_GAME_BY_KEY[game].label}</Text>
        <Text selectable style={{ color: p.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' }}>{TOURNAMENT_GAME_BY_KEY[game].format}</Text>
        <Text selectable style={{ color: p.teal, fontSize: 13, lineHeight: 19, fontWeight: '900' }}>{TOURNAMENT_GAME_BY_KEY[game].entryFeeLabel}</Text>
        {registration ? (
          <StatusPill
            label={isPaid ? 'Payment verified' : registration.payment_status === 'pending_payment' ? 'Payment pending' : 'Registered'}
            tone={isPaid ? 'teal' : registration.payment_status === 'pending_payment' ? 'amber' : 'blue'}
          />
        ) : null}
      </Card>
      <RowCard
        icon="card-outline"
        title={TOURNAMENT_REGULAR_PRICING_LABEL}
        body={`${TOURNAMENT_ENTRY_FROM_LABEL}. eFootball is KSh 125.`}
        right={<View />}
      />
      <Field label="Exact in-game name / ID" value={ign} onChangeText={setIgn} placeholder={user?.username ?? 'Your IGN'} />
      <Field label="Instagram username" value={instagram} onChangeText={setInstagram} placeholder="@playmechi" autoCapitalize="none" />
      <Field label="YouTube name or email" value={youtube} onChangeText={setYoutube} placeholder="Your YouTube name" />
      <PrimaryButton
        label={mutation.isPending ? 'Submitting...' : 'Submit Registration'}
        icon="arrow-forward"
        disabled={mutation.isPending}
        onPress={() => {
          const cleanIgn = ign.trim() || user?.game_ids?.[game] || user?.username || '';
          if (!cleanIgn) {
            toast.showToast({ title: 'Add your game ID', body: 'Exact in-game name or ID is required for tournament entry.', tone: 'warning' });
            return;
          }
          mutation.mutate({
            game,
            in_game_username: cleanIgn,
            instagram_username: instagram.trim(),
            youtube_name: youtube.trim(),
            followed_instagram: true,
            subscribed_youtube: true,
            available_at_8pm: true,
            accepted_rules: true,
          });
        }}
      />
      <Field
        label="Payment reference"
        placeholder="Paste Paystack reference"
        value={paymentReference}
        onChangeText={setPaymentReference}
        onSubmitEditing={(event) => verify(event.nativeEvent.text)}
      />
      <PrimaryButton
        label="Verify Payment"
        icon="shield-checkmark-outline"
        onPress={() => {
          if (!paymentReference.trim()) {
            toast.showToast({ title: 'Add payment reference', body: 'Paste the Paystack reference before verifying.', tone: 'warning' });
            return;
          }
          void verify(paymentReference.trim());
        }}
      />
      <RowCard
        icon="checkmark-circle-outline"
        title="Check in for this game"
        body={isPaid ? 'Payment is verified. Confirm readiness before rooms open.' : 'Register and verify payment before check-in.'}
        onPress={() => router.push({ pathname: '/check-in', params: { game } })}
      />
    </Screen>
  );
}

export function SubmitProofScreen() {
  const toast = useToast();
  const [game, setGame] = useState<OnlineTournamentGameKey>('pubgm');
  const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [kills, setKills] = useState('0');
  const [placement, setPlacement] = useState('1');

  const mutation = useMutation({
    mutationFn: submitTournamentResult,
    onSuccess: () => toast.showToast({ title: 'Proof submitted', body: 'Operators will review it.', tone: 'success' }),
    onError: (error) => toast.showToast({ title: 'Proof failed', body: error instanceof Error ? error.message : 'Try again.', tone: 'error' }),
  });

  async function pick() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82 });
      if (result.canceled) {
        toast.showToast({ title: 'No image selected', body: 'Choose a clear result screenshot when ready.', tone: 'warning' });
        return;
      }
      if (result.assets[0]) {
        setFile(result.assets[0]);
        toast.showToast({ title: 'Screenshot selected', body: result.assets[0].fileName ?? 'Ready to upload.', tone: 'success' });
      }
    } catch (error) {
      toast.showToast({ title: 'Image picker failed', body: error instanceof Error ? error.message : 'Try again.', tone: 'error' });
    }
  }

  return (
    <Screen
      title="Submit proof"
      subtitle="Upload clear screenshots showing scores and placement."
      breadcrumbs={[{ label: 'Home', href: '/(tabs)' }, { label: 'Matches', href: '/(tabs)/feed' }, { label: 'Submit proof' }]}
      backTo="/(tabs)/feed"
      backLabel="Matches"
    >
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 16, fontWeight: '900' }}>Match</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TOURNAMENT_GAMES.map((item) => (
            <Pressable
              key={item.game}
              onPress={() => {
                setGame(item.game);
                toast.showToast({ title: `${item.shortLabel} proof`, body: 'Upload the matching score screenshot.', tone: 'info' });
              }}
            >
              <StatusPill label={item.shortLabel} tone={game === item.game ? 'teal' : 'blue'} />
            </Pressable>
          ))}
        </View>
      </Card>
      <PrimaryButton label={file ? 'Image Selected' : 'Choose Screenshot'} icon="image-outline" onPress={pick} />
      <Field label="Kills" value={kills} onChangeText={setKills} keyboardType="number-pad" />
      <Field label="Placement" value={placement} onChangeText={setPlacement} keyboardType="number-pad" />
      <PrimaryButton
        label={mutation.isPending ? 'Uploading...' : 'Submit Proof'}
        icon="cloud-upload-outline"
        disabled={!file || mutation.isPending}
        onPress={() => {
          if (!file) return;
          if (game === 'efootball') {
            mutation.mutate({ game, uri: file.uri, name: file.fileName, mimeType: file.mimeType, player1_score: Number(kills), player2_score: Number(placement) });
          } else {
            mutation.mutate({ game, uri: file.uri, name: file.fileName, mimeType: file.mimeType, match_number: 1, kills: Number(kills), placement: Number(placement) });
          }
        }}
      />
    </Screen>
  );
}

export function TeamsScreen() {
  const toast = useToast();

  return (
    <Screen
      title="Teams"
      subtitle="Squads and players to watch."
      breadcrumbs={[{ label: 'Home', href: '/(tabs)' }, { label: 'Arena', href: '/(tabs)/arena' }, { label: 'Teams' }]}
      backTo="/(tabs)/arena"
      backLabel="Arena"
    >
      {['Nairobi Ninjas', 'Coast Clutch', 'Rift Raiders', 'Mechi All Stars'].map((team, index) => (
        <RowCard
          key={team}
          icon="people-outline"
          title={`${index + 1}. ${team}`}
          body={`${80 - index * 8}% win rate | ${12 - index} matches`}
          onPress={() => toast.showToast({ title: team, body: 'Team profile view is queued for the next tournament update.', tone: 'info' })}
        />
      ))}
    </Screen>
  );
}
