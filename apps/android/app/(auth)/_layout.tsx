import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { SplashNewScreen } from '../../src/components/new-screens';
import { colors } from '../../src/theme';

export default function AuthLayout() {
  const { initializing, token } = useAuth();

  if (initializing) {
    return <SplashNewScreen />;
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
