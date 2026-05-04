import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorBanner, Screen, SectionTitle, textStyles } from '../src/components/ui';
import {
  buildSupportMailto,
  MECHI_PRIVACY_POLICY_URL,
  MECHI_SUPPORT_EMAIL,
  MECHI_TERMS_URL,
  MECHI_USER_DATA_DELETION_URL,
  MECHI_WEB_URL,
} from '../src/lib/legal';
import { colors, spacing } from '../src/theme';

const deletionMailto = buildSupportMailto(
  'User Data Deletion Request',
  [
    'Hello PlayMechi team,',
    '',
    'I want to request deletion of my PlayMechi/Mechi account and associated personal data.',
    '',
    'Account username:',
    'Phone or email on the account:',
    '',
    'Thank you.',
  ].join('\n')
);

export default function LegalScreen() {
  const [error, setError] = useState<string | null>(null);

  async function openExternal(url: string) {
    setError(null);

    try {
      await Linking.openURL(url);
    } catch {
      setError('Could not open that link right now. Please try again in a moment.');
    }
  }

  return (
    <Screen
      title="Account & policy"
      subtitle="Review account policy links, contact support, or start an account deletion request."
    >
      <ErrorBanner message={error} />

      <Card>
        <SectionTitle title="Delete account" />
        <Text style={textStyles.body}>
          Start your deletion request from here, then follow the instructions on the account deletion page.
        </Text>
        <View style={styles.metaGroup}>
          <Text style={styles.metaLabel}>Deletion page</Text>
          <Text style={styles.metaValue}>{MECHI_USER_DATA_DELETION_URL}</Text>
        </View>
        <Button
          label="Open deletion page"
          icon="trash"
          onPress={() => void openExternal(MECHI_USER_DATA_DELETION_URL)}
        />
        <Button
          label="Email deletion request"
          icon="mail"
          variant="secondary"
          onPress={() => void openExternal(deletionMailto)}
        />
      </Card>

      <Card>
        <SectionTitle title="Privacy & terms" />
        <Text style={textStyles.muted}>
          These links match the public pages used for the Google Play listing and review process.
        </Text>
        <Button
          label="Privacy policy"
          icon="shield-checkmark"
          variant="secondary"
          onPress={() => void openExternal(MECHI_PRIVACY_POLICY_URL)}
        />
        <Button
          label="Terms of service"
          icon="document-text"
          variant="secondary"
          onPress={() => void openExternal(MECHI_TERMS_URL)}
        />
      </Card>

      <Card>
        <SectionTitle title="Support" />
        <Text style={textStyles.body}>
          Reach the PlayMechi team if you need help with sign-in, account access, tournaments, or data requests.
        </Text>
        <View style={styles.metaGroup}>
          <Text style={styles.metaLabel}>Support email</Text>
          <Text style={styles.metaValue}>{MECHI_SUPPORT_EMAIL}</Text>
        </View>
        <View style={styles.metaGroup}>
          <Text style={styles.metaLabel}>Website</Text>
          <Text style={styles.metaValue}>{MECHI_WEB_URL}</Text>
        </View>
        <Button
          label="Email support"
          icon="mail-open"
          onPress={() => void openExternal(buildSupportMailto('PlayMechi Android support'))}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaGroup: {
    gap: spacing.xs,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
