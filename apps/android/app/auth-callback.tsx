import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { Screen } from '../src/ui/production-ui';

export default function AuthCallbackScreen() {
  const { initializing, token } = useAuth();

  if (!initializing && token) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Screen
      title="Checking account"
      subtitle="Use email, phone, or your Mechi username to sign in."
      breadcrumbs={[{ label: 'PlayMechi', href: '/splash' }, { label: 'Account check' }]}
      bottomInset={32}
    />
  );
}
