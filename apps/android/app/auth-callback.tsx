import { Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { colors, spacing } from '../src/theme';

export default function AuthCallbackScreen() {
  const { initializing, token } = useAuth();

  if (!initializing && token) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Completing sign in...</Text>
      <Text style={styles.body}>Return to PlayMechi after the provider confirms your account.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: '#050911',
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
  },
  body: {
    color: '#9ca6b5',
    fontSize: 14,
    lineHeight: 20,
  },
});
