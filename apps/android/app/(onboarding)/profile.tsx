import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { ApiError } from '../../src/api/client';
import { getProfile, patchProfile } from '../../src/api/mechi';
import { isProfileComplete, useAuth } from '../../src/auth/AuthProvider';
import {
  buildGameSetup,
  COUNTRIES,
  getConfiguredGameId,
  getConfiguredPlatform,
  getGame,
  getGameIdLabel,
  getGameIdPlaceholder,
  getSelectableGames,
  PLATFORMS,
} from '../../src/config/games';
import {
  Button,
  Card,
  ChipGroup,
  ErrorBanner,
  Field,
  LoadingState,
  Screen,
  SectionTitle,
  textStyles,
} from '../../src/components/ui';
import type { CountryKey, GameKey, PlatformKey, Profile } from '../../src/types';

const selectableGames = getSelectableGames();
const fallbackRegion = COUNTRIES.kenya.regions[0] ?? 'Nairobi';
const countryOptions = Object.entries(COUNTRIES).map(([value, country]) => ({
  label: country.label,
  value: value as CountryKey,
}));

type ProfileFormDefaults = {
  country: CountryKey;
  region: string;
  game: GameKey;
  platform: PlatformKey;
  gameId: string;
  whatsappNumber: string;
  whatsappNotifications: boolean;
};

function getProfileFormDefaults(profile: Profile | null | undefined): ProfileFormDefaults {
  const country = profile?.country ?? 'kenya';
  const game = profile?.selected_games?.[0] ?? 'efootball';
  const platform =
    getConfiguredPlatform(game, profile?.game_ids ?? {}, profile?.platforms ?? []) ??
    getGame(game).platforms[0] ??
    'mobile';

  return {
    country,
    region: profile?.region || COUNTRIES[country].regions[0] || fallbackRegion,
    game,
    platform,
    gameId: getConfiguredGameId(game, platform, profile?.game_ids ?? {}),
    whatsappNumber: profile?.whatsapp_number ?? profile?.phone ?? '',
    whatsappNotifications: profile?.whatsapp_notifications ?? true,
  };
}

function getProfileFormKey(profile: Profile | null | undefined) {
  if (!profile) {
    return 'empty-profile';
  }

  return [
    profile.id,
    profile.country ?? '',
    profile.region ?? '',
    profile.selected_games?.join(',') ?? '',
    profile.platforms?.join(',') ?? '',
    JSON.stringify(profile.game_ids ?? {}),
    profile.whatsapp_number ?? '',
    String(profile.whatsapp_notifications ?? ''),
  ].join('|');
}

export default function ProfileSetupScreen() {
  const { token, user, initializing } = useAuth();
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: Boolean(token),
  });
  const profile = profileQuery.data?.profile ?? user;

  if (initializing) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Checking session" />
      </Screen>
    );
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profileQuery.isLoading && !profile) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading profile" />
      </Screen>
    );
  }

  return <ProfileSetupForm key={getProfileFormKey(profile)} profile={profile} />;
}

function ProfileSetupForm({ profile }: { profile: Profile | null | undefined }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const defaults = getProfileFormDefaults(profile);
  const [country, setCountry] = useState<CountryKey>(defaults.country);
  const [region, setRegion] = useState<string>(defaults.region);
  const [game, setGame] = useState<GameKey>(defaults.game);
  const [platform, setPlatform] = useState<PlatformKey>(defaults.platform);
  const [gameId, setGameId] = useState(defaults.gameId);
  const [whatsappNumber, setWhatsappNumber] = useState(defaults.whatsappNumber);
  const [whatsappNotifications, setWhatsappNotifications] = useState(defaults.whatsappNotifications);
  const [error, setError] = useState<string | null>(null);

  const gameDefinition = getGame(game);
  const platformOptions = useMemo(
    () => gameDefinition.platforms.map((value) => ({ value, label: PLATFORMS[value].label })),
    [gameDefinition.platforms]
  );
  const regionOptions = COUNTRIES[country].regions.map((value) => ({ label: value, value }));

  const mutation = useMutation({
    mutationFn: patchProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await refreshUser();
      router.replace('/(tabs)');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    },
  });

  function handleCountryChange(value: CountryKey) {
    setCountry(value);
    setRegion(COUNTRIES[value].regions[0] ?? fallbackRegion);
  }

  function handleGameChange(value: GameKey) {
    const nextGame = getGame(value);
    setGame(value);
    setPlatform(nextGame.platforms.includes(platform) ? platform : nextGame.platforms[0] ?? 'mobile');
    setGameId('');
  }

  function handleSave() {
    setError(null);
    mutation.mutate({
      country,
      region,
      ...buildGameSetup(game, platform, gameId),
      whatsapp_number: whatsappNotifications ? whatsappNumber.trim() : null,
      whatsapp_notifications: whatsappNotifications,
    });
  }

  return (
    <Screen
      title={isProfileComplete(profile) ? 'Edit profile' : 'Complete profile'}
      subtitle="Choose the game, platform, and in-game ID opponents will use to find you."
    >
      <Card>
        <Text style={textStyles.h2}>Location</Text>
        <ChipGroup options={countryOptions} value={country} onChange={handleCountryChange} />
        <ChipGroup options={regionOptions} value={region} onChange={setRegion} />
      </Card>

      <Card>
        <SectionTitle title="Game setup" />
        <ChipGroup
          options={selectableGames.map((item) => ({ value: item.key, label: item.label }))}
          value={game}
          onChange={handleGameChange}
        />
        <ChipGroup options={platformOptions} value={platform} onChange={setPlatform} />
        <Field
          label={getGameIdLabel(game, platform)}
          value={gameId}
          onChangeText={setGameId}
          placeholder={getGameIdPlaceholder(game, platform)}
        />
      </Card>

      <Card>
        <SectionTitle title="Alerts" />
        <ChipGroup
          options={[
            { value: 'on', label: 'WhatsApp alerts on' },
            { value: 'off', label: 'Alerts off' },
          ]}
          value={whatsappNotifications ? 'on' : 'off'}
          onChange={(value) => setWhatsappNotifications(value === 'on')}
        />
        {whatsappNotifications ? (
          <Field
            label="WhatsApp number"
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            placeholder="0712345678"
            keyboardType="phone-pad"
          />
        ) : null}
      </Card>

      <ErrorBanner message={error} />
      <Button
        label="Save profile"
        icon="checkmark-circle"
        onPress={handleSave}
        loading={mutation.isPending}
        disabled={!region || !gameId.trim() || (whatsappNotifications && !whatsappNumber.trim())}
      />
    </Screen>
  );
}
