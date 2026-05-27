import * as Device from 'expo-device';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { checkInTournament, getTournamentState } from '../api/mechi';
import { useAuth } from '../auth/AuthProvider';
import { TOURNAMENT_GAME_BY_KEY, TOURNAMENT_GAMES, getGameFromParam } from '../config/tournament';
import { useNotifications } from '../data/notifications-context';
import { registerForPushNotificationsAsync } from '../lib/push-notifications';
import { Card, Field, HeroCard, PrimaryButton, RowCard, Screen, SectionTitle, Stat, StatusPill, images, p, useToast } from '../ui/production-ui';
import type { OnlineTournamentGameKey } from '../types';

const homeCrumb = { label: 'Home', href: '/(tabs)' };

export function ChallengesScreen() {
  const router = useRouter();
  const toast = useToast();

  return (
    <Screen title="Challenges" subtitle="Complete tasks, earn XP, and stay reward-ready." breadcrumbs={[homeCrumb, { label: 'Challenges' }]} backTo="/(tabs)" backLabel="Home">
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 18, fontWeight: '900' }}>2,450 XP</Text>
        <Text selectable style={{ color: p.muted, fontSize: 13, fontWeight: '700' }}>Level 12 | 550 XP to next level</Text>
      </Card>
      <RowCard icon="trophy-outline" title="Join 1 tournament" body="Participate in any tournament." onPress={() => router.push('/(tabs)/arena')} />
      <RowCard icon="flash-outline" title="Win 3 matches" body="Win any 3 matches this week." onPress={() => toast.showToast({ title: 'Challenge tracked', body: 'Wins update after operators verify match results.', tone: 'info' })} />
      <RowCard icon="cloud-upload-outline" title="Submit proof fast" body="Submit result proof within 10 minutes." onPress={() => router.push('/submit-proof')} />
    </Screen>
  );
}

export function ChallengeDetailScreen() {
  const router = useRouter();

  return (
    <Screen title="Challenge" subtitle="Weekend Warrior" breadcrumbs={[homeCrumb, { label: 'Challenges', href: '/challenges' }, { label: 'Weekend Warrior' }]} backTo="/challenges" backLabel="Challenges">
      <HeroCard image={images.hero} label="Challenge" title="Weekend Warrior" subtitle="Finish Top 3" meta="Reward: 500 XP" action="Start" onPress={() => router.push('/(tabs)/register')} />
      <RowCard icon="checkmark-circle-outline" title="Register for Weekend Cup" body="Complete before match day." onPress={() => router.push('/(tabs)/register')} />
      <RowCard icon="checkmark-circle-outline" title="Check in on time" body="Be ready before rooms open." onPress={() => router.push('/check-in')} />
    </Screen>
  );
}

export function LeaderboardScreen() {
  const toast = useToast();

  return (
    <Screen title="Leaderboard" subtitle="Current player rankings for Weekend Cup." breadcrumbs={[homeCrumb, { label: 'Leaderboard' }]} backTo="/(tabs)/arena" backLabel="Arena">
      {['Rynair001', 'MechiCODM', 'NairobiAce', 'CoastPro', 'SquadWipe'].map((name, index) => (
        <RowCard key={name} icon="podium-outline" title={`#${index + 1} ${name}`} body={`${12200 - index * 930} points | ${26 - index * 2} kills`} onPress={() => toast.showToast({ title: name, body: 'Detailed player stats will unlock with verified match data.', tone: 'info' })} />
      ))}
    </Screen>
  );
}

export function ResultsScreen() {
  const router = useRouter();
  const toast = useToast();

  return (
    <Screen title="Results" subtitle="Verified submissions, placements, and payout state." breadcrumbs={[homeCrumb, { label: 'Matches', href: '/(tabs)/feed' }, { label: 'Results' }]} backTo="/(tabs)/feed" backLabel="Matches">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat label="Reviewed" value="18" icon="checkmark-circle-outline" />
        <Stat label="Pending" value="4" icon="time-outline" tone="amber" />
        <Stat label="Rejected" value="1" icon="close-circle-outline" tone="coral" />
      </View>
      <RowCard icon="trophy-outline" title="PUBG Mobile Room 1" body="Verified | Winner: Rynair001" onPress={() => toast.showToast({ title: 'Result verified', body: 'Winner and payout state are locked by operators.', tone: 'success' })} />
      <RowCard icon="game-controller-outline" title="CODM Match 2" body="Review pending" onPress={() => router.push('/submit-proof')} />
    </Screen>
  );
}

export function MatchHistoryScreen() {
  const toast = useToast();

  return (
    <Screen title="Match history" subtitle="Past rooms and recaps." breadcrumbs={[homeCrumb, { label: 'Profile', href: '/(tabs)/profile' }, { label: 'Match history' }]} backTo="/(tabs)/profile" backLabel="Profile">
      <RowCard icon="time-outline" title="Weekend Cup | CODM" body="Upcoming | 8:00 PM EAT" onPress={() => toast.showToast({ title: 'Upcoming match', body: 'Room details appear once operators release them.', tone: 'info' })} />
      <RowCard icon="checkmark-circle-outline" title="PUBG Solo Room" body="Completed | 18 kills" onPress={() => toast.showToast({ title: 'Completed match', body: 'Proof and recap are verified.', tone: 'success' })} />
      <RowCard icon="close-circle-outline" title="Free Fire Clash" body="Eliminated | placement 8" onPress={() => toast.showToast({ title: 'Match recap', body: 'Placement is recorded for history.', tone: 'info' })} />
    </Screen>
  );
}

export function PaymentMethodsScreen() {
  const toast = useToast();

  return (
    <Screen title="Payment" subtitle="Entry payments and payout readiness." breadcrumbs={[homeCrumb, { label: 'Profile', href: '/(tabs)/profile' }, { label: 'Payment' }]} backTo="/(tabs)/profile" backLabel="Profile">
      <RowCard icon="phone-portrait-outline" title="M-Pesa" body="+254 712 345 678" onPress={() => toast.showToast({ title: 'M-Pesa ready', body: 'Use the tournament payment prompt for live entry payments.', tone: 'info' })} />
      <RowCard icon="card-outline" title="Paystack Card" body="Card payments for tournament entries." onPress={() => toast.showToast({ title: 'Paystack cards', body: 'Card checkout opens during tournament registration.', tone: 'info' })} />
      <RowCard icon="business-outline" title="Bank payout" body="Add payout details before prize review." onPress={() => toast.showToast({ title: 'Payout details', body: 'Operators confirm payout details with prize winners.', tone: 'warning' })} />
    </Screen>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  return (
    <Screen title="Settings" subtitle="Security, alerts, and app preferences." breadcrumbs={[homeCrumb, { label: 'Profile', href: '/(tabs)/profile' }, { label: 'Settings' }]} backTo="/(tabs)/profile" backLabel="Profile">
      <RowCard icon="notifications-outline" title="Alert settings" body="Choose push, room, and proof alerts." onPress={() => router.push('/notifications/settings')} />
      <RowCard icon="shield-checkmark-outline" title="Security" body="Password and account protection." onPress={() => router.push('/settings/security')} />
      <RowCard icon="globe-outline" title="Language" body="English" onPress={() => router.push('/settings/language')} />
      <RowCard icon="help-circle-outline" title="Support" body="Rules, disputes, and operator help." onPress={() => router.push('/support')} />
    </Screen>
  );
}

export function GameDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const game = getGameFromParam(id, 'pubgm');
  const config = TOURNAMENT_GAME_BY_KEY[game];
  const image = game === 'codm' ? images.codm : game === 'efootball' ? images.efootball : game === 'freefire' ? images.freefire : images.pubg;

  return (
    <Screen title={config.label} subtitle={config.format} breadcrumbs={[homeCrumb, { label: 'Arena', href: '/(tabs)/arena' }, { label: config.shortLabel }]} backTo="/(tabs)/arena" backLabel="Arena">
      <HeroCard image={image} label="Tournament game" title={config.shortLabel} subtitle="Weekend Cup" meta={`${config.dateLabel} | ${config.timeLabel}`} action="View Tournament" onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: game } })} />
      <RowCard icon="calendar-outline" title="Schedule" body={`${config.dateLabel} at ${config.timeLabel}`} onPress={() => router.push('/check-in')} />
      <RowCard icon="trophy-outline" title="Prize" body={`${config.firstPrize}, ${config.secondPrize}, ${config.thirdPrize}`} onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: game } })} />
      <RowCard icon="people-outline" title="Slots" body="Limited slots available" onPress={() => router.push('/(tabs)/register')} />
    </Screen>
  );
}

export function BlogDetailScreen() {
  const router = useRouter();

  return (
    <Screen title="Article" subtitle="Weekend Cup Season 1" breadcrumbs={[homeCrumb, { label: 'Blog', href: '/(tabs)/community' }, { label: 'Weekend Cup' }]} backTo="/(tabs)/community" backLabel="Blog">
      <HeroCard image={images.hero} label="Official" title="Modes & maps" subtitle="Locked" meta="Everything players need before match day." />
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 17, fontWeight: '900' }}>Match notes</Text>
        <Text selectable style={{ color: p.muted, fontSize: 13, lineHeight: 21, fontWeight: '700' }}>Check in early, keep your in-game name exact, and submit proof immediately after every match. Room information appears inside the app when released.</Text>
      </Card>
      <PrimaryButton label="Open Arena" icon="trophy-outline" onPress={() => router.push('/(tabs)/arena')} />
    </Screen>
  );
}

export function EditProfileScreen() {
  const toast = useToast();

  return (
    <Screen title="Edit profile" subtitle="Update player details and handles." breadcrumbs={[homeCrumb, { label: 'Profile', href: '/(tabs)/profile' }, { label: 'Edit profile' }]} backTo="/(tabs)/profile" backLabel="Profile">
      <RowCard icon="person-outline" title="Player name" body="Change display name on web." onPress={() => toast.showToast({ title: 'Profile editing', body: 'Full profile editing stays synced with your PlayMechi web account.', tone: 'info' })} />
      <RowCard icon="game-controller-outline" title="Game handles" body="PUBG, CODM, eFootball, Free Fire." onPress={() => toast.showToast({ title: 'Game handles', body: 'Use exact in-game names for every tournament.', tone: 'info' })} />
      <RowCard icon="logo-whatsapp" title="WhatsApp" body="Used for room reminders." onPress={() => toast.showToast({ title: 'WhatsApp reminders', body: 'Operators use this for match-day notices only.', tone: 'info' })} />
    </Screen>
  );
}

export function LegalSupportScreen() {
  const toast = useToast();

  async function openSupport() {
    try {
      await Linking.openURL('https://mechi.club/support');
      toast.showToast({ title: 'Opening support', body: 'Use match ID and screenshots for faster help.', tone: 'info' });
    } catch {
      toast.showToast({ title: 'Support link failed', body: 'Try https://mechi.club/support in your browser.', tone: 'error' });
    }
  }

  return (
    <Screen title="Support" subtitle="Rules, disputes, and player help." breadcrumbs={[homeCrumb, { label: 'Profile', href: '/(tabs)/profile' }, { label: 'Support' }]} backTo="/settings" backLabel="Settings">
      <RowCard icon="help-circle-outline" title="How do I join a tournament?" body="Register, pay entry if required, then check in before rooms open." onPress={() => toast.showToast({ title: 'Tournament flow', body: 'Register, check in, wait for room release, then submit proof.', tone: 'info' })} />
      <RowCard icon="alert-circle-outline" title="Report a problem" body="Send match ID, screenshot, and a short explanation." onPress={openSupport} />
      <RowCard icon="logo-whatsapp" title="WhatsApp support" body="Use official support channels only." onPress={() => toast.showToast({ title: 'WhatsApp support', body: 'Only trust official PlayMechi support numbers and groups.', tone: 'warning' })} />
    </Screen>
  );
}

export function NotificationSettingsScreen() {
  const toast = useToast();
  return (
    <Screen title="Alert settings" subtitle="Control match-day notifications." breadcrumbs={[homeCrumb, { label: 'Settings', href: '/settings' }, { label: 'Alerts' }]} backTo="/settings" backLabel="Settings">
      <RowCard icon="notifications-outline" title="Room releases" body="Notify when room ID and password are released." onPress={() => toast.showToast({ title: 'Room release alerts', body: 'Push alerts are sent when operators release room details.', tone: 'info' })} />
      <RowCard icon="time-outline" title="Check-in reminders" body="Remind me before check-in closes." onPress={() => toast.showToast({ title: 'Check-in reminders', body: 'Reminders use tournament timing in EAT.', tone: 'info' })} />
      <PrimaryButton
        label="Enable Push Alerts"
        icon="notifications-outline"
        onPress={async () => {
          const token = await registerForPushNotificationsAsync();
          toast.showToast({ title: token ? 'Push alerts enabled' : 'Push permission not granted', tone: token ? 'success' : 'warning' });
        }}
      />
    </Screen>
  );
}

export function NotificationPermissionScreen() {
  return <NotificationSettingsScreen />;
}

export function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, markRead, refetch, isLoading } = useNotifications();

  return (
    <Screen title="Notifications" subtitle="Tournament, match, and system updates." breadcrumbs={[homeCrumb, { label: 'Notifications' }]} backTo="/(tabs)" backLabel="Home">
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 17, fontWeight: '900' }}>{unreadCount} unread</Text>
        <Text selectable style={{ color: p.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' }}>{isLoading ? 'Refreshing live alerts...' : 'Live tournament alerts from PlayMechi.'}</Text>
      </Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PrimaryButton label="Refresh" icon="refresh-outline" onPress={refetch} />
        <PrimaryButton label="Mark Read" icon="checkmark-done-outline" onPress={markAllRead} />
      </View>
      {notifications.length ? (
        notifications.map((item) => (
          <RowCard
            key={item.id}
            icon={item.unread ? 'notifications-outline' : 'checkmark-circle-outline'}
            title={item.title}
            body={`${item.category} | ${item.time}${item.body ? ` | ${item.body}` : ''}`}
            right={<StatusPill label={item.unread ? 'New' : item.destinationHint} tone={item.unread ? 'teal' : 'blue'} />}
            onPress={() => {
              markRead(item.id);
              router.push(item.destination as never);
            }}
          />
        ))
      ) : (
        <>
          <RowCard icon="flash-outline" title="Check-in is open" body="Weekend Cup check-in alerts will appear here." onPress={() => router.push('/check-in')} />
          <RowCard icon="key-outline" title="Room details" body="Room IDs and passwords appear when operators release them." onPress={() => router.push('/rooms')} />
          <RowCard icon="notifications-outline" title="Enable push alerts" body="Ask this phone for notification permission." onPress={() => router.push('/notifications/settings')} />
        </>
      )}
    </Screen>
  );
}

export function SecuritySettingsScreen() {
  const toast = useToast();

  return (
    <Screen title="Security" subtitle="Password and account protection." breadcrumbs={[homeCrumb, { label: 'Settings', href: '/settings' }, { label: 'Security' }]} backTo="/settings" backLabel="Settings">
      <RowCard icon="lock-closed-outline" title="Password" body="Change your password from the secure web account page." onPress={() => toast.showToast({ title: 'Password security', body: 'Use the PlayMechi web account page for password changes.', tone: 'info' })} />
      <RowCard icon="phone-portrait-outline" title="Signed-in device" body="This Android device is active." onPress={() => toast.showToast({ title: 'Device active', body: 'Sign out from Profile when this device should no longer be trusted.', tone: 'info' })} />
      <RowCard icon="shield-checkmark-outline" title="Account safety" body="Never share OTPs, room passwords, or payout details in public chats." onPress={() => toast.showToast({ title: 'Account safety', body: 'Mechi operators will not ask for your password.', tone: 'warning' })} />
    </Screen>
  );
}

export function LanguageSettingsScreen() {
  const toast = useToast();
  const [language, setLanguage] = useState('English');

  return (
    <Screen title="Language" subtitle="Region and app language preferences." breadcrumbs={[homeCrumb, { label: 'Settings', href: '/settings' }, { label: 'Language' }]} backTo="/settings" backLabel="Settings">
      {['English', 'Swahili soon'].map((item) => (
        <RowCard
          key={item}
          icon={item === language ? 'checkmark-circle-outline' : 'language-outline'}
          title={item}
          body={item === 'English' ? 'Current app language.' : 'Queued for a later localized release.'}
          right={item === language ? <StatusPill label="Active" /> : undefined}
          onPress={() => {
            if (item !== 'English') {
              toast.showToast({ title: 'Swahili is coming', body: 'English remains active for this release.', tone: 'info' });
              return;
            }
            setLanguage(item);
            toast.showToast({ title: 'English selected', body: 'App copy will stay in English.', tone: 'success' });
          }}
        />
      ))}
    </Screen>
  );
}

export function RoomsScreen() {
  const router = useRouter();
  const toast = useToast();
  const stateQuery = useQuery({ queryKey: ['tournament-state'], queryFn: getTournamentState, refetchInterval: 30_000 });
  const releasedRooms = stateQuery.data?.rooms.filter((room) => room.credentials_released) ?? [];

  return (
    <Screen title="Rooms" subtitle="Room IDs, passwords, and release state." breadcrumbs={[homeCrumb, { label: 'Matches', href: '/(tabs)/feed' }, { label: 'Rooms' }]} backTo="/(tabs)/feed" backLabel="Matches">
      {releasedRooms.length ? (
        releasedRooms.map((room) => (
          <RowCard
            key={room.id}
            icon="key-outline"
            title={room.title ?? `${room.game.toUpperCase()} Room ${room.match_number}`}
            body={`Room ID: ${room.room_id ?? 'Pending'} | Password: ${room.room_password ?? 'Pending'}`}
            onPress={() => toast.showToast({ title: 'Room ready', body: room.instructions ?? 'Join on time and submit proof after the match.', tone: 'success' })}
          />
        ))
      ) : (
        <RowCard icon="key-outline" title="Weekend Cup room" body={stateQuery.isLoading ? 'Checking live room release...' : 'Room details appear here when released by operators.'} onPress={() => toast.showToast({ title: 'Room not released', body: 'You will get an alert when ID and password are ready.', tone: 'warning' })} />
      )}
      <RowCard icon="notifications-outline" title="Room alerts" body="Turn on push alerts for room releases." onPress={() => router.push('/notifications/settings')} />
      <RowCard icon="cloud-upload-outline" title="After match" body="Submit score screenshots immediately after the match." onPress={() => router.push('/submit-proof')} />
    </Screen>
  );
}

export function CheckInScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ game?: string }>();
  const selectedGame = getGameFromParam(params.game, 'pubgm');
  const [game, setGame] = useState<OnlineTournamentGameKey>(selectedGame);
  const [ign, setIgn] = useState('');
  const [gameId, setGameId] = useState('');
  const [device, setDevice] = useState(Device.modelName ?? '');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp_number ?? user?.phone ?? '');
  const stateQuery = useQuery({ queryKey: ['tournament-state'], queryFn: getTournamentState, refetchInterval: 30_000 });
  const registration = stateQuery.data?.myRegistrations.find((item) => item.game === game);
  const checkedIn = registration?.check_in_status === 'checked_in' || Boolean(registration?.checked_in_at);
  const paymentPending = registration?.payment_status && registration.payment_status !== 'paid';

  useEffect(() => {
    if (!registration) return;
    if (!ign && registration.in_game_username) setIgn(registration.in_game_username);
    if (!gameId && (registration.game_uid || registration.in_game_username)) setGameId(registration.game_uid ?? registration.in_game_username);
    if (!whatsappNumber && registration.whatsapp_number) setWhatsappNumber(registration.whatsapp_number);
    if (!device && registration.device_model) setDevice(registration.device_model);
  }, [device, gameId, ign, registration, whatsappNumber]);

  const mutation = useMutation({
    mutationFn: checkInTournament,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournament-state'] });
      await queryClient.invalidateQueries({ queryKey: ['tournament-registration'] });
      toast.showToast({ title: 'Checked in', body: 'Your readiness is live. Room details will appear when released.', tone: 'success' });
      router.push('/rooms');
    },
    onError: (error) => toast.showToast({ title: 'Check-in failed', body: error instanceof Error ? error.message : 'Try again.', tone: 'error' }),
  });

  return (
    <Screen title="Check in" subtitle="Confirm you are ready before rooms open." breadcrumbs={[homeCrumb, { label: 'Matches', href: '/(tabs)/feed' }, { label: 'Check in' }]} backTo="/(tabs)/feed" backLabel="Matches">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TOURNAMENT_GAMES.map((item) => (
          <Pressable
            key={item.game}
            onPress={() => setGame(item.game)}
          >
            <StatusPill label={item.shortLabel} tone={game === item.game ? 'teal' : 'blue'} />
          </Pressable>
        ))}
      </View>
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 16, fontWeight: '900' }}>{TOURNAMENT_GAME_BY_KEY[game].label}</Text>
        <Text selectable style={{ color: p.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' }}>
          {registration ? (checkedIn ? 'Already checked in for this game.' : paymentPending ? 'Payment must be verified before check-in.' : 'Registration found. Confirm readiness now.') : 'Register for this game before check-in.'}
        </Text>
        {registration ? <StatusPill label={checkedIn ? 'Checked in' : paymentPending ? 'Payment pending' : 'Ready'} tone={checkedIn ? 'teal' : paymentPending ? 'amber' : 'blue'} /> : null}
      </Card>
      <Field label="Exact in-game name" value={ign} onChangeText={setIgn} placeholder="Your tournament handle" />
      <Field label="Game UID / player ID" value={gameId} onChangeText={setGameId} placeholder="Exact game ID" />
      <Field label="Device model" value={device} onChangeText={setDevice} placeholder="Example: Galaxy A55" />
      <Field label="WhatsApp number" value={whatsappNumber} onChangeText={setWhatsappNumber} placeholder="+254..." keyboardType="phone-pad" />
      <PrimaryButton
        label={mutation.isPending ? 'Checking in...' : checkedIn ? 'Checked In' : 'Confirm Readiness'}
        icon="checkmark-circle-outline"
        disabled={mutation.isPending || checkedIn}
        onPress={() => {
          if (!registration) {
            toast.showToast({ title: 'Register first', body: 'Tournament registration is required before check-in.', tone: 'warning' });
            router.push({ pathname: '/(tabs)/register', params: { game } });
            return;
          }
          if (paymentPending) {
            toast.showToast({ title: 'Payment not verified', body: 'Complete payment and verify before check-in.', tone: 'warning' });
            router.push({ pathname: '/(tabs)/register', params: { game } });
            return;
          }
          if (!ign.trim() || !gameId.trim() || !device.trim() || !whatsappNumber.trim()) {
            toast.showToast({ title: 'Add readiness details', body: 'IGN, game UID, device model, and WhatsApp are required.', tone: 'warning' });
            return;
          }
          mutation.mutate({
            game,
            in_game_username: ign.trim(),
            game_uid: gameId.trim(),
            device_model: device.trim(),
            whatsapp_number: whatsappNumber.trim(),
          });
        }}
      />
      <RowCard icon="ticket-outline" title="Need to register first?" body="Pick your game and submit the tournament form." onPress={() => router.push('/(tabs)/register')} />
    </Screen>
  );
}

export function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen title="Page not found" subtitle="That link does not match an active PlayMechi screen." breadcrumbs={[homeCrumb, { label: 'Not found' }]} backTo="/(tabs)" backLabel="Home">
      <RowCard icon="home-outline" title="Go home" body="Return to your player desk." onPress={() => router.replace('/(tabs)')} />
      <RowCard icon="help-circle-outline" title="Open support" body="Report the broken link if it keeps happening." onPress={() => router.push('/support')} />
    </Screen>
  );
}
