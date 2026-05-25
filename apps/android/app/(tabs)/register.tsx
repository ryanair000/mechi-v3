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
    <Screen title="Register on web" subtitle="Event entry and payments are verified on mechi.club.">
      <Card>
        <SectionTitle title="Lock your slot" />
        <Text style={textStyles.muted}>
          Pick your game, submit the exact in-game details, and complete payment on the website.
          After that, return here for check-in, room codes, brackets, proof uploads, and prize
          status.
        </Text>
        <View style={styles.buttonStack}>
          <Button label="Register now" icon="globe-outline" onPress={() => void openRegisterPage()} />
          <Button
            label="Tournament info"
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
