import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import {
  buildGameSetup,
  COUNTRIES,
  getGameIdLabel,
  getGameIdPlaceholder,
} from '../../src/config/games';
import { TOURNAMENT_GAME_BY_KEY, TOURNAMENT_GAMES } from '../../src/config/tournament';
import {
  Button,
  Card,
  ChipGroup,
  ErrorBanner,
  Field,
  Screen,
  SectionTitle,
  textStyles,
} from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';
import type { CountryKey, OnlineTournamentGameKey } from '../../src/types';

const fallbackRegion = COUNTRIES.kenya.regions[0] ?? 'Nairobi';
const countryOptions = Object.entries(COUNTRIES).map(([value, country]) => ({
  label: country.label,
  value: value as CountryKey,
}));

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState<CountryKey>('kenya');
  const [region, setRegion] = useState<string>(fallbackRegion);
  const [game, setGame] = useState<OnlineTournamentGameKey>('pubgm');
  const [gameId, setGameId] = useState('');
  const [whatsappNotifications, setWhatsappNotifications] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const regionOptions = COUNTRIES[country].regions.map((value) => ({ label: value, value }));

  function handleCountryChange(value: CountryKey) {
    setCountry(value);
    setRegion(COUNTRIES[value].regions[0] ?? fallbackRegion);
  }

  function handleGameChange(value: OnlineTournamentGameKey) {
    setGame(value);
    setGameId('');
  }

  async function handleRegister() {
    setError(null);
    setLoading(true);

    try {
      const setup = buildGameSetup(game, 'mobile', gameId);
      await signUp({
        username: username.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        country,
        region,
        ...setup,
        whatsapp_number: phone.trim(),
        whatsapp_notifications: whatsappNotifications,
      });
      router.replace(`/(tabs)/register?game=${game}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create account. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    username.trim() &&
    phone.trim() &&
    email.trim() &&
    password.length >= 9 &&
    region &&
    gameId.trim();

  return (
    <Screen title="Create account" subtitle="Set up your PlayMechi tournament account and continue to slot registration.">
      <Card>
        <Text style={textStyles.h2}>Account</Text>
        <Field label="Username" value={username} onChangeText={setUsername} placeholder="playmechiwarrior" />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="0712345678"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 9 characters"
          secureTextEntry
          textContentType="newPassword"
        />
      </Card>

      <Card>
        <SectionTitle title="Location" />
        <ChipGroup options={countryOptions} value={country} onChange={handleCountryChange} />
        <ChipGroup options={regionOptions} value={region} onChange={setRegion} />
      </Card>

      <Card>
        <SectionTitle title="Tournament game" />
        <ChipGroup
          options={TOURNAMENT_GAMES.map((item) => ({
            value: item.game,
            label: item.shortLabel,
          }))}
          value={game}
          onChange={handleGameChange}
        />
        <Text style={textStyles.muted}>
          {TOURNAMENT_GAME_BY_KEY[game].label} plays on mobile for this PlayMechi event.
        </Text>
        <Field
          label={getGameIdLabel(game, 'mobile')}
          value={gameId}
          onChangeText={setGameId}
          placeholder={getGameIdPlaceholder(game, 'mobile')}
        />
        <ChipGroup
          options={[
            { value: 'on', label: 'WhatsApp alerts on' },
            { value: 'off', label: 'Alerts off' },
          ]}
          value={whatsappNotifications ? 'on' : 'off'}
          onChange={(value) => setWhatsappNotifications(value === 'on')}
        />
      </Card>

      <ErrorBanner message={error} />
      <Button
        label="Create account"
        icon="person-add"
        onPress={handleRegister}
        loading={loading}
        disabled={!canSubmit}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={styles.footerLink}>Log in</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    color: colors.muted,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '900',
  },
});
