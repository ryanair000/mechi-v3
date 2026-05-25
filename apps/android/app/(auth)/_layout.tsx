import { Redirect, Stack } from 'expo-router';
import { LaunchScreen } from '../../src/components/ui';
import { useAuth } from '../../src/auth/AuthProvider';
import { colors } from '../../src/theme';

export default function AuthLayout() {
  const { initializing, token } = useAuth();

  if (initializing) {
    return <LaunchScreen label="Checking session" />;
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
