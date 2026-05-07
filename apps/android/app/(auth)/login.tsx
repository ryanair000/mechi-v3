import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Card, ErrorBanner, Field, Screen, textStyles } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);

    try {
      await signIn({ identifier: identifier.trim(), password });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="PlayMechi"
      subtitle="Log in to register, check in, view rooms, upload results, and follow your tournament status."
    >
      <Card>
        <Text style={textStyles.h2}>Welcome back</Text>
        <Field
          label="Phone, email, or username"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="0712345678 or playername"
          textContentType="username"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          textContentType="password"
        />
        <ErrorBanner message={error} />
        <Button
          label="Log in"
          icon="log-in"
          onPress={handleLogin}
          loading={loading}
          disabled={!identifier.trim() || !password}
        />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to PlayMechi?</Text>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <Text style={styles.footerLink}>Create account</Text>
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
