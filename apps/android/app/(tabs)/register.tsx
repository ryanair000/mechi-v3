import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Screen, SectionTitle, textStyles } from '../../src/components/ui';
import { TOURNAMENT_PUBLIC_URL, TOURNAMENT_REGISTER_URL } from '../../src/config/tournament';
import { colors, spacing } from '../../src/theme';

export default function RegisterRedirectTab() {
  async function openRegisterPage() {
    await Linking.openURL(TOURNAMENT_REGISTER_URL);
  }

  async function openTournamentHome() {
    await Linking.openURL(TOURNAMENT_PUBLIC_URL);
  }

  return (
    <Screen title="Register on the website" subtitle="Tournament slot registration now happens on mechi.club only.">
      <Card>
        <SectionTitle title="Website-only registration" />
        <Text style={textStyles.muted}>
          Use the website to pick your game, lock your slot, and submit your exact in-game details.
          Once your registration is saved, come back to the app for community chat, check-in,
          rooms, fixtures, uploads, and prize status.
        </Text>
        <View style={styles.buttonStack}>
          <Button label="Register for Weekend Cup" icon="globe-outline" onPress={() => void openRegisterPage()} />
          <Button
            label="Open tournament website"
            icon="open-outline"
            variant="secondary"
            onPress={() => void openTournamentHome()}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonStack: {
    gap: spacing.sm,
  },
});
