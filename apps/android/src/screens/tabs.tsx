import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Switch, Text, View } from 'react-native';
import { getTournamentRegistrationSummary, getTournamentState } from '../api/mechi';
import { useAuth } from '../auth/AuthProvider';
import { TOURNAMENT_ENTRY_FROM_LABEL, TOURNAMENT_GAMES, TOURNAMENT_PRIZE_POOL, getFallbackTournamentSummary, getTournamentDisplayStatus, getTournamentTotals } from '../config/tournament';
import { registerForPushNotificationsAsync } from '../lib/push-notifications';
import {
  Card,
  HeroCard,
  RowCard,
  Screen,
  SectionTitle,
  Stat,
  StatusPill,
  TileImage,
  images,
  imageSource,
  p,
  useToast,
} from '../ui/production-ui';

const homeCrumb = { label: 'Home', href: '/(tabs)' };

const gameImage: Record<string, any> = {
  pubgm: images.pubg,
  pubg: images.pubg,
  codm: images.codm,
  freefire: images.freefire,
  ff: images.freefire,
  efootball: images.efootball,
};

export function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const summaryQuery = useQuery({ queryKey: ['tournament-registration'], queryFn: getTournamentRegistrationSummary });
  const stateQuery = useQuery({ queryKey: ['tournament-state'], queryFn: getTournamentState, refetchInterval: 30_000 });
  const summary = summaryQuery.data ?? getFallbackTournamentSummary();
  const totals = getTournamentTotals(summary);
  const status = getTournamentDisplayStatus();
  const rooms = stateQuery.data?.rooms.filter((room) => room.credentials_released).length ?? 0;

  return (
    <Screen
      title={`Hi, ${user?.username ?? 'Gamer'}`}
      subtitle="Match day tools, registration, rooms, and proof in one clean place."
      breadcrumbs={[{ label: 'Home' }]}
    >
      <HeroCard
        image={images.hero}
        label={status === 'open' ? 'Live on Mechi' : status === 'active' ? 'Match Day' : 'Results Desk'}
        title="Weekend Cup"
        subtitle="Season 1"
        meta={`${TOURNAMENT_PRIZE_POOL} | ${TOURNAMENT_ENTRY_FROM_LABEL} | ${rooms} rooms live`}
        action="View Tournament"
        onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: 'pubgm' } })}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat icon="people-outline" label="Players" value={totals.registered} />
        <Stat icon="flash-outline" label="Checked In" value={totals.checkedIn} />
        <Stat icon="key-outline" label="Rooms" value={rooms} tone="amber" />
      </View>

      <SectionTitle title="Featured Games" action="Arena" onAction={() => router.push('/(tabs)/arena')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {TOURNAMENT_GAMES.slice(0, 3).map((game) => (
          <TileImage
            key={game.game}
            source={gameImage[game.game] ?? images.hero}
            title={game.label}
            body="Limited slots"
            onPress={() => router.push({ pathname: '/game/[id]', params: { id: game.game } })}
          />
        ))}
      </View>

      <SectionTitle title="Player Desk" />
      <RowCard icon="ticket-outline" title="Register for Weekend Cup" body={`${TOURNAMENT_ENTRY_FROM_LABEL}. Pick your game, confirm handles, and pay securely.`} onPress={() => router.push('/(tabs)/register')} />
      <RowCard icon="cloud-upload-outline" title="Submit Proof" body="Upload screenshots for match review." onPress={() => router.push('/submit-proof')} />
    </Screen>
  );
}

export function ArenaScreen() {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState('All');
  const summaryQuery = useQuery({ queryKey: ['tournament-registration'], queryFn: getTournamentRegistrationSummary });
  const summary = summaryQuery.data ?? getFallbackTournamentSummary();
  const visibleGames = TOURNAMENT_GAMES.filter((game) => {
    if (filter === 'All') return true;
    if (filter === 'PUBG') return game.game === 'pubgm';
    if (filter === 'CODM') return game.game === 'codm';
    if (filter === 'eFootball') return game.game === 'efootball';
    return true;
  });

  return (
    <Screen
      title="Tournaments"
      subtitle="Compete. Climb. Get your room details without noise."
      breadcrumbs={[homeCrumb, { label: 'Arena' }]}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {['All', 'PUBG', 'CODM', 'eFootball'].map((chip) => (
          <Pressable
            key={chip}
            onPress={() => {
              setFilter(chip);
              toast.showToast({ title: `${chip} tournaments`, body: chip === 'All' ? 'Showing every active cup.' : 'Filter applied.', tone: 'info' });
            }}
            style={({ pressed }) => ({
              height: 36,
              borderRadius: 18,
              paddingHorizontal: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: filter === chip ? p.teal : p.panel,
              borderWidth: 1,
              borderColor: filter === chip ? p.teal : p.line,
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <Text style={{ color: filter === chip ? p.ink : p.text, fontSize: 12, fontWeight: '900' }}>{chip}</Text>
          </Pressable>
        ))}
      </View>

      {visibleGames.map((game) => {
        const count = summary.games[game.game];
        return (
          <Pressable key={game.game} onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: game.game } })} style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', minHeight: 144 }}>
                <Image source={imageSource(gameImage[game.game] ?? images.hero)} style={{ width: 136, height: '100%' }} />
                <View style={{ flex: 1, padding: 13, gap: 8 }}>
                  <StatusPill label={count?.full ? 'Waitlist' : 'Registration Open'} tone={count?.full ? 'coral' : 'teal'} />
                  <Text selectable style={{ color: p.text, fontSize: 22, lineHeight: 24, fontWeight: '900', textTransform: 'uppercase' }}>{game.label}</Text>
                  <Text selectable style={{ color: p.muted, fontSize: 12, lineHeight: 17, fontWeight: '700' }}>{game.format} | {game.dateLabel}</Text>
                  <Text selectable style={{ color: p.teal, fontSize: 12, lineHeight: 16, fontWeight: '900' }}>{game.entryFeeLabel}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="trophy-outline" color={p.amber} size={18} />
                    <Text selectable style={{ color: p.teal, fontSize: 15, fontWeight: '900' }}>{game.firstPrize}</Text>
                    <Text selectable style={{ color: p.muted, fontSize: 12, fontWeight: '800' }}>Limited slots</Text>
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

export function FeedScreen() {
  const router = useRouter();
  const toast = useToast();
  const [remindersOn, setRemindersOn] = useState(true);
  const stateQuery = useQuery({ queryKey: ['tournament-state'], queryFn: getTournamentState, refetchInterval: 30_000 });
  const room = stateQuery.data?.rooms.find((item) => item.credentials_released);

  return (
    <Screen
      title="My Matches"
      subtitle="Upcoming matches, live rooms, reminders, and result proof."
      breadcrumbs={[homeCrumb, { label: 'Matches' }]}
    >
      <HeroCard
        image={images.codm}
        label={room ? 'Room Released' : 'Upcoming'}
        title="Weekend Cup"
        subtitle="Season 1"
        meta={room ? `${room.title ?? 'Room'} | ID ready` : 'Check in before rooms open'}
        action={room ? 'View Room' : 'Check In'}
        onPress={() => router.push(room ? '/rooms' : '/check-in')}
      />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(50,224,196,0.12)' }}>
            <Ionicons name="notifications-outline" color={p.teal} size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ color: p.text, fontSize: 16, fontWeight: '900' }}>Match Reminder</Text>
            <Text selectable style={{ color: p.muted, fontSize: 12, lineHeight: 17, fontWeight: '600' }}>Push alerts for rooms, check-in, and proof review.</Text>
          </View>
          <Switch
            value={remindersOn}
            onValueChange={async (value) => {
              if (value) {
                const token = await registerForPushNotificationsAsync();
                if (!token) {
                  setRemindersOn(false);
                  toast.showToast({
                    title: 'Push permission needed',
                    body: 'Open alert settings to enable phone notifications for match reminders.',
                    tone: 'warning',
                  });
                  router.push('/notifications/permission');
                  return;
                }
              }
              setRemindersOn(value);
              toast.showToast({
                title: value ? 'Match reminders on' : 'Match reminders paused',
                body: value ? 'Room and proof alerts stay enabled on this device.' : 'You can re-enable reminders anytime.',
                tone: value ? 'success' : 'warning',
              });
            }}
            thumbColor="#fff"
            trackColor={{ false: p.panel3, true: p.teal }}
          />
        </View>
      </Card>
      <RowCard icon="cloud-upload-outline" title="Submit Result Proof" body="Upload clear score screenshots." onPress={() => router.push('/submit-proof')} />
      <RowCard icon="podium-outline" title="Results & Standings" body="Track verified submissions and payout state." onPress={() => router.push('/results')} />
    </Screen>
  );
}

export function CommunityScreen() {
  const router = useRouter();
  const toast = useToast();
  const articles = [
    { title: 'Weekend Cup modes locked', tag: 'Official', image: images.hero },
    { title: 'How check-in works', tag: 'Tips', image: images.freefire },
    { title: 'Battle royale habits that win rooms', tag: 'Guide', image: images.pubg },
  ];

  return (
    <Screen title="Blog" subtitle="News, tips, and updates from PlayMechi." breadcrumbs={[homeCrumb, { label: 'Blog' }]}>
      <HeroCard
        image={images.hero}
        label="Featured"
        title="Weekend Cup"
        subtitle="Season 1"
        meta="Modes, maps, and match notes locked."
        action="Read"
        onPress={() => {
          toast.showToast({ title: 'Opening article', body: 'Weekend Cup update.', tone: 'info' });
          router.push('/blog/update');
        }}
      />
      {articles.slice(1).map((article) => (
        <Pressable
          key={article.title}
          onPress={() => {
            toast.showToast({ title: 'Opening article', body: article.title, tone: 'info' });
            router.push('/blog/update');
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
        >
          <Card style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
            <Image source={imageSource(article.image)} style={{ width: 68, height: 68, borderRadius: 12 }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text selectable style={{ color: p.teal, fontSize: 12, fontWeight: '900' }}>{article.tag}</Text>
              <Text selectable style={{ color: p.text, fontSize: 17, lineHeight: 20, fontWeight: '900' }}>{article.title}</Text>
            </View>
            <Ionicons name="chevron-forward" color={p.faint} size={20} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const initials = (user?.username ?? 'Gamer').slice(0, 2).toUpperCase();

  return (
    <Screen title="Profile" subtitle="Your player identity, rewards, and account tools." breadcrumbs={[homeCrumb, { label: 'Profile' }]}>
      <Card>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 78, height: 78, borderRadius: 24, borderWidth: 2, borderColor: p.teal, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(50,224,196,0.12)' }}>
            <Text selectable style={{ color: p.text, fontSize: 26, fontWeight: '900' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ color: p.text, fontSize: 22, fontWeight: '900' }}>{user?.username ?? 'Gamer'}</Text>
            <Text selectable style={{ color: p.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' }}>{user?.country ?? 'Kenya'} | {user?.region ?? 'Nairobi'}</Text>
            <StatusPill label={`Level ${user?.level ?? 1}`} tone="teal" />
          </View>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat icon="trophy-outline" label="Wins" value={0} tone="amber" />
        <Stat icon="game-controller-outline" label="Matches" value={user?.selected_games?.length ?? 0} />
        <Stat icon="sparkles-outline" label="XP" value={user?.xp ?? 0} />
      </View>

      <RowCard icon="person-outline" title="Edit Profile" body="Update country, handles, and notification phone." onPress={() => router.push('/profile/edit')} />
      <RowCard icon="time-outline" title="Match History" body="Past rooms and match recaps." onPress={() => router.push('/match-history')} />
      <RowCard icon="card-outline" title="Payment Methods" body="Manage payout and entry payment options." onPress={() => router.push('/payment-methods')} />
      <RowCard icon="settings-outline" title="Settings" body="Security, language, and alerts." onPress={() => router.push('/settings')} />
      <RowCard
        icon="log-out-outline"
        title="Sign Out"
        body="Leave this device signed out."
        right={<Ionicons name="chevron-forward" color={p.coral} size={21} />}
        onPress={async () => {
          await signOut();
          toast.showToast({ title: 'Signed out', body: 'This device is no longer signed in.', tone: 'success' });
        }}
      />
    </Screen>
  );
}
