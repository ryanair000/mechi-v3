import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { patchProfile } from '../api/mechi';
import { useAuth } from '../auth/AuthProvider';
import { buildGameSetup, COUNTRIES } from '../config/games';
import { registerForPushNotificationsAsync } from '../lib/push-notifications';
import { Card, Field, PrimaryButton, Screen, SplashSurface, StatusPill, p, useToast } from '../ui/production-ui';
import type { CountryKey, OnlineTournamentGameKey } from '../types';

async function requestNotificationPermission(toast: ReturnType<typeof useToast>) {
  const token = await registerForPushNotificationsAsync();
  toast.showToast({
    title: token ? 'Notifications ready' : 'Enable notifications',
    body: token ? 'Match alerts, room releases, and proof updates can reach this phone.' : 'Use phone settings or Alert settings to allow PlayMechi notifications.',
    tone: token ? 'success' : 'warning',
  });
}

export function SplashScreen() {
  const router = useRouter();
  return <SplashSurface onStart={() => router.push('/(auth)/register')} onLogin={() => router.push('/(auth)/login')} />;
}

export function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const toast = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!identifier || !password) {
      toast.showToast({ title: 'Add your login details', body: 'Email, phone, or username and password are required.', tone: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await signIn({ identifier: identifier.trim(), password, login_method: 'auto' });
      await requestNotificationPermission(toast);
      router.replace('/(tabs)');
    } catch (error) {
      toast.showToast({ title: 'Login failed', body: error instanceof Error ? error.message : 'Try again.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="Welcome back"
      subtitle="Use your email, phone number, or Mechi username."
      breadcrumbs={[{ label: 'PlayMechi', href: '/splash' }, { label: 'Login' }]}
      bottomInset={32}
    >
      <Field icon="person-outline" label="Email, phone, or username" placeholder="you@example.com, +254..., or mechi" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
      <Field icon="lock-closed-outline" label="Password" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <PrimaryButton label={loading ? 'Logging in...' : 'Login'} icon="arrow-forward" onPress={submit} disabled={loading} />
      <Pressable onPress={() => router.push('/(auth)/register')} style={{ alignItems: 'center', padding: 10 }}>
        <Text style={{ color: p.teal, fontSize: 13, fontWeight: '800' }}>Create a new account</Text>
      </Pressable>
    </Screen>
  );
}

export function CreateProfileScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!username || !contact || !password) {
      toast.showToast({ title: 'Missing details', body: 'Add username, email or phone, and password.', tone: 'warning' });
      return;
    }
    if (password !== confirmPassword) {
      toast.showToast({ title: 'Passwords do not match', tone: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const trimmedContact = contact.trim();
      const isEmail = trimmedContact.includes('@');
      await signUp({
        username: username.trim(),
        email: isEmail ? trimmedContact : '',
        phone: isEmail ? '' : trimmedContact,
        password,
        country: 'kenya',
        region: 'Nairobi',
        platforms: ['mobile'],
        selected_games: ['pubgm'],
        game_ids: {},
        whatsapp_number: isEmail ? null : trimmedContact,
        whatsapp_notifications: true,
      });
      await requestNotificationPermission(toast);
      router.replace('/(onboarding)/profile');
    } catch (error) {
      toast.showToast({ title: 'Could not create account', body: error instanceof Error ? error.message : 'Try again.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="Create profile"
      subtitle="Use the same identity you will use for match rooms."
      breadcrumbs={[{ label: 'PlayMechi', href: '/splash' }, { label: 'Create account' }]}
      bottomInset={32}
    >
      <Field icon="person-outline" label="Username" placeholder="Gamer tag" value={username} onChangeText={setUsername} />
      <Field icon="mail-outline" label="Email or phone" placeholder="you@example.com" value={contact} onChangeText={setContact} autoCapitalize="none" />
      <Field icon="lock-closed-outline" label="Password" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Field icon="lock-closed-outline" label="Confirm password" placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      <PrimaryButton label={loading ? 'Creating...' : 'Create Account'} icon="arrow-forward" onPress={submit} disabled={loading} />
      <Pressable onPress={() => router.push('/(auth)/login')} style={{ alignItems: 'center', padding: 10 }}>
        <Text style={{ color: p.teal, fontSize: 13, fontWeight: '800' }}>I already have an account</Text>
      </Pressable>
    </Screen>
  );
}

export function CompleteProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [country, setCountry] = useState<CountryKey>((user?.country as CountryKey) ?? 'kenya');
  const [region, setRegion] = useState(user?.region ?? 'Nairobi');
  const [game, setGame] = useState<OnlineTournamentGameKey>('pubgm');
  const [gameId, setGameId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp_number ?? '');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await patchProfile({
        country,
        region,
        ...buildGameSetup(game, 'mobile', gameId),
        whatsapp_number: whatsappNumber,
        whatsapp_notifications: true,
      });
      await refreshUser();
      await requestNotificationPermission(toast);
      router.replace('/(tabs)');
    } catch (error) {
      toast.showToast({ title: 'Profile update failed', body: error instanceof Error ? error.message : 'Try again.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="Player readiness"
      subtitle="Set the details operators use for rooms, reminders, and payouts."
      breadcrumbs={[{ label: 'Profile setup' }]}
      bottomInset={32}
    >
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 15, fontWeight: '900' }}>Country</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(COUNTRIES).map(([key, item]) => (
            <Pressable
              key={key}
              onPress={() => {
                setCountry(key as CountryKey);
                toast.showToast({ title: `${item.label} selected`, body: 'Region and room timing will use this country.', tone: 'info' });
              }}
              style={{ borderRadius: 18, paddingHorizontal: 12, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: country === key ? p.teal : p.panel2, borderWidth: 1, borderColor: country === key ? p.teal : p.line }}
            >
              <Text style={{ color: country === key ? p.ink : p.text, fontWeight: '900', fontSize: 12 }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Field label="Region" value={region} onChangeText={setRegion} placeholder="Nairobi" />
      <Card>
        <Text selectable style={{ color: p.text, fontSize: 15, fontWeight: '900' }}>Main tournament game</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['pubgm', 'codm', 'efootball', 'freefire'] as OnlineTournamentGameKey[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                setGame(item);
                toast.showToast({ title: `${item.toUpperCase()} selected`, body: 'Add the exact in-game name operators should verify.', tone: 'info' });
              }}
              style={{ borderRadius: 18, paddingHorizontal: 12, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: game === item ? p.teal : p.panel2, borderWidth: 1, borderColor: game === item ? p.teal : p.line }}
            >
              <Text style={{ color: game === item ? p.ink : p.text, fontWeight: '900', fontSize: 12 }}>{item.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Field label="Exact in-game name / ID" value={gameId} onChangeText={setGameId} placeholder="Your game handle" />
      <Field label="WhatsApp number" value={whatsappNumber} onChangeText={setWhatsappNumber} placeholder="+254..." keyboardType="phone-pad" />
      <StatusPill label="Used for room reminders" />
      <PrimaryButton label={loading ? 'Saving...' : 'Finish Setup'} icon="checkmark" onPress={submit} disabled={loading} />
    </Screen>
  );
}

export function OnboardingScreen() {
  return <CompleteProfileScreen />;
}
