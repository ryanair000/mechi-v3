import { Redirect, Stack } from 'expo-router';
import { LoadingState, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/auth/AuthProvider';
import { colors } from '../../src/theme';

export default function AuthLayout() {
  const { initializing, token } = useAuth();

  if (initializing) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Checking session" />
      </Screen>
    );
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
