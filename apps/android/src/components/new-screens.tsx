import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoLinking from 'expo-linking';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Image,
  ImageBackground,
  type ImageSourcePropType,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FigmaButton, FigmaInput, HeaderBar, NativeSwitch, TopBar, useToast } from './figma-ui';
import { ApiError } from '../api/client';
import {
  checkInTournament,
  getProfile,
  getTournamentRegistrationSummary,
  getTournamentState,
  patchProfile,
  registerForTournament,
  startSocialLogin,
  submitTournamentResult,
  type SocialAuthProvider,
  verifyWeekendCupPayment,
} from '../api/mechi';
import { isProfileComplete, useAuth } from '../auth/AuthProvider';
import { buildGameSetup, COUNTRIES } from '../config/games';
import {
  PLAYMECHI_SUPPORT_URL,
  TOURNAMENT_GAMES,
  TOURNAMENT_PRIZE_POOL,
  TOURNAMENT_PUBLIC_URL,
  TOURNAMENT_TITLE,
  formatStatus,
  getFallbackTournamentSummary,
  getGameFromParam,
  getTournamentDisplayStatus,
  getTournamentTotals,
} from '../config/tournament';
import { registerForPushNotificationsAsync } from '../lib/push-notifications';
import { colors, radii, spacing } from '../theme';
import type {
  CountryKey,
  OnlineTournamentGameKey,
  WeekendCupRegistrationResponse,
} from '../types';

const teal = colors.primary;
const coral = '#ff4f5d';
const darkBg = '#050911';
const darkCard = '#0e1824';
const muted = '#9ca6b5';
const line = 'rgba(255,255,255,0.1)';

const images = {
  hero: require('../../assets/esports/mobile-tournament.jpg'),
  codm: require('../../assets/esports/battle-royale-controller.jpg'),
  pubg: require('../../assets/esports/mobile-team.jpg'),
  freefire: require('../../assets/esports/trophy-team.jpg'),
  efootball: require('../../assets/esports/football-controller.jpg'),
  footballVersus: require('../../assets/esports/football-versus.jpg'),
};

const gameImages: Record<string, ImageSourcePropType> = {
  codm: images.codm,
  pubg: images.pubg,
  pubgm: images.pubg,
  ff: images.freefire,
  freefire: images.freefire,
  efootball: images.efootball,
};

function imageSource(source: ImageSourcePropType | string) {
  return typeof source === 'string' ? { uri: source } : source;
}

export function HomeNewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const summaryQuery = useQuery({
    queryKey: ['tournament-registration'],
    queryFn: getTournamentRegistrationSummary,
  });
  const stateQuery = useQuery({
    queryKey: ['tournament-state'],
    queryFn: getTournamentState,
    refetchInterval: 30_000,
  });
  const summary = summaryQuery.data ?? getFallbackTournamentSummary();
  const totals = getTournamentTotals(summary);
  const status = getTournamentDisplayStatus();
  const statusLabel = status === 'open' ? 'Live on Mechi' : status === 'active' ? 'Match Day' : 'Results Desk';
  const releasedRooms = stateQuery.data?.rooms.filter((room) => room.credentials_released).length ?? 0;

  return (
    <MainDarkScreen>
      <View>
        <Text style={styles.screenTitle}>Hi, {user?.username ?? 'Gamer'}!</Text>
        <Text style={styles.screenBody}>Ready to compete today?</Text>
      </View>

      <ImageBackground source={imageSource(images.hero)} imageStyle={styles.heroImage} style={styles.hero}>
        <View style={styles.heroWash} />
        <View style={styles.heroContent}>
          <StatusPill label={statusLabel} coral={status !== 'open'} />
          <Text style={styles.heroTitle}>
            Weekend Cup{'\n'}
            <Text style={styles.teal}>Season 1</Text>
          </Text>
          <Text style={styles.heroBody}>
            {TOURNAMENT_PRIZE_POOL} | {totals.spotsLeft} slots left
          </Text>
          <Pressable onPress={() => router.push('/tournament/1')} style={styles.smallTealButton}>
            <Text style={styles.smallTealText}>Register Now</Text>
          </Pressable>
        </View>
      </ImageBackground>

      <SectionHeading title="Featured Games" />
      <View style={styles.gameTileGrid}>
        {TOURNAMENT_GAMES.map((game) => (
          <Pressable
            key={game.game}
            onPress={() => router.push({ pathname: '/game/[id]', params: { id: game.game } })}
            style={styles.gameTile}
          >
            <Image source={imageSource(gameImages[game.game] ?? images.hero)} style={styles.gameTileImage} />
            <Text numberOfLines={1} style={styles.gameTileText}>{game.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeading title="Upcoming Tournaments" />
      <View style={styles.stack}>
        {TOURNAMENT_GAMES.map((game) => {
          const gameSummary = summary.games[game.game];
          return (
            <Pressable key={game.game} onPress={() => router.push('/tournament/1')} style={styles.tournamentRow}>
              <Image source={imageSource(gameImages[game.game] ?? images.hero)} style={styles.tournamentImage} />
              <View style={styles.flex}>
                <StatusPill label={game.registrationClosed ? 'Closed' : 'Registration Open'} />
                <Text style={styles.rowTitle}>{game.shortLabel} - Weekend Cup</Text>
                <Text style={styles.rowBody}>{game.dateLabel} | {game.timeLabel}</Text>
              </View>
              <View style={styles.tournamentPrize}>
                <Ionicons name="trophy-outline" color="#f6bd3c" size={20} />
                <Text style={styles.tealStrong}>{game.firstPrize}</Text>
                <Text style={styles.rowBody}>{gameSummary?.spotsLeft ?? game.slots} left</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <DarkCard row>
        <Ionicons name={releasedRooms ? 'radio-outline' : 'notifications-outline'} color={teal} size={26} />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{releasedRooms ? `${releasedRooms} room${releasedRooms === 1 ? '' : 's'} live` : 'Room alerts ready'}</Text>
          <Text style={styles.cardBody}>Push alerts will tell players when check-in, rooms, and proof reviews change.</Text>
        </View>
      </DarkCard>
    </MainDarkScreen>
  );
}

export function ArenaNewScreen() {
  const router = useRouter();
  const summaryQuery = useQuery({
    queryKey: ['tournament-registration'],
    queryFn: getTournamentRegistrationSummary,
  });
  const summary = summaryQuery.data ?? getFallbackTournamentSummary();
  const [active, setActive] = useState<OnlineTournamentGameKey | 'all'>('all');
  const games = active === 'all' ? TOURNAMENT_GAMES : TOURNAMENT_GAMES.filter((game) => game.game === active);

  return (
    <MainDarkScreen>
      <TitleBlock title="Tournaments" body="Compete. Climb. Conquer." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail}>
        <Pressable onPress={() => setActive('all')}>
          <Text style={active === 'all' ? styles.activeChip : styles.chip}>All Games</Text>
        </Pressable>
        {TOURNAMENT_GAMES.map((game) => (
          <Pressable key={game.game} onPress={() => setActive(game.game)}>
            <Text style={active === game.game ? styles.activeChip : styles.chip}>{game.shortLabel}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.stack}>
        {games.map((game) => {
          const count = summary.games[game.game];
          return (
            <Pressable key={game.game} onPress={() => router.push('/tournament/1')} style={styles.arenaCard}>
              <Image source={imageSource(gameImages[game.game] ?? images.hero)} style={styles.arenaImage} />
              <View style={styles.flex}>
                <StatusPill label={game.registrationClosed ? 'Closed' : 'Registration Open'} coral={game.game === 'codm'} />
                <Text style={styles.arenaTitle}>{game.label}</Text>
                <Text style={styles.rowBody}>{game.format}</Text>
                <Text style={styles.rowBody}>{game.dateLabel} | {game.timeLabel}</Text>
                <View style={styles.prizeRow}>
                  <Ionicons name="trophy-outline" color="#f6bd3c" size={18} />
                  <Text style={styles.tealStrong}>{game.firstPrize}</Text>
                  <Text style={styles.rowBody}>{count?.spotsLeft ?? game.slots} slots left</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" color={muted} size={20} />
            </Pressable>
          );
        })}
      </View>
    </MainDarkScreen>
  );
}

export function FeedNewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'Upcoming' | 'Live' | 'Completed'>('Upcoming');
  const [reminder, setReminder] = useState(true);
  const stateQuery = useQuery({
    queryKey: ['tournament-state'],
    queryFn: getTournamentState,
    refetchInterval: 30_000,
  });
  const registration = stateQuery.data?.myRegistrations[0] ?? null;
  const checkInMutation = useMutation({
    mutationFn: () => {
      if (!registration) {
        throw new Error('Register before check-in.');
      }

      return checkInTournament({
        game: registration.game,
        in_game_username: registration.in_game_username,
        game_uid: registration.game_uid ?? registration.in_game_username,
        device_model: registration.device_model ?? 'Android phone',
        whatsapp_number: registration.whatsapp_number ?? user?.whatsapp_number ?? user?.phone ?? '',
        device_serial_last6: registration.device_serial_last6 ?? null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournament-state'] });
      showToast({ title: 'Checked in', body: 'Your live slot status has been updated.', tone: 'success' });
    },
    onError: (error) => {
      showToast({
        title: 'Check-in failed',
        body: error instanceof Error ? error.message : 'Try registration first.',
        tone: 'error',
      });
    },
  });

  function handleCheckIn() {
    if (!registration) {
      router.push('/(tabs)/register');
      return;
    }

    checkInMutation.mutate();
  }

  return (
    <MainDarkScreen>
      <Text style={styles.screenTitle}>My Matches</Text>
      <Segmented tabs={['Upcoming', 'Live', 'Completed']} active={tab} onChange={(next) => {
        setTab(next as typeof tab);
        if (next === 'Completed') router.push('/match-history');
      }} />

      <ImageBackground source={imageSource(images.codm)} imageStyle={styles.heroImage} style={styles.matchHero}>
        <View style={styles.heroWash} />
        <View style={styles.heroContent}>
          <StatusPill label={tab} />
          <Text style={styles.heroTitle}>
            Weekend Cup{'\n'}
            <Text style={styles.teal}>Season 1</Text>
          </Text>
          <Text style={styles.heroBody}>Call of Duty Mobile | 8:00 PM EAT</Text>
          <Pressable onPress={handleCheckIn} style={styles.smallTealButton}>
            <Text style={styles.smallTealText}>{checkInMutation.isPending ? 'Checking...' : 'Check-In'}</Text>
          </Pressable>
        </View>
      </ImageBackground>

      <DarkCard row>
        <Ionicons name="notifications-outline" color={teal} size={26} />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Match Reminder</Text>
          <Text style={styles.cardBody}>Get notified 30 minutes before your match starts.</Text>
        </View>
        <NativeSwitch value={reminder} onValueChange={setReminder} />
      </DarkCard>

      <DarkCard row>
        <Ionicons name="warning-outline" color={coral} size={26} />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Important Notice</Text>
          <Text style={styles.cardBody}>Check in on time. Late players can lose their slot.</Text>
        </View>
      </DarkCard>
    </MainDarkScreen>
  );
}

export function CommunityNewScreen() {
  const router = useRouter();
  const [active, setActive] = useState('All');
  const articles = [
    { id: 'feature', type: 'Featured', title: 'Weekend Cup Season 1: Modes & Maps Locked', body: 'Everything players need before match day.', image: images.hero },
    { id: 'check-in', type: 'Tips', title: 'How Check-In Works', body: 'Keep your slot ready before rooms open.', image: images.freefire },
    { id: 'battle-royale', type: 'Tips', title: 'Top Battle Royale Habits', body: 'Small match habits that save tournaments.', image: images.pubg },
  ];

  return (
    <MainDarkScreen>
      <TitleBlock title="Blog" body="News, tips, and updates from PlayMechi." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail}>
        {['All', 'News', 'Tips', 'Updates'].map((chip) => (
          <Pressable key={chip} onPress={() => setActive(chip)}>
            <Text style={active === chip ? styles.activeChip : styles.chip}>{chip}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ImageBackground source={imageSource(images.hero)} imageStyle={styles.heroImage} style={styles.hero}>
        <View style={styles.heroWash} />
        <View style={styles.heroContent}>
          <StatusPill label="Featured" coral />
          <Text style={styles.heroTitle}>
            Weekend Cup{'\n'}
            <Text style={styles.teal}>Season 1</Text>
          </Text>
          <Text style={styles.heroBody}>Modes, maps, and match notes locked.</Text>
          <Pressable onPress={() => router.push('/blog/feature')} style={styles.smallTealButton}>
            <Text style={styles.smallTealText}>Read</Text>
          </Pressable>
        </View>
      </ImageBackground>

      <View style={styles.stack}>
        {articles.slice(1).map((article) => (
          <Pressable key={article.id} onPress={() => router.push(`/blog/${article.id}`)} style={styles.articleRow}>
            <Image source={imageSource(article.image)} style={styles.articleThumb} />
            <View style={styles.flex}>
              <Text style={article.type === 'News' ? styles.coralText : styles.tealStrong}>{article.type}</Text>
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Text style={styles.rowBody}>{article.body}</Text>
            </View>
            <Ionicons name="chevron-forward" color={muted} size={18} />
          </Pressable>
        ))}
      </View>
    </MainDarkScreen>
  );
}

export function ProfileNewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut, user } = useAuth();
  const { showToast } = useToast();
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const summaryQuery = useQuery({
    queryKey: ['tournament-registration'],
    queryFn: getTournamentRegistrationSummary,
  });
  const profile = profileQuery.data?.profile ?? user;
  const username = profile?.username ?? 'MechiGamer';
  const initials = username.slice(0, 2).toUpperCase();
  const registrations = summaryQuery.data?.registrations ?? [];

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    showToast({ title: 'Signed out', tone: 'info' });
    router.replace('/(auth)/login');
  }

  return (
    <MainDarkScreen>
      <View style={styles.profileCard}>
        <View style={styles.editAvatar}>
          <Text style={styles.editAvatarText}>{initials}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{username}</Text>
          <Text style={styles.cardBody}>{[profile?.country, profile?.region].filter(Boolean).join(' | ') || 'Kenya'}</Text>
          <Text style={styles.cardBody}>Competitive gamer. Always grinding.</Text>
        </View>
        <Pressable onPress={() => router.push('/profile/edit')} style={styles.goPill}>
          <Text style={styles.goPillText}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.statCards}>
        <MiniDarkStat icon="trophy-outline" label="Wins" value={String(profile?.win_streak ?? 0)} />
        <MiniDarkStat icon="game-controller-outline" label="Matches" value={String(registrations.length)} />
        <MiniDarkStat icon="ribbon-outline" label="XP" value={String(profile?.xp ?? 2450)} />
      </View>

      <View style={styles.stack}>
        <DarkRow icon="game-controller-outline" title="Match History" body="Review your past matches and recaps" onPress={() => router.push('/match-history')} />
        <DarkRow icon="trophy-outline" title="Results & Standings" body="Tournament results and rankings" onPress={() => router.push('/results')} />
        <DarkRow icon="locate-outline" title="Challenges" body="Daily and event rewards" onPress={() => router.push('/challenges')} />
        <DarkRow icon="card-outline" title="Payment Methods" body="Manage saved payment options" onPress={() => router.push('/payment-methods')} />
        <DarkRow icon="settings-outline" title="Settings & Security" body="Account, privacy, preferences" onPress={() => router.push('/settings')} />
        <DarkRow icon="help-buoy-outline" title="Help & Support" body="FAQs and contact options" onPress={() => router.push('/legal')} />
        <DarkRow icon="log-out-outline" title="Log Out" body="Sign out of your account" danger onPress={handleSignOut} />
      </View>
    </MainDarkScreen>
  );
}

export function SplashNewScreen() {
  return (
    <DarkScreen>
      <View style={styles.splash}>
        <View style={styles.logoPlate}>
          <Image source={require('../../assets/logo-mark.png')} resizeMode="contain" style={styles.logoImage} />
        </View>
        <Text style={styles.splashTitle}>
          Your Game.{'\n'}Your Tournaments.{'\n'}
          <Text style={styles.teal}>One App.</Text>
        </Text>
        <Text style={styles.splashBody}>Compete. Win. Repeat.</Text>
        <Image source={imageSource(images.hero)} style={styles.splashImage} />
        <Link href="/onboarding/1" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryText}>Get Started</Text>
            <Ionicons name="chevron-forward" color={darkBg} size={20} />
          </Pressable>
        </Link>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.ghostLink}>
            <Text style={styles.ghostLinkText}>I already have an account</Text>
          </Pressable>
        </Link>
      </View>
    </DarkScreen>
  );
}

export function OnboardingNewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const step = Math.min(Math.max(Number(params.step ?? 1) || 1, 1), 4);
  const item = onboardingSteps[step - 1] ?? onboardingSteps[0]!;

  return (
    <DarkScreen>
      <View style={styles.onboarding}>
        <Text style={styles.onboardingTitle}>{item.title}</Text>
        <Text style={styles.onboardingBody}>{item.body}</Text>
        <View style={styles.phoneFrame}>
          <Image source={imageSource(item.image)} style={styles.phoneImage} />
          <View style={styles.phoneCopy}>
            <Text style={styles.phoneTitle}>{item.captionTitle}</Text>
            <Text style={styles.phoneBody}>{item.caption}</Text>
          </View>
        </View>
        <Text style={styles.stepText}>Step {step} of 4</Text>
        <View style={styles.dots}>
          {[1, 2, 3, 4].map((dot) => (
            <View key={dot} style={[styles.dot, dot === step && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.onboardingActions}>
          <Pressable onPress={() => (step === 1 ? router.replace('/(auth)/login') : router.push(`/onboarding/${step - 1}`))}>
            <Text style={styles.secondaryText}>{step === 1 ? 'Skip' : 'Back'}</Text>
          </Pressable>
          <Pressable
            onPress={() => (step === 4 ? router.replace('/(auth)/login') : router.push(`/onboarding/${step + 1}`))}
            style={styles.coralButton}
          >
            <Text style={styles.coralButtonText}>{step === 4 ? 'Get Started' : 'Next'}</Text>
            <Ionicons name="chevron-forward" color={colors.white} size={20} />
          </Pressable>
        </View>
      </View>
    </DarkScreen>
  );
}

export function LoginNewScreen() {
  const router = useRouter();
  const { signIn, token } = useAuth();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialAuthProvider | null>(null);

  useEffect(() => {
    if (token) {
      router.replace('/');
    }
  }, [router, token]);

  async function handleLogin() {
    if (!identifier.trim() || !password || submitting) return;
    setSubmitting(true);
    try {
      await signIn({ identifier: identifier.trim(), password });
      router.replace('/');
    } catch (error) {
      showToast({
        title: 'Login failed',
        body: error instanceof ApiError ? error.message : 'Check your details and try again.',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSocialLogin(provider: SocialAuthProvider) {
    if (socialProvider) return;
    setSocialProvider(provider);
    try {
      const redirectTo = ExpoLinking.createURL('auth-callback');
      const response = await startSocialLogin({ provider, redirect_to: redirectTo });
      await Linking.openURL(response.authorization_url);
      showToast({ title: 'Continue in browser', body: 'Return here after the provider confirms.', tone: 'info' });
    } catch (error) {
      showToast({
        title: 'Social login failed',
        body: error instanceof ApiError ? error.message : 'Try username, phone, or password login.',
        tone: 'error',
      });
    } finally {
      setSocialProvider(null);
    }
  }

  return (
    <AuthDarkScreen>
      <BrandLogo />
      <View style={styles.authIntro}>
        <Text style={styles.screenTitle}>Welcome Back</Text>
        <Text style={styles.screenBody}>Log in to your account</Text>
      </View>
      <DarkField icon="person-outline" label="Phone, email, or username" value={identifier} onChangeText={setIdentifier} placeholder="Phone, email, or username" />
      <DarkField
        icon="lock-closed-outline"
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry={!showPw}
        right={<Pressable onPress={() => setShowPw((value) => !value)}><Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} color={muted} size={20} /></Pressable>}
      />
      <Pressable style={styles.alignEnd} onPress={() => showToast({ title: 'Password reset', body: 'Use support if you need help recovering access.', tone: 'info' })}>
        <Text style={styles.linkText}>Forgot Password?</Text>
      </Pressable>
      <Pressable disabled={!identifier.trim() || !password || submitting} onPress={handleLogin} style={[styles.primaryButton, (!identifier.trim() || !password) && styles.disabled]}>
        <Text style={styles.primaryText}>{submitting ? 'Logging in...' : 'Login'}</Text>
      </Pressable>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.rowBody}>OR</Text>
        <View style={styles.divider} />
      </View>
      {([
        { provider: 'google' as const, label: 'Continue with Google', mark: 'G' },
        { provider: 'facebook' as const, label: 'Continue with Facebook', mark: 'f' },
      ]).map((item) => (
        <Pressable key={item.provider} disabled={Boolean(socialProvider)} onPress={() => handleSocialLogin(item.provider)} style={[styles.socialButton, socialProvider && styles.disabled]}>
          <Text style={styles.socialMark}>{item.mark}</Text>
          <Text style={styles.lightText}>{socialProvider === item.provider ? 'Opening...' : item.label}</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => router.push('/(auth)/register')} style={styles.centerLink}>
        <Text style={styles.cardBody}>Don't have an account? <Text style={styles.tealStrong}>Sign Up</Text></Text>
      </Pressable>
    </AuthDarkScreen>
  );
}

export function CreateProfileNewScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = username.trim().length >= 2 && contact.trim().length >= 5 && password.length >= 6 && password === confirmPassword && agreed;

  async function handleSignUp() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const contactValue = contact.trim();
      const isEmail = contactValue.includes('@');
      await signUp({
        username: username.trim(),
        email: isEmail ? contactValue : `${username.trim().toLowerCase()}@playmechi.local`,
        phone: isEmail ? contactValue : contactValue,
        password,
        country: 'kenya',
        region: 'Nairobi',
        platforms: ['mobile'],
        selected_games: ['pubgm'],
        game_ids: {},
        whatsapp_number: isEmail ? null : contactValue,
        whatsapp_notifications: true,
      });
      router.replace('/(onboarding)/profile');
    } catch (error) {
      showToast({
        title: 'Sign up failed',
        body: error instanceof ApiError ? error.message : 'Check your details and try again.',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthDarkScreen>
      <BrandLogo />
      <View style={styles.authIntro}>
        <Text style={styles.screenTitle}>Create Your Account</Text>
        <Text style={styles.screenBody}>Join PlayMechi and compete with the best.</Text>
      </View>
      <DarkField icon="person-outline" label="Username" value={username} onChangeText={setUsername} placeholder="Username" />
      <DarkField icon="mail-outline" label="Email or Phone Number" value={contact} onChangeText={setContact} placeholder="Email or phone number" />
      <DarkField icon="lock-closed-outline" label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
      <DarkField icon="lock-closed-outline" label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" secureTextEntry />
      <Pressable onPress={() => setAgreed((value) => !value)} style={styles.termsRow}>
        <Ionicons name={agreed ? 'checkbox' : 'square-outline'} color={agreed ? teal : muted} size={22} />
        <Text style={styles.cardBody}>I agree to the Terms of Service and Privacy Policy.</Text>
      </Pressable>
      <Pressable disabled={!canSubmit || submitting} onPress={handleSignUp} style={[styles.primaryButton, !canSubmit && styles.disabled]}>
        <Text style={styles.primaryText}>{submitting ? 'Creating...' : 'Sign Up'}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(auth)/login')} style={styles.centerLink}>
        <Text style={styles.cardBody}>Already have an account? <Text style={styles.tealStrong}>Login</Text></Text>
      </Pressable>
    </AuthDarkScreen>
  );
}

export function CompleteProfileNewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshUser, user } = useAuth();
  const { showToast } = useToast();
  const [country, setCountry] = useState<CountryKey>((user?.country as CountryKey) ?? 'kenya');
  const [region, setRegion] = useState(user?.region ?? COUNTRIES.kenya.regions[0]!);
  const [game, setGame] = useState<OnlineTournamentGameKey>('pubgm');
  const [gameId, setGameId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp_number ?? user?.phone ?? '');

  const saveMutation = useMutation({
    mutationFn: () =>
      patchProfile({
        country,
        region,
        whatsapp_number: whatsappNumber.trim() || null,
        whatsapp_notifications: true,
        ...buildGameSetup(game, 'mobile', gameId),
      }),
    onSuccess: async () => {
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      showToast({ title: 'Profile saved', tone: 'success' });
      router.replace('/(tabs)');
    },
    onError: (error) => {
      showToast({
        title: 'Profile update failed',
        body: error instanceof ApiError ? error.message : 'Check the fields and try again.',
        tone: 'error',
      });
    },
  });

  return (
    <View style={styles.lightRoot}>
      <HeaderBar title="Edit Profile" />
      <ScrollView contentContainerStyle={styles.lightContent}>
        <LightCard title="Player Readiness">
          <LightField label="Country & Region" value={COUNTRIES[country].label} onPress={() => {
            const keys = Object.keys(COUNTRIES) as CountryKey[];
            const next = keys[(keys.indexOf(country) + 1) % keys.length] ?? 'kenya';
            setCountry(next);
            setRegion(COUNTRIES[next].regions[0] ?? 'Other');
          }} />
          <FigmaInput value={region} onChangeText={setRegion} placeholder="Region" />
        </LightCard>
        <LightCard title="Game Setup">
          <LightField label="Main Tournament Game" value={TOURNAMENT_GAMES.find((item) => item.game === game)?.label ?? 'PUBG Mobile'} onPress={() => {
            const index = TOURNAMENT_GAMES.findIndex((item) => item.game === game);
            setGame(TOURNAMENT_GAMES[(index + 1) % TOURNAMENT_GAMES.length]?.game ?? 'pubgm');
          }} />
          <FigmaInput value={gameId} onChangeText={setGameId} placeholder="Exact game ID / IGN" />
        </LightCard>
        <LightCard title="Match Alerts">
          <FigmaInput value={whatsappNumber} onChangeText={setWhatsappNumber} placeholder="WhatsApp number" keyboardType="phone-pad" />
        </LightCard>
        <FigmaButton
          label={saveMutation.isPending ? 'Saving...' : 'Save Profile'}
          loading={saveMutation.isPending}
          disabled={gameId.trim().length < 2}
          onPress={() => saveMutation.mutate()}
        />
      </ScrollView>
    </View>
  );
}

export function ChallengesNewScreen() {
  const [tab, setTab] = useState<'Daily' | 'Weekly' | 'Event'>('Daily');

  return (
    <DarkScreen header="Challenges">
      <TitleBlock
        title="Challenges"
        body="Complete challenges. Earn XP. Unlock rewards."
        italic
      />
      <View style={styles.xpCard}>
        <Ionicons name="ribbon-outline" color={teal} size={50} />
        <View style={styles.flex}>
          <Text style={styles.mutedCaps}>Your XP</Text>
          <Text style={styles.bigValue}>2,450</Text>
          <Text style={styles.mutedText}>Level 12</Text>
          <Progress pct={72} />
        </View>
        <Text style={styles.tealStrong}>550 XP</Text>
      </View>
      <Segmented tabs={['Daily', 'Weekly', 'Event']} active={tab} onChange={(next) => setTab(next as typeof tab)} />
      <View style={styles.stack}>
        {(tab === 'Event' ? eventChallenges : dailyChallenges).map((challenge) => (
          <Link key={challenge.title} href="/challenges/1" asChild>
            <Pressable style={styles.challengeRow}>
              <Ionicons name="locate-outline" color={teal} size={28} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{challenge.title}</Text>
                <Text style={styles.rowBody}>{challenge.body}</Text>
                <Progress pct={challenge.pct} />
              </View>
              <Text style={styles.rowMeta}>{challenge.value}</Text>
              <Text style={challenge.done ? styles.claimedPill : styles.goPill}>{challenge.action}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <Link href="/leaderboard" asChild>
        <Pressable style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>View Leaderboard</Text>
          <Ionicons name="chevron-forward" color={teal} size={18} />
        </Pressable>
      </Link>
    </DarkScreen>
  );
}

export function ChallengeDetailNewScreen() {
  return (
    <DarkScreen header="Challenge">
      <Hero title={'Weekend\nWarrior'} badge="Challenge" image={images.hero} />
      <DarkCard>
        <Text style={styles.cardTitle}>Challenge Overview</Text>
        <Text style={styles.cardBody}>Show off your skills this weekend. Complete all objectives to earn exclusive rewards.</Text>
      </DarkCard>
      <DarkCard>
        <Text style={styles.cardTitle}>Objectives</Text>
        {objectives.map((item) => (
          <View key={item.label} style={styles.objective}>
            <View style={styles.split}>
              <Text style={styles.lightText}>{item.label}</Text>
              <Text style={[styles.tealStrong, item.red && styles.coralText]}>{item.value}</Text>
            </View>
            <Progress pct={item.pct} coral={item.red} />
          </View>
        ))}
      </DarkCard>
      <View style={styles.twoCol}>
        <RewardCard icon="trophy-outline" title="Mechi Coins" value="1,000" />
        <RewardCard icon="gift-outline" title="Weekend Crate" value="x1" />
      </View>
      <Pressable style={styles.primaryButton}>
        <Text style={styles.primaryText}>Track Progress</Text>
      </Pressable>
    </DarkScreen>
  );
}

export function LeaderboardNewScreen() {
  return (
    <DarkScreen header="Leaderboard">
      <TitleBlock title="Leaderboard" body="See how you rank among the best gamers." />
      <ChipRail items={['Weekend Cup S1', 'All Regions', 'Overall']} />
      <Image source={imageSource(images.hero)} style={styles.bannerImage} />
      <View style={styles.table}>
        {players.map((player) => (
          <View key={player.rank} style={[styles.tableRow, player.you && styles.youRow]}>
            <Text style={styles.rankText}>{player.rank}</Text>
            <Text style={styles.tableName}>{player.name}</Text>
            <Text style={styles.tableScore}>{player.score}</Text>
            <Text style={styles.tableMeta}>{player.winrate}</Text>
          </View>
        ))}
      </View>
    </DarkScreen>
  );
}

export function ResultsNewScreen() {
  const [tab, setTab] = useState<'Live' | 'Completed' | 'Archived'>('Completed');

  return (
    <DarkScreen header="Results">
      <TitleBlock title="Results" body="Track your performance and victories." />
      <Segmented tabs={['Live', 'Completed', 'Archived']} active={tab} onChange={(next) => setTab(next as typeof tab)} />
      <View style={styles.stack}>
        {results.map((result) => (
          <ResultCard key={result.game} {...result} />
        ))}
      </View>
    </DarkScreen>
  );
}

export function MatchHistoryNewScreen() {
  const [tab, setTab] = useState<'Upcoming' | 'Live' | 'Completed'>('Completed');

  return (
    <DarkScreen header="My Matches">
      <TitleBlock title="My Matches" body="Here's your match history." italic />
      <Segmented tabs={['Upcoming', 'Live', 'Completed']} active={tab} onChange={(next) => setTab(next as typeof tab)} />
      <View style={styles.stack}>
        {matches.map((match) => (
          <View key={match.tournament} style={styles.matchRow}>
            <Image source={imageSource(match.image)} style={styles.matchImage} />
            <View style={styles.flex}>
              <StatusPill label={match.result} coral={match.result !== 'WON'} />
              <Text style={styles.rowTitle} numberOfLines={1}>{match.tournament}</Text>
              <Text style={styles.rowBody} numberOfLines={1}>{match.game}</Text>
            </View>
            <Text style={[styles.scoreText, match.result !== 'WON' && styles.coralText]}>{match.score}</Text>
            <Text style={styles.linkText}>View Recap</Text>
          </View>
        ))}
      </View>
    </DarkScreen>
  );
}

export function PaymentMethodsNewScreen() {
  return (
    <DarkScreen header="Payment">
      <TitleBlock title="Payment Methods" body="Manage your saved payment methods and preferences." />
      <Text style={styles.sectionHeaderText}>Saved Methods</Text>
      <View style={styles.stack}>
        {paymentMethods.map((method) => (
          <DarkRow
            key={method.name}
            icon={method.icon}
            title={method.name}
            body={method.detail}
            right={method.default ? 'Default' : undefined}
          />
        ))}
        <DarkRow icon="add-outline" title="Add New Payment Method" body="Cards, mobile money, or bank transfer" dashed />
      </View>
      <DarkCard row>
        <Ionicons name="shield-checkmark-outline" color={teal} size={28} />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Secure Payments</Text>
          <Text style={styles.cardBody}>Payment details are encrypted. We never store your full card details.</Text>
        </View>
      </DarkCard>
    </DarkScreen>
  );
}

export function SettingsNewScreen() {
  const [twoFactor, setTwoFactor] = useState(true);
  const router = useRouter();

  return (
    <DarkScreen header="Settings">
      <TitleBlock title="Settings & Security" body="Manage your account, security, and preferences." />
      <SectionHeading title="Account & Security" />
      <DarkRow icon="lock-closed-outline" title="Change Password" body="Update your account password" />
      <DarkRow
        icon="shield-checkmark-outline"
        title="Two-Factor Authentication"
        body="Add an extra layer of security"
        control={<NativeSwitch value={twoFactor} onValueChange={setTwoFactor} />}
      />
      <DarkRow icon="people-outline" title="Privacy" body="Manage your privacy settings" />
      <SectionHeading title="Preferences" />
      <DarkRow icon="notifications-outline" title="Notification Preferences" body="Choose alert delivery" onPress={() => router.push('/notifications/settings')} />
      <DarkRow icon="phone-portrait-outline" title="App Theme" body="Choose appearance" right="Dark" />
      <DarkRow icon="globe-outline" title="Language" body="Select language" right="English" />
      <SectionHeading title="Danger Zone" coral />
      <DarkRow icon="trash-outline" title="Delete Account" body="Permanently delete your account" danger />
    </DarkScreen>
  );
}

export function GameDetailNewScreen() {
  const router = useRouter();
  const { id = 'codm' } = useLocalSearchParams<{ id?: string }>();
  const game = gameDetails[id] ?? gameDetails.codm!;

  return (
    <DarkScreen header="Game">
      <Image source={imageSource(game.image)} style={styles.detailImage} />
      <TitleBlock title={game.title} body={game.body} />
      <View style={styles.infoPanel}>
        {game.info.map(([label, value]) => (
          <View key={label} style={styles.infoRow}>
            <Text style={styles.rowBody}>{label}</Text>
            <Text style={styles.lightStrong}>{value}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={() => router.push('/(tabs)/arena')} style={styles.primaryButton}>
        <Text style={styles.primaryText}>View Tournaments</Text>
        <Ionicons name="chevron-forward" color={darkBg} size={20} />
      </Pressable>
    </DarkScreen>
  );
}

export function BlogDetailNewScreen() {
  const router = useRouter();

  return (
    <DarkScreen header="Article">
      <Image source={imageSource(images.hero)} style={styles.detailImage} />
      <TitleBlock title="Weekend Cup Season 1: Modes & Maps Locked" body="29 May 2026 | By PlayMechi Team" />
      <Text style={styles.articleText}>
        The battlegrounds are set. The maps are locked. Now it is your turn to rise. Here is what to expect in Weekend Cup Season 1.
      </Text>
      <View style={styles.stack}>
        {articleSections.map((section) => (
          <View key={section.title} style={styles.articleRow}>
            <Image source={imageSource(section.image)} style={styles.articleThumb} />
            <View style={styles.flex}>
              <Text style={styles.articleTitle}>{section.title}</Text>
              <Text style={styles.rowBody}>{section.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <DarkCard row>
        <Ionicons name="trophy-outline" color={teal} size={28} />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Ready to join?</Text>
          <Text style={styles.cardBody}>Register for Weekend Cup and compete for glory.</Text>
        </View>
        <Pressable onPress={() => router.push('/tournament/1')} style={styles.smallTealButton}>
          <Text style={styles.smallTealText}>Register</Text>
        </Pressable>
      </DarkCard>
    </DarkScreen>
  );
}

export function EditProfileNewScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  return (
    <DarkScreen header="Edit Profile">
      <TitleBlock title="Edit Profile" body="Update your details and gaming identity." />
      <DarkCard row>
        <View style={styles.editAvatar}>
          <Text style={styles.editAvatarText}>MG</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Profile Avatar</Text>
          <Text style={styles.cardBody}>JPG, PNG or WEBP. Max 5MB.</Text>
          <Text style={styles.linkText}>Change Avatar</Text>
        </View>
      </DarkCard>
      <DarkCard>
        {['Display Name', 'Username', 'Bio', 'Country'].map((label) => (
          <View key={label} style={styles.darkInputRow}>
            <Ionicons name={label === 'Country' ? 'globe-outline' : 'person-outline'} color={muted} size={18} />
            <View style={styles.flex}>
              <Text style={styles.inputLabel}>{label}</Text>
              <TextInput
                defaultValue={label === 'Country' ? 'Kenya' : label === 'Bio' ? 'Competitive gamer. Always grinding.' : 'MechiGamer'}
                placeholderTextColor={muted}
                style={styles.darkInput}
              />
            </View>
          </View>
        ))}
      </DarkCard>
      <DarkCard>
        <Text style={styles.cardTitle}>Linked Gamer IDs</Text>
        {linkedGames.map((game) => (
          <View key={game.name} style={styles.linkedRow}>
            <Image source={imageSource(game.image)} style={styles.linkedImage} />
            <Text style={styles.flexTitle}>{game.name}</Text>
            <Text style={styles.rowBody}>{game.id}</Text>
            <Ionicons name="checkmark-circle-outline" color={teal} size={20} />
          </View>
        ))}
      </DarkCard>
      <Pressable
        onPress={() => {
          showToast({ title: 'Profile updated', tone: 'success' });
          router.back();
        }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryText}>Save Changes</Text>
      </Pressable>
    </DarkScreen>
  );
}

export function RegisterTournamentNewScreen() {
  const params = useLocalSearchParams<{ game?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [game, setGame] = useState<OnlineTournamentGameKey>(() => getGameFromParam(params.game));
  const [inGameUsername, setInGameUsername] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [youtubeName, setYoutubeName] = useState('');
  const [followedInstagram, setFollowedInstagram] = useState(true);
  const [subscribedYoutube, setSubscribedYoutube] = useState(true);
  const [available, setAvailable] = useState(true);
  const [payment, setPayment] = useState<WeekendCupRegistrationResponse | null>(null);
  const summaryQuery = useQuery({
    queryKey: ['tournament-registration'],
    queryFn: getTournamentRegistrationSummary,
  });
  const summary = summaryQuery.data ?? getFallbackTournamentSummary();
  const config = TOURNAMENT_GAMES.find((item) => item.game === game) ?? TOURNAMENT_GAMES[0]!;
  const existing = useMemo(
    () => summary.registrations.find((item) => item.game === game) ?? null,
    [game, summary.registrations]
  );
  const displayIgn = inGameUsername || existing?.in_game_username || getProfileIgn(user?.game_ids, game);
  const submittedReference = payment?.reference ?? existing?.payment_reference ?? null;
  const submittedStatus = payment?.status ?? existing?.payment_status ?? null;
  const canSubmit = displayIgn.trim().length >= 2 && available;

  const registerMutation = useMutation({
    mutationFn: () =>
      registerForTournament({
        game,
        in_game_username: displayIgn.trim(),
        followed_instagram: followedInstagram,
        instagram_username: instagramUsername.trim() || existing?.instagram_username || '',
        subscribed_youtube: subscribedYoutube,
        youtube_name: youtubeName.trim() || existing?.youtube_name || '',
        available_at_8pm: available,
        accepted_rules: true,
      }),
    onSuccess: async (response) => {
      setPayment(response);
      await queryClient.invalidateQueries({ queryKey: ['tournament-registration'] });
      await queryClient.invalidateQueries({ queryKey: ['tournament-state'] });
      if (response.authorization_url) {
        showToast({ title: 'Registration saved', body: 'Opening Paystack checkout.', tone: 'success' });
        await Linking.openURL(response.authorization_url);
      } else {
        showToast({ title: 'Slot confirmed', tone: 'success' });
        router.push('/(tabs)/arena');
      }
    },
    onError: (error) => {
      showToast({
        title: 'Registration failed',
        body: error instanceof ApiError ? error.message : 'Check your entry and try again.',
        tone: 'error',
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyWeekendCupPayment(submittedReference ?? ''),
    onSuccess: async (response) => {
      setPayment(response);
      await queryClient.invalidateQueries({ queryKey: ['tournament-registration'] });
      await queryClient.invalidateQueries({ queryKey: ['tournament-state'] });
      showToast({ title: 'Payment checked', body: response.status === 'paid' ? 'Your slot is locked.' : 'Still pending at Paystack.', tone: response.status === 'paid' ? 'success' : 'info' });
    },
    onError: (error) => {
      showToast({
        title: 'Payment not confirmed yet',
        body: error instanceof ApiError ? error.message : 'Try again after Paystack completes.',
        tone: 'warning',
      });
    },
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (
        state === 'active' &&
        submittedReference &&
        submittedStatus !== 'paid' &&
        !verifyMutation.isPending
      ) {
        verifyMutation.mutate();
      }
    });

    return () => subscription.remove();
  }, [submittedReference, submittedStatus, verifyMutation]);

  return (
    <MainDarkScreen>
      <Hero title={`Register\n${config.shortLabel}`} badge={submittedStatus ? formatStatus(submittedStatus) : 'Live'} image={gameImages[game] ?? images.hero} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail}>
        {TOURNAMENT_GAMES.map((item) => (
          <Pressable key={item.game} onPress={() => {
            setGame(item.game);
            setPayment(null);
          }}>
            <Text style={item.game === game ? styles.activeChip : styles.chip}>{item.shortLabel}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <DarkCard>
        <Text style={styles.cardTitle}>Entry details</Text>
        <FigmaInput value={inGameUsername} onChangeText={setInGameUsername} placeholder={existing?.in_game_username || getProfileIgn(user?.game_ids, game) || 'Exact IGN or ID'} />
        <FigmaInput value={instagramUsername} onChangeText={setInstagramUsername} placeholder={existing?.instagram_username || 'Instagram username'} />
        <FigmaInput value={youtubeName} onChangeText={setYoutubeName} placeholder={existing?.youtube_name || 'YouTube name or email'} />
        <ToggleLine label="I follow PlayMechi on Instagram" value={followedInstagram} onPress={() => setFollowedInstagram((value) => !value)} />
        <ToggleLine label="I subscribe to PlayMechi on YouTube" value={subscribedYoutube} onPress={() => setSubscribedYoutube((value) => !value)} />
        <ToggleLine label={`I am available ${config.dateLabel} at ${config.timeLabel}`} value={available} onPress={() => setAvailable((value) => !value)} />
      </DarkCard>
      <DarkCard>
        <Text style={styles.cardTitle}>Payment handoff</Text>
        <Text style={styles.cardBody}>{submittedReference ? `Reference: ${submittedReference}` : 'Paystack opens after your entry is saved.'}</Text>
        <InfoLine label="Status" value={submittedStatus ? formatStatus(submittedStatus) : 'Not submitted'} />
        <InfoLine label="Slots left" value={String(summary.games[game]?.spotsLeft ?? config.slots)} />
        <View style={styles.buttonStack}>
          <FigmaButton label={registerMutation.isPending ? 'Saving entry...' : submittedStatus === 'paid' ? 'Update entry' : 'Register and pay'} loading={registerMutation.isPending} disabled={!canSubmit} onPress={() => registerMutation.mutate()} />
          {submittedReference ? <FigmaButton label={verifyMutation.isPending ? 'Checking payment...' : 'Verify payment'} loading={verifyMutation.isPending} variant="dark" onPress={() => verifyMutation.mutate()} /> : null}
          <FigmaButton label="Tournament info" variant="ghost" icon="open-outline" onPress={() => void Linking.openURL(TOURNAMENT_PUBLIC_URL)} />
        </View>
      </DarkCard>
    </MainDarkScreen>
  );
}

export function TournamentDetailsNewScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'Overview' | 'Games' | 'Prizes' | 'Rules'>('Overview');

  return (
    <DarkScreen header="Tournament">
      <Hero title={'Weekend Cup\nSeason 1'} badge="Live on Mechi" image={images.hero} />
      <View style={styles.statCards}>
        <MiniDarkStat icon="trophy-outline" label="Prize Pool" value="KSh 7,500+" />
        <MiniDarkStat icon="game-controller-outline" label="Format" value="4 Games" />
        <MiniDarkStat icon="time-outline" label="Duration" value="3 Days" />
        <MiniDarkStat icon="people-outline" label="Players" value="256" />
      </View>
      <Segmented tabs={['Overview', 'Games', 'Prizes', 'Rules']} active={tab} onChange={(next) => setTab(next as typeof tab)} />
      <DarkCard>
        <Text style={styles.cardTitle}>{tab === 'Overview' ? 'About this Tournament' : tab}</Text>
        <Text style={styles.cardBody}>
          Weekend Cup Season 1 is a 3-day PlayMechi showdown across PUBG Mobile, CODM, Free Fire, and eFootball.
        </Text>
        {TOURNAMENT_GAMES.slice(0, tab === 'Games' ? TOURNAMENT_GAMES.length : 3).map((game) => (
          <View key={game.game} style={styles.infoRow}>
            <Text style={styles.rowBody}>{game.label}</Text>
            <Text style={styles.lightStrong}>{tab === 'Prizes' ? game.firstPrize : game.format}</Text>
          </View>
        ))}
      </DarkCard>
      <Pressable onPress={() => router.push('/(tabs)/register')} style={styles.primaryButton}>
        <Text style={styles.primaryText}>Register Now</Text>
        <Ionicons name="chevron-forward" color={darkBg} size={20} />
      </Pressable>
    </DarkScreen>
  );
}

export function TeamsNewScreen() {
  return (
    <DarkScreen header="Team Rankings">
      <FigmaInput placeholder="Search teams or players..." />
      <ChipRail items={['Global', 'Regional', 'Players']} />
      <SectionHeading title="Season 1 Standings" />
      <View style={styles.stack}>
        {teamRows.map((team) => (
          <DarkCard key={team.name} row>
            <Text style={styles.rankText}>{team.rank}</Text>
            <View style={styles.teamBadge}>
              <Text style={styles.teamBadgeText}>{team.abbrev}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{team.name}</Text>
              <Text style={styles.cardBody}>Win Rate: {team.winRate}</Text>
            </View>
            <Text style={styles.tealStrong}>{team.pts} PTS</Text>
          </DarkCard>
        ))}
      </View>
    </DarkScreen>
  );
}

export function SubmitProofNewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const stateQuery = useQuery({
    queryKey: ['tournament-state'],
    queryFn: getTournamentState,
    refetchInterval: 20_000,
  });
  const registrations = stateQuery.data?.myRegistrations ?? [];
  const firstRegistration = registrations[0] ?? null;
  const [game, setGame] = useState<OnlineTournamentGameKey>('pubgm');
  const [matchNumber, setMatchNumber] = useState(1);
  const [kills, setKills] = useState('');
  const [placement, setPlacement] = useState('');
  const [player1Score, setPlayer1Score] = useState('');
  const [player2Score, setPlayer2Score] = useState('');
  const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const currentRegistration =
    registrations.find((registration) => registration.game === game) ?? firstRegistration;
  const currentGame = currentRegistration?.game ?? game;
  const isEfootball = currentGame === 'efootball';

  useEffect(() => {
    if (firstRegistration && !registrations.some((registration) => registration.game === game)) {
      setGame(firstRegistration.game);
    }
  }, [firstRegistration, game, registrations]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.84,
    });

    if (!result.canceled && result.assets[0]) {
      setFile(result.assets[0]);
      showToast({ title: 'Proof selected', body: result.assets[0].fileName ?? 'Image ready', tone: 'success' });
    }
  }

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!file || !currentRegistration) {
        throw new Error('Register for Weekend Cup and select a screenshot first.');
      }

      if (isEfootball) {
        return submitTournamentResult({
          game: 'efootball',
          uri: file.uri,
          name: file.fileName ?? 'efootball-result.jpg',
          mimeType: file.mimeType ?? 'image/jpeg',
          player1_score: Number(player1Score),
          player2_score: Number(player2Score),
        });
      }

      return submitTournamentResult({
        game: currentGame as Extract<OnlineTournamentGameKey, 'pubgm' | 'codm' | 'freefire'>,
        uri: file.uri,
        name: file.fileName ?? `${currentGame}-result.jpg`,
        mimeType: file.mimeType ?? 'image/jpeg',
        match_number: matchNumber,
        kills: Number(kills),
        placement: Number(placement),
      });
    },
    onSuccess: async () => {
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ['tournament-state'] });
      showToast({ title: 'Proof submitted', body: 'Admins will review shortly.', tone: 'success' });
      router.push('/(tabs)/arena');
    },
    onError: (error) => {
      showToast({
        title: 'Proof upload failed',
        body: error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Check your match details.',
        tone: 'error',
      });
    },
  });

  function submit() {
    if (!file || submitMutation.isPending) return;
    submitMutation.mutate();
  }

  const battleRoyaleReady =
    !isEfootball &&
    kills.trim().length > 0 &&
    placement.trim().length > 0 &&
    Number.isInteger(Number(kills)) &&
    Number(kills) >= 0 &&
    Number.isInteger(Number(placement)) &&
    Number(placement) > 0;
  const efootballReady =
    isEfootball &&
    player1Score.trim().length > 0 &&
    player2Score.trim().length > 0 &&
    Number.isInteger(Number(player1Score)) &&
    Number(player1Score) >= 0 &&
    Number.isInteger(Number(player2Score)) &&
    Number(player2Score) >= 0;
  const canSubmit = Boolean(file && currentRegistration && (isEfootball ? efootballReady : battleRoyaleReady));

  return (
    <View style={styles.lightRoot}>
      <HeaderBar title="Submit Result Proof" />
      <ScrollView contentContainerStyle={styles.lightContent}>
        <Text style={styles.lightBody}>Upload clear screenshots showing all player scores. Blur or cropped images will be rejected.</Text>
        <LightField
          label="Registered Game"
          value={currentRegistration ? `${TOURNAMENT_GAMES.find((item) => item.game === currentGame)?.shortLabel ?? currentGame} | ${formatStatus(currentRegistration.payment_status)}` : 'Register first'}
          onPress={() => {
            const currentIndex = registrations.findIndex((registration) => registration.game === currentGame);
            const next = registrations[(currentIndex + 1) % Math.max(1, registrations.length)];
            if (next) setGame(next.game);
          }}
        />
        {!isEfootball ? (
          <>
            <LightField label="Match" value={`Match ${matchNumber}`} onPress={() => setMatchNumber((value) => (value >= 3 ? 1 : value + 1))} />
            <FigmaInput value={kills} onChangeText={setKills} placeholder="Kills" keyboardType="number-pad" />
            <FigmaInput value={placement} onChangeText={setPlacement} placeholder="Final placement" keyboardType="number-pad" />
          </>
        ) : (
          <>
            <FigmaInput value={player1Score} onChangeText={setPlayer1Score} placeholder="Your score" keyboardType="number-pad" />
            <FigmaInput value={player2Score} onChangeText={setPlayer2Score} placeholder="Opponent score" keyboardType="number-pad" />
          </>
        )}
        <Pressable onPress={pickImage} style={[styles.uploadBox, file && styles.uploadBoxSelected]}>
          {file ? (
            <>
              <Image source={imageSource(file.uri)} style={styles.previewImage} />
              <Text numberOfLines={1} style={styles.uploadTitle}>{file.fileName ?? 'Screenshot selected'}</Text>
              <Text style={styles.uploadMeta}>Tap to change</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" color={colors.muted} size={34} />
              <Text style={styles.uploadTitle}>Tap to upload image</Text>
              <Text style={styles.uploadMeta}>PNG, JPG up to 10MB</Text>
            </>
          )}
        </Pressable>
        {file ? (
          <Pressable onPress={() => setFile(null)} style={styles.removeButton}>
            <Ionicons name="trash-outline" color={colors.accent} size={16} />
            <Text style={styles.removeText}>Remove file</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.helper, canSubmit && styles.helperReady]}>
          {currentRegistration
            ? file
              ? 'Ready to submit to Weekend Cup moderators.'
              : 'Upload a screenshot to continue.'
            : 'Register and confirm payment before submitting proof.'}
        </Text>
        <FigmaButton label={submitMutation.isPending ? 'Uploading...' : 'Submit Proof'} loading={submitMutation.isPending} disabled={!canSubmit} onPress={submit} />
        <LightCard title="Recent Submissions">
          {(stateQuery.data?.mySubmissions ?? []).slice(0, 4).map((submission) => (
            <SubmissionRow
              key={submission.id}
              title={submission.match_number ? `Match ${submission.match_number}` : 'eFootball result'}
              status={formatStatus(submission.status)}
              rejected={submission.status === 'rejected'}
            />
          ))}
          {stateQuery.data?.mySubmissions?.length ? null : (
            <SubmissionRow title="No proof yet" status="Waiting" />
          )}
        </LightCard>
      </ScrollView>
    </View>
  );
}

export function NotificationsNewScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'All' | 'Tournaments' | 'Matches' | 'System'>('All');
  const rows = notificationRows.filter((row) => tab === 'All' || row.cat === tab);

  return (
    <DarkScreen header="Notifications">
      <TitleBlock title="Notifications" body="Stay updated with your tournaments, matches and more." />
      <Segmented tabs={['All', 'Tournaments', 'Matches', 'System']} active={tab} onChange={(next) => setTab(next as typeof tab)} />
      <View style={styles.stack}>
        {rows.map((row) => (
          <DarkCard key={row.title} row>
            <Ionicons name={row.icon} color={teal} size={26} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{row.title}</Text>
              <Text style={styles.cardBody}>{row.desc}</Text>
            </View>
            <Text style={styles.rowBody}>{row.time}</Text>
          </DarkCard>
        ))}
      </View>
      <Pressable onPress={() => router.push('/notifications/settings')} style={styles.outlineButton}>
        <Text style={styles.outlineButtonText}>Alert Settings</Text>
      </Pressable>
    </DarkScreen>
  );
}

export function NotificationSettingsNewScreen() {
  const [pushOn, setPushOn] = useState(false);
  const [whatsappOn, setWhatsappOn] = useState(false);
  const [categories, setCategories] = useState(['match', 'checkin', 'room', 'proof', 'support']);
  const { showToast } = useToast();

  return (
    <View style={styles.lightRoot}>
      <HeaderBar title="Alert settings" />
      <ScrollView contentContainerStyle={styles.lightContent}>
        <View style={styles.statusCard}>
          <Ionicons name={pushOn ? 'checkmark-circle-outline' : 'notifications-outline'} color={pushOn ? colors.primaryDark : colors.warning} size={26} />
          <View style={styles.flex}>
            <Text style={styles.lightTitle}>{pushOn ? 'Push alerts on' : 'Ready to enable push alerts'}</Text>
            <Text style={styles.lightBody}>Get room releases, check-ins, and proof reviews.</Text>
          </View>
        </View>
        <LightCard title="Delivery">
          <SwitchLine label="Push alerts" value={pushOn} onValueChange={(value) => {
            setPushOn(value);
            showToast({ title: value ? 'Push alerts enabled' : 'Push alerts disabled', tone: value ? 'success' : 'info' });
          }} />
          <SwitchLine label="WhatsApp alerts" value={whatsappOn} onValueChange={setWhatsappOn} />
        </LightCard>
        <LightCard title="Alert categories">
          {([
            ['match', 'Match operations'],
            ['checkin', 'Check-in reminders'],
            ['room', 'Room credentials'],
            ['proof', 'Proof review'],
            ['support', 'Support replies'],
          ] as Array<[string, string]>).map(([id, label]) => (
            <SwitchLine
              key={id}
              label={label}
              value={categories.includes(id)}
              onValueChange={(value) =>
                setCategories((prev) => value ? [...prev, id] : prev.filter((item) => item !== id))
              }
            />
          ))}
        </LightCard>
      </ScrollView>
    </View>
  );
}

export function NotificationPermissionNewScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function enablePush() {
    setLoading(true);
    try {
      const result = await registerForPushNotificationsAsync();
      if (result.ok) {
        showToast({ title: 'Push alerts enabled', body: result.message, tone: 'success' });
        router.push('/notifications');
      } else {
        showToast({ title: 'Push alerts not enabled', body: result.message, tone: 'warning' });
        setBlocked(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.lightRoot}>
      <HeaderBar title="Push alerts" />
      <ScrollView contentContainerStyle={styles.permissionContent}>
        <View style={[styles.permissionIcon, blocked && styles.permissionIconBlocked]}>
          <Ionicons name={blocked ? 'shield-outline' : 'notifications-outline'} color={blocked ? colors.accent : colors.primaryDark} size={34} />
        </View>
        <Text style={styles.permissionTitle}>{blocked ? 'Push alerts are blocked' : 'Stay ready for match day'}</Text>
        <Text style={styles.permissionBody}>
          {blocked
            ? 'Android settings are preventing PlayMechi alerts. Open settings and allow notifications.'
            : 'Get room releases, check-in reminders, proof review, and support replies before you miss a slot.'}
        </Text>
        <View style={styles.previewNotice}>
          <BrandLogo compact />
          <Text style={styles.previewNoticeTitle}>Room is live</Text>
          <Text style={styles.cardBody}>Lobby credentials are ready. Match starts at 8:00 PM.</Text>
        </View>
        <FigmaButton label={blocked ? 'Open Android settings' : loading ? 'Enabling...' : 'Enable push alerts'} loading={loading} onPress={blocked ? () => void Linking.openSettings() : enablePush} />
        <FigmaButton label="Not now" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

export function LegalSupportNewScreen() {
  return (
    <DarkScreen header="Support">
      <TitleBlock title="Help & Support" body="We're here to help you, Gamer!" />
      <DarkCard>
        <Text style={styles.cardTitle}>FAQs</Text>
        {supportFaqs.map((faq) => (
          <View key={faq} style={styles.infoRow}>
            <Text style={styles.lightText}>{faq}</Text>
            <Ionicons name="chevron-forward" color={muted} size={18} />
          </View>
        ))}
      </DarkCard>
      <SectionHeading title="Need More Help?" />
      <View style={styles.stack}>
        <DarkRow icon="mail-outline" title="Contact Support" body="Our team typically replies within 24 hours." />
        <DarkRow icon="logo-whatsapp" title="WhatsApp / Chat Support" body="Chat with support instantly." onPress={() => void Linking.openURL(PLAYMECHI_SUPPORT_URL)} />
        <DarkRow icon="warning-outline" title="Report a Problem" body="Report bugs, technical issues, or match problems." danger />
        <DarkRow icon="shield-checkmark-outline" title="Tournament Dispute Help" body="Need help with a match or tournament dispute?" />
      </View>
    </DarkScreen>
  );
}

function MainDarkScreen({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.darkRoot}>
      <TopBar mode="dark" />
      <ScrollView contentContainerStyle={styles.darkContent}>{children}</ScrollView>
    </View>
  );
}

function AuthDarkScreen({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.darkRoot}>
      <ScrollView contentContainerStyle={styles.authContent}>{children}</ScrollView>
    </View>
  );
}

function BrandLogo({ compact }: { compact?: boolean }) {
  return (
    <Image
      source={require('../../assets/brand-wordmark.png')}
      resizeMode="contain"
      style={compact ? styles.brandLogoCompact : styles.brandLogo}
    />
  );
}

function DarkField({
  icon,
  label,
  right,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.darkField}>
      <Ionicons name={icon} color={muted} size={20} />
      <View style={styles.flex}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          placeholderTextColor={muted}
          style={styles.darkInput}
          autoCapitalize="none"
          {...props}
        />
      </View>
      {right}
    </View>
  );
}

function LightCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.lightCard}>
      <Text style={styles.lightTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LightField({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.lightField}>
      <View style={styles.flex}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Text style={styles.lightFieldValue}>{value}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-down" color={colors.faint} size={20} /> : null}
    </Pressable>
  );
}

function MiniDarkStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.miniDarkStat}>
      <Ionicons name={icon} color="#f6bd3c" size={22} />
      <Text style={styles.miniDarkLabel}>{label}</Text>
      <Text style={styles.miniDarkValue}>{value}</Text>
    </View>
  );
}

function ToggleLine({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.toggleLine}>
      <Ionicons name={value ? 'checkmark-circle' : 'ellipse-outline'} color={value ? teal : muted} size={21} />
      <Text style={styles.lightText}>{label}</Text>
    </Pressable>
  );
}

function SwitchLine({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchLine}>
      <Text style={styles.lightFieldValue}>{label}</Text>
      <NativeSwitch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowBody}>{label}</Text>
      <Text style={styles.lightStrong}>{value}</Text>
    </View>
  );
}

function SubmissionRow({ title, status, rejected }: { title: string; status: string; rejected?: boolean }) {
  return (
    <View style={styles.submissionRow}>
      <Ionicons name="image-outline" color={colors.muted} size={21} />
      <Text style={styles.lightFieldValue}>{title}</Text>
      <Text style={[styles.submissionStatusText, rejected && styles.submissionRejected]}>{status}</Text>
    </View>
  );
}

function getProfileIgn(gameIds: Record<string, string> | undefined, game: OnlineTournamentGameKey) {
  return gameIds?.[`${game}:mobile`] ?? gameIds?.[`${game}_mobile`] ?? gameIds?.[game] ?? '';
}

function DarkScreen({
  children,
  header,
}: {
  children: React.ReactNode;
  header?: string;
}) {
  return (
    <View style={styles.darkRoot}>
      {header ? <HeaderBar title={header} dark /> : null}
      <ScrollView contentContainerStyle={styles.darkContent}>{children}</ScrollView>
    </View>
  );
}

function TitleBlock({ title, body, italic }: { title: string; body: string; italic?: boolean }) {
  return (
    <View>
      <Text style={[styles.screenTitle, italic && styles.italicTitle]}>{title}</Text>
      <Text style={styles.screenBody}>{body}</Text>
    </View>
  );
}

function DarkCard({
  children,
  row,
}: {
  children: React.ReactNode;
  row?: boolean;
}) {
  return <View style={[styles.darkCard, row && styles.rowCard]}>{children}</View>;
}

function DarkRow({
  icon,
  title,
  body,
  right,
  control,
  dashed,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  right?: string;
  control?: React.ReactNode;
  dashed?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.darkRow, dashed && styles.dashedRow]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} color={danger ? coral : teal} size={22} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, danger && styles.coralText]}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      {control ?? (right ? <Text style={styles.tealStrong}>{right}</Text> : <Ionicons name="chevron-forward" color={muted} size={18} />)}
    </Pressable>
  );
}

function SectionHeading({ title, coral: isCoral }: { title: string; coral?: boolean }) {
  return <Text style={[styles.sectionHeaderText, isCoral && styles.coralText]}>{title}</Text>;
}

function Hero({ title, badge, image }: { title: string; badge: string; image: string }) {
  return (
    <ImageBackground source={imageSource(image)} imageStyle={styles.heroImage} style={styles.hero}>
      <View style={styles.heroWash} />
      <View style={styles.heroContent}>
        <StatusPill label={badge} coral />
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroBody}>Ends in 2d 14h 29m</Text>
      </View>
    </ImageBackground>
  );
}

function StatusPill({ label, coral: isCoral }: { label: string; coral?: boolean }) {
  return (
    <View style={[styles.statusPill, { borderColor: isCoral ? coral : teal }]}>
      <View style={[styles.statusDot, { backgroundColor: isCoral ? coral : teal }]} />
      <Text style={[styles.statusText, { color: isCoral ? coral : teal }]}>{label}</Text>
    </View>
  );
}

function Progress({ pct, coral: isCoral }: { pct: number; coral?: boolean }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isCoral ? coral : teal }]} />
    </View>
  );
}

function Segmented({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {tabs.map((tab) => (
        <Pressable key={tab} onPress={() => onChange(tab)} style={styles.segmentTab}>
          <Text style={[styles.segmentText, active === tab && styles.segmentTextActive]}>{tab}</Text>
          {active === tab ? <View style={styles.segmentLine} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

function ChipRail({ items }: { items: string[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail}>
      {items.map((item, index) => (
        <Text key={item} style={index === 0 ? styles.activeChip : styles.chip}>{item}</Text>
      ))}
    </ScrollView>
  );
}

function RewardCard({ icon, title, value }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string }) {
  return (
    <DarkCard>
      <Ionicons name={icon} color="#f6bd3c" size={28} />
      <Text style={styles.rowBody}>{title}</Text>
      <Text style={styles.rewardValue}>{value}</Text>
    </DarkCard>
  );
}

function ResultCard(props: (typeof results)[number]) {
  return (
    <View style={styles.resultCard}>
      <Image source={imageSource(props.image)} style={styles.resultImage} />
      <View style={styles.flex}>
        <StatusPill label="Completed" />
        <Text style={styles.rowTitle}>{props.game}</Text>
        <Text style={styles.rowBody}>{props.sub}</Text>
        <View style={styles.resultStats}>
          <Text style={styles.tealStrong}>{props.rank}</Text>
          <Text style={styles.tealStrong}>{props.score}</Text>
          <Text style={styles.tealStrong}>{props.kills}</Text>
        </View>
        <Text style={styles.linkText}>View Full Results</Text>
      </View>
    </View>
  );
}

const onboardingSteps = [
  {
    title: 'Discover Tournaments',
    body: 'Browse PUBG Mobile, CODM, Free Fire, and eFootball competitions in one place.',
    captionTitle: 'Tournament cards',
    caption: 'Game filters, prize pools, and event status.',
    image: images.codm,
  },
  {
    title: 'Register in Seconds',
    body: 'Choose your tournament, pay to lock your slot, and join the action fast.',
    captionTitle: 'Secure slot lock',
    caption: 'Entry fees, schedule, and checkout guidance.',
    image: images.hero,
  },
  {
    title: 'Check In & Stay Ready',
    body: 'Get reminders before match time and receive room details instantly.',
    captionTitle: 'Match desk',
    caption: 'Countdowns, room ID, password, and alerts.',
    image: images.pubg,
  },
  {
    title: 'Track Results & Updates',
    body: 'Follow standings, match results, and official PlayMechi news.',
    captionTitle: 'Results hub',
    caption: 'Standings, recaps, news, and guides.',
    image: images.freefire,
  },
];

type ChallengeItem = {
  title: string;
  body: string;
  value: string;
  action: string;
  pct: number;
  done?: boolean;
};

const dailyChallenges: ChallengeItem[] = [
  { title: 'Join 1 tournament', body: 'Participate in any tournament', value: '1/1', action: 'Claimed', pct: 100, done: true },
  { title: 'Win 3 matches', body: 'Win any 3 matches in any mode', value: '2/3', action: 'Go', pct: 65 },
  { title: 'Check in on time', body: 'Check in to a tournament on time', value: '1/1', action: 'Claimed', pct: 100, done: true },
  { title: 'Read 2 posts', body: 'Read any 2 official updates', value: '1/2', action: 'Go', pct: 50 },
];

const eventChallenges: ChallengeItem[] = [
  { title: 'Weekend Cup Participation', body: 'Play 5 matches in Season 1', value: '2,000 XP', action: 'Go', pct: 60 },
];

const objectives = [
  { label: 'Play 10 Matches', value: '7 / 10', pct: 70 },
  { label: 'Win 5 Matches', value: '5 / 5', pct: 100, red: true },
  { label: 'Deal 5,000 Damage', value: '3,250 / 5,000', pct: 65 },
];

const players = [
  { rank: '1', name: 'MechiGamer', score: '12,480', winrate: '82.6%' },
  { rank: '2', name: 'ShadowStrike', score: '9,250', winrate: '78.3%' },
  { rank: '3', name: 'NovaFusion', score: '8,760', winrate: '74.1%' },
  { rank: '4', name: 'KillSwitch', score: '7,540', winrate: '71.2%' },
  { rank: '5', name: 'GhostX', score: '6,980', winrate: '69.8%' },
  { rank: '21', name: 'MechiGamer (You)', score: '3,650', winrate: '55.6%', you: true },
];

const results = [
  { game: 'Weekend Cup Season 1', sub: 'Erangel | Squad TPP', rank: '#2', score: '10,250', kills: '18 Kills', image: images.pubg },
  { game: 'CODM Masters Series', sub: 'Search & Destroy | Crossfire', rank: '#1', score: '12,480', kills: '22 Kills', image: images.codm },
  { game: 'Free Fire Pro League', sub: 'Bermuda | Squad', rank: '#3', score: '8,760', kills: '15 Kills', image: images.freefire },
  { game: 'eFootball Championship', sub: 'Stadium | 1v1', rank: '#4', score: '6,320', kills: '9 Goals', image: images.efootball },
];

const matches = [
  { result: 'WON', tournament: 'Weekend Cup Season 1', game: 'Call of Duty: Mobile', score: '12 - 8', image: images.codm },
  { result: 'LOST', tournament: 'PUBG Solo Showdown', game: 'PUBG Mobile', score: '4 - 9', image: images.pubg },
  { result: 'ELIMINATED', tournament: 'Free Fire Clash Squad Cup', game: 'Free Fire', score: '1 - 3', image: images.freefire },
  { result: 'WON', tournament: 'eFootball League', game: 'eFootball', score: '3 - 2', image: images.efootball },
];

const paymentMethods = [
  { name: 'M-Pesa', detail: '+254 712 345 678', icon: 'phone-portrait-outline' as const, default: true },
  { name: 'Paystack Card', detail: '**** **** **** 4242 VISA', icon: 'card-outline' as const },
  { name: 'Equity Bank', detail: '**** **** **** 5689', icon: 'business-outline' as const },
];

const gameDetails: Record<string, { title: string; body: string; image: ImageSourcePropType; info: [string, string][] }> = {
  codm: {
    title: 'Call of Duty: Mobile',
    body: 'Fast-paced FPS combat with ranked and battle royale tournaments.',
    image: images.codm,
    info: [['Genre', 'FPS'], ['Mode', 'Multiplayer, Battle Royale'], ['Developer', 'Activision'], ['Size', '2.4 GB'], ['Rating', '4.3 stars']],
  },
  pubg: {
    title: 'PUBG Mobile',
    body: 'Classic battle royale combat with squad-based tournaments.',
    image: images.pubg,
    info: [['Genre', 'Battle Royale'], ['Mode', 'Solo, Duo, Squad'], ['Developer', 'Tencent'], ['Size', '2.1 GB'], ['Rating', '4.2 stars']],
  },
  pubgm: {
    title: 'PUBG Mobile',
    body: 'Classic battle royale combat with squad-based tournaments.',
    image: images.pubg,
    info: [['Genre', 'Battle Royale'], ['Mode', 'Solo, Duo, Squad'], ['Developer', 'Tencent'], ['Size', '2.1 GB'], ['Rating', '4.2 stars']],
  },
  ff: {
    title: 'Free Fire',
    body: 'Quick battle royale matches with intense action.',
    image: images.freefire,
    info: [['Genre', 'Battle Royale'], ['Mode', '50-player BR'], ['Developer', 'Garena'], ['Size', '900 MB'], ['Rating', '4.1 stars']],
  },
  freefire: {
    title: 'Free Fire',
    body: 'Quick battle royale matches with intense action.',
    image: images.freefire,
    info: [['Genre', 'Battle Royale'], ['Mode', '50-player BR'], ['Developer', 'Garena'], ['Size', '900 MB'], ['Rating', '4.1 stars']],
  },
  efootball: {
    title: 'eFootball',
    body: 'Realistic football competition with 1v1 brackets.',
    image: images.efootball,
    info: [['Genre', 'Sports'], ['Mode', '1v1'], ['Developer', 'Konami'], ['Size', '1.6 GB'], ['Rating', '4.0 stars']],
  },
};

const articleSections = [
  { title: 'Call of Duty: Mobile', body: 'Mode: Battle Royale | Map: Isolated', image: images.codm },
  { title: 'Free Fire', body: 'Mode: Battle Royale | Maps: Bermuda, Solara', image: images.freefire },
  { title: 'PUBG Mobile', body: 'Mode: Battle Royale | Maps: Rondo, Erangel, Miramar', image: images.pubg },
  { title: 'eFootball', body: 'Mode: 1v1 | Format: One-leg knockout', image: images.efootball },
];

const linkedGames = [
  { name: 'PUBG Mobile', id: 'MechiGamerYT', image: images.pubg },
  { name: 'Call of Duty Mobile', id: 'MechiCODM', image: images.codm },
  { name: 'Free Fire', id: 'MechiFF', image: images.freefire },
  { name: 'eFootball', id: 'MechiEFO', image: images.efootball },
];

const teamRows = [
  { rank: 1, name: 'Team Liquid', abbrev: 'TL', winRate: '79%', pts: '2,450' },
  { rank: 2, name: 'Fnatic', abbrev: 'FNC', winRate: '74%', pts: '2,100' },
  { rank: 3, name: 'G2 Esports', abbrev: 'G2', winRate: '69%', pts: '1,850' },
  { rank: 4, name: 'Sentinels', abbrev: 'SEN', winRate: '63%', pts: '1,620' },
  { rank: 5, name: 'Cloud9', abbrev: 'C9', winRate: '67%', pts: '1,590' },
];

const notificationRows: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  time: string;
  cat: 'Tournaments' | 'Matches' | 'System';
}> = [
  { icon: 'calendar-outline', title: 'Check-in is now open', desc: 'Weekend Cup check-in is open. Confirm your slot before it closes.', time: '2m ago', cat: 'Tournaments' },
  { icon: 'card-outline', title: 'Payment Confirmed', desc: 'Your Weekend Cup payment was successful.', time: '15m ago', cat: 'System' },
  { icon: 'trophy-outline', title: 'Tournament Starts Soon', desc: 'Weekend Cup Season 1 starts soon. Get ready and good luck.', time: '1h ago', cat: 'Tournaments' },
  { icon: 'game-controller-outline', title: 'Match Results Posted', desc: 'Your match results are now available.', time: '3h ago', cat: 'Matches' },
  { icon: 'notifications-outline', title: 'Match Reminder', desc: "You have a match tomorrow at 8:00 PM EAT. Don't forget to check in.", time: 'Yesterday', cat: 'Matches' },
];

const supportFaqs = [
  'How do I join a tournament?',
  'How do I check my match schedule?',
  'When and how will I receive my winnings?',
  'What should I do if I face an issue in a match?',
];

const styles = StyleSheet.create({
  darkRoot: { flex: 1, backgroundColor: darkBg },
  darkContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  authContent: { minHeight: 760, paddingHorizontal: spacing.xl, paddingTop: 64, paddingBottom: 42, gap: spacing.md, alignItems: 'stretch' },
  lightRoot: { flex: 1, backgroundColor: colors.bg },
  lightContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1 },
  teal: { color: teal },
  tealStrong: { color: teal, fontSize: 13, fontWeight: '900' },
  coralText: { color: coral },
  mutedText: { color: muted, fontSize: 12, fontWeight: '700' },
  lightText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  lightStrong: { color: colors.white, fontSize: 14, fontWeight: '900' },
  brandLogo: { width: 150, height: 36, alignSelf: 'center', marginBottom: spacing.xl },
  brandLogoCompact: { width: 112, height: 28 },
  authIntro: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  alignEnd: { alignSelf: 'flex-end', minHeight: 38, justifyContent: 'center' },
  centerLink: { alignSelf: 'center', minHeight: 42, justifyContent: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.sm },
  divider: { flex: 1, height: 1, backgroundColor: line },
  socialButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: line, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  socialMark: { width: 28, color: colors.white, fontSize: 22, fontWeight: '900' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  darkField: { minHeight: 58, borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: '#07101a', paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gameTileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gameTile: { width: '23.5%', minHeight: 138, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: line, backgroundColor: darkCard },
  gameTileImage: { width: '100%', height: 108 },
  gameTileText: { color: '#e6e8ec', textAlign: 'center', fontSize: 10, fontWeight: '800', paddingHorizontal: 3, paddingVertical: 6 },
  tournamentRow: { minHeight: 86, borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, overflow: 'hidden', flexDirection: 'row', alignItems: 'stretch' },
  tournamentImage: { width: 92, minHeight: 86 },
  tournamentPrize: { width: 84, alignItems: 'center', justifyContent: 'center', gap: 3, paddingRight: spacing.sm },
  arenaCard: { borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  arenaImage: { width: 118, height: 118, borderRadius: radii.md },
  arenaTitle: { color: colors.white, fontSize: 18, lineHeight: 20, fontWeight: '900', textTransform: 'uppercase' },
  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  matchHero: { minHeight: 310, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: line },
  profileCard: { borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  statCards: { flexDirection: 'row', gap: spacing.sm },
  miniDarkStat: { flex: 1, minHeight: 80, borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 3 },
  miniDarkLabel: { color: muted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  miniDarkValue: { color: teal, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  goPillText: { color: teal, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  teamBadge: { width: 42, height: 42, borderRadius: radii.md, borderWidth: 1, borderColor: line, backgroundColor: darkBg, alignItems: 'center', justifyContent: 'center' },
  teamBadgeText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  buttonStack: { gap: spacing.sm },
  toggleLine: { minHeight: 42, borderRadius: radii.sm, borderWidth: 1, borderColor: line, backgroundColor: '#07101a', paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lightCard: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: spacing.lg, gap: spacing.md },
  lightTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  lightBody: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  lightField: { minHeight: 52, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lightFieldValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  statusCard: { borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(50,224,196,0.24)', backgroundColor: colors.successSoft, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLine: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  permissionContent: { padding: spacing.xl, paddingBottom: spacing.xxl, alignItems: 'center', gap: spacing.lg },
  permissionIcon: { width: 68, height: 68, borderRadius: 999, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  permissionIconBlocked: { backgroundColor: colors.dangerSoft },
  permissionTitle: { color: colors.text, fontSize: 22, lineHeight: 27, textAlign: 'center', fontWeight: '900' },
  permissionBody: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '700' },
  previewNotice: { alignSelf: 'stretch', borderRadius: radii.md, borderWidth: 1, borderColor: line, backgroundColor: darkBg, padding: spacing.lg, gap: spacing.sm },
  previewNoticeTitle: { color: colors.white, fontSize: 15, fontWeight: '900' },
  uploadBox: { minHeight: 168, borderRadius: radii.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  uploadBoxSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceNeutral },
  previewImage: { width: 112, height: 84, borderRadius: radii.sm, backgroundColor: colors.slate },
  uploadTitle: { color: colors.text, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  uploadMeta: { color: colors.faint, fontSize: 12, fontWeight: '700' },
  removeButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  removeText: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  helper: { color: colors.faint, fontSize: 12, fontWeight: '800' },
  helperReady: { color: colors.primaryDark },
  submissionRow: { minHeight: 48, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  submissionStatusText: { marginLeft: 'auto', color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
  submissionRejected: { color: colors.accent },
  disabled: { opacity: 0.55 },
  splash: { alignItems: 'center', gap: spacing.lg, paddingTop: 52 },
  logoPlate: { width: 92, height: 92, borderRadius: 22, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 78, height: 78 },
  splashTitle: { color: colors.white, fontSize: 36, lineHeight: 42, textAlign: 'center', fontWeight: '900', textTransform: 'uppercase' },
  splashBody: { color: muted, fontSize: 18, fontWeight: '800' },
  splashImage: { width: '100%', height: 230, borderRadius: 14, opacity: 0.86 },
  primaryButton: { minHeight: 54, borderRadius: radii.md, backgroundColor: teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  primaryText: { color: darkBg, fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  ghostLink: { minHeight: 44, justifyContent: 'center' },
  ghostLinkText: { color: teal, fontSize: 14, fontWeight: '900' },
  onboarding: { minHeight: 760, alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xl },
  onboardingTitle: { color: colors.white, fontSize: 34, lineHeight: 40, textAlign: 'center', fontWeight: '900' },
  onboardingBody: { color: muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  phoneFrame: { width: 280, borderRadius: 28, borderWidth: 8, borderColor: '#222b35', overflow: 'hidden', backgroundColor: '#09131f' },
  phoneImage: { width: '100%', height: 180 },
  phoneCopy: { padding: spacing.lg, gap: 3 },
  phoneTitle: { color: colors.white, fontSize: 16, fontWeight: '900' },
  phoneBody: { color: muted, fontSize: 13, lineHeight: 18 },
  stepText: { color: teal, fontSize: 14, fontWeight: '900' },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: '#626b78' },
  dotActive: { backgroundColor: teal },
  onboardingActions: { marginTop: 'auto', alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secondaryText: { color: muted, fontSize: 16, fontWeight: '800' },
  coralButton: { minHeight: 52, minWidth: 150, borderRadius: radii.md, backgroundColor: coral, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  coralButtonText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  screenTitle: { color: colors.white, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  italicTitle: { textTransform: 'uppercase' },
  screenBody: { color: muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  xpCard: { borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  mutedCaps: { color: muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  bigValue: { color: colors.white, fontSize: 28, fontWeight: '900' },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: spacing.sm },
  progressFill: { height: '100%', borderRadius: 999 },
  segmented: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: line },
  segmentTab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: muted, fontSize: 14, fontWeight: '900' },
  segmentTextActive: { color: teal },
  segmentLine: { position: 'absolute', bottom: -1, height: 2, left: 12, right: 12, backgroundColor: teal },
  stack: { gap: spacing.md },
  challengeRow: { borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  rowTitle: { color: colors.white, fontSize: 14, fontWeight: '900' },
  rowBody: { color: muted, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  rowMeta: { color: muted, fontSize: 12, fontWeight: '900' },
  claimedPill: { overflow: 'hidden', color: muted, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  goPill: { overflow: 'hidden', color: teal, borderWidth: 1, borderColor: teal, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: 6, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  outlineButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(50,224,196,0.4)', backgroundColor: 'rgba(50,224,196,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  outlineButtonText: { color: teal, fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  hero: { minHeight: 190, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: line },
  heroImage: { borderRadius: 12 },
  heroWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,9,16,0.62)' },
  heroContent: { padding: spacing.lg, gap: spacing.md, justifyContent: 'center', flex: 1 },
  heroTitle: { color: colors.white, fontSize: 40, lineHeight: 44, fontWeight: '900', textTransform: 'uppercase' },
  heroBody: { color: '#dfe5ee', fontSize: 13, fontWeight: '800' },
  statusPill: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusDot: { width: 6, height: 6, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  darkCard: { borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, padding: spacing.lg, gap: spacing.md },
  rowCard: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '900' },
  cardBody: { color: muted, fontSize: 13, lineHeight: 19 },
  objective: { borderTopWidth: 1, borderTopColor: line, paddingTop: spacing.md },
  split: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  rewardValue: { color: teal, fontSize: 22, fontWeight: '900' },
  chipRail: { gap: spacing.sm },
  activeChip: { overflow: 'hidden', borderRadius: 999, backgroundColor: teal, color: darkBg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, fontSize: 12, fontWeight: '900' },
  chip: { overflow: 'hidden', borderRadius: 999, borderWidth: 1, borderColor: line, backgroundColor: darkCard, color: '#d3dae5', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, fontSize: 12, fontWeight: '900' },
  bannerImage: { width: '100%', height: 120, borderRadius: 12 },
  table: { borderRadius: 12, borderWidth: 1, borderColor: line, overflow: 'hidden', backgroundColor: darkCard },
  tableRow: { minHeight: 50, borderBottomWidth: 1, borderBottomColor: line, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  youRow: { backgroundColor: 'rgba(50,224,196,0.1)' },
  rankText: { width: 30, color: colors.white, fontSize: 15, fontWeight: '900' },
  tableName: { flex: 1, color: colors.white, fontSize: 14, fontWeight: '800' },
  tableScore: { width: 74, color: teal, textAlign: 'right', fontSize: 13, fontWeight: '900' },
  tableMeta: { width: 54, color: '#cbd5e1', textAlign: 'right', fontSize: 12, fontWeight: '700' },
  resultCard: { borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, overflow: 'hidden', flexDirection: 'row' },
  resultImage: { width: 108, minHeight: 142 },
  resultStats: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm },
  matchRow: { borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  matchImage: { width: 74, height: 74, borderRadius: radii.md },
  scoreText: { color: teal, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  linkText: { color: teal, fontSize: 12, fontWeight: '900' },
  sectionHeaderText: { color: teal, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  darkRow: { borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  dashedRow: { borderStyle: 'dashed', backgroundColor: 'rgba(14,24,36,0.6)' },
  rowIcon: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: 'rgba(50,224,196,0.08)', alignItems: 'center', justifyContent: 'center' },
  infoPanel: { borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: darkCard, overflow: 'hidden' },
  infoRow: { minHeight: 52, borderBottomWidth: 1, borderBottomColor: line, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailImage: { width: '100%', height: 174, borderRadius: 12 },
  articleText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  articleRow: { borderBottomWidth: 1, borderBottomColor: line, paddingVertical: spacing.md, flexDirection: 'row', gap: spacing.md },
  articleThumb: { width: 52, height: 52, borderRadius: radii.md },
  articleTitle: { color: teal, fontSize: 14, fontWeight: '900' },
  smallTealButton: { minHeight: 40, borderRadius: radii.md, backgroundColor: teal, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  smallTealText: { color: darkBg, fontSize: 12, fontWeight: '900' },
  editAvatar: { width: 94, height: 94, borderRadius: 999, borderWidth: 2, borderColor: teal, backgroundColor: 'rgba(50,224,196,0.2)', alignItems: 'center', justifyContent: 'center' },
  editAvatarText: { color: colors.white, fontSize: 24, fontWeight: '900' },
  darkInputRow: { borderRadius: radii.md, borderWidth: 1, borderColor: line, backgroundColor: '#07101a', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  inputLabel: { color: muted, fontSize: 11, fontWeight: '800' },
  darkInput: { color: colors.white, fontSize: 14, fontWeight: '800', minHeight: 30, paddingVertical: 0 },
  linkedRow: { borderTopWidth: 1, borderTopColor: line, paddingTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkedImage: { width: 38, height: 38, borderRadius: radii.md },
  flexTitle: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '900' },
});
