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
    'Hi PlayMechi team,',
    '',
    'Please delete my PlayMechi account and related personal data.',
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
      setError('That link did not open. Try again in a moment.');
    }
  }

  return (
    <Screen
      title="Account and policy"
      subtitle="Privacy, terms, support, and account deletion in one place."
    >
      <ErrorBanner message={error} />

      <Card>
        <SectionTitle title="Delete account" />
        <Text style={textStyles.body}>
          Want out? Start here and follow the deletion instructions on the official page.
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
          These are the official PlayMechi policy pages used for the app listing and player support.
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
          Need help with login, entries, rooms, prizes, or data requests? Contact the PlayMechi team.
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
