import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { SplashScreen } from '../../src/screens/auth';
import { p } from '../../src/ui/production-ui';

export default function AuthLayout() {
  const { initializing, token } = useAuth();

  if (initializing) {
    return <SplashScreen />;
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: p.bg },
      }}
    />
  );
}
