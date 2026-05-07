import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { LoadingState, Screen } from '../src/components/ui';
import { isProfileComplete, useAuth } from '../src/auth/AuthProvider';

export default function IndexRoute() {
  const router = useRouter();
  const { initializing, token, user } = useAuth();

  useEffect(() => {
    if (initializing) return;

    if (!token) {
      router.replace('/(auth)/login');
      return;
    }

    if (!isProfileComplete(user)) {
      router.replace('/(onboarding)/profile');
      return;
    }

    router.replace('/(tabs)');
  }, [initializing, router, token, user]);

  return (
    <Screen scroll={false}>
      <LoadingState label="Opening PlayMechi" />
    </Screen>
  );
}
