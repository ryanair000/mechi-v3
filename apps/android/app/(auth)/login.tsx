import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
      setError(err instanceof ApiError ? err.message : 'Login failed. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.brandHeader}>
        <View style={styles.logoPlate}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandTitle}>PlayMechi</Text>
        <Text style={styles.brandSubtitle}>
          Check in, get rooms, follow brackets, and keep your squad locked in.
        </Text>
      </View>

      <Card>
        <Text style={textStyles.h2}>Back in the lobby</Text>
        <Field
          label="Phone, email, or username"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Phone, email, or gamer tag"
          textContentType="username"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          textContentType="password"
        />
        <ErrorBanner message={error} />
        <Button
          label="Enter PlayMechi"
          icon="log-in"
          onPress={handleLogin}
          loading={loading}
          disabled={!identifier.trim() || !password}
        />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New here?</Text>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <Text style={styles.footerLink}>Create your player profile</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  logoPlate: {
    width: 112,
    height: 112,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 86,
    height: 86,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 39,
    letterSpacing: 0,
    textAlign: 'center',
  },
  brandSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 340,
    textAlign: 'center',
  },
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
