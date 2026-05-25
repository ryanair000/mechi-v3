import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { ErrorBanner, Field } from '../../src/components/ui';
import { Card, KineticScreen, PrimaryButton } from '../../src/components/kinetic';
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
    <KineticScreen>
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
        <Text style={styles.cardTitle}>Back in the lobby</Text>
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
        <PrimaryButton
          label={loading ? 'Entering...' : 'Enter PlayMechi'}
          icon="log-in"
          onPress={handleLogin}
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
    </KineticScreen>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  logoPlate: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 68,
    height: 68,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: 0,
    textAlign: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
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
