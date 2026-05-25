import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { FeedPostCard } from '../../src/components/feed-post-card';
import { PLAYMECHI_FEED_POSTS } from '../../src/config/feed';
import { Button, Card, Screen, StatusBadge } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';
import { TOURNAMENT_REGISTER_URL } from '../../src/config/tournament';

export default function FeedTab() {
  return (
    <Screen title="Feed" subtitle="Official PlayMechi updates, media, streams, and announcements.">
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="flash" size={23} color={colors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <StatusBadge label="Social gaming feed" tone="good" />
            <Text selectable style={styles.heroTitle}>Updates that tell you what to do next.</Text>
            <Text selectable style={styles.heroBody}>
              Tournament news, stream calls, and community moves in one clean feed. No clutter,
              no guessing.
            </Text>
          </View>
        </View>
        <View style={styles.chipRow}>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>Official</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>Challenges</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>Web entry</Text>
          </View>
        </View>
      </Card>

      <View style={styles.quickGrid}>
        <Card style={styles.quickCard}>
          <View style={styles.quickIcon}>
            <Ionicons name="trophy-outline" size={20} color={colors.slate} />
          </View>
          <Text style={styles.quickTitle}>Enter the event</Text>
          <Text style={styles.quickBody}>Registration and payments stay on mechi.club for clean verification.</Text>
          <Button
            label="Register on web"
            icon="open-outline"
            onPress={() => void Linking.openURL(TOURNAMENT_REGISTER_URL)}
          />
        </Card>

        <Card style={styles.quickCard}>
          <View style={[styles.quickIcon, styles.quickIconCoral]}>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.white} />
          </View>
          <Text style={styles.quickTitle}>Call your shot</Text>
          <Text style={styles.quickBody}>Post a challenge, ask for a lobby, or bring your squad into the chat.</Text>
          <Link href="/(tabs)/community" asChild>
            <Button label="Enter community" icon="chatbubbles-outline" variant="secondary" />
          </Link>
        </Card>
      </View>

      {PLAYMECHI_FEED_POSTS.map((post) => (
        <FeedPostCard key={post.id} post={post} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md,
    borderColor: colors.slate,
    backgroundColor: colors.slate,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50, 224, 196, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(50, 224, 196, 0.28)',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  heroBody: {
    color: colors.neutral,
    fontSize: 14,
    lineHeight: 21,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(50, 224, 196, 0.22)',
    backgroundColor: 'rgba(50, 224, 196, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  heroChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  quickGrid: {
    gap: spacing.md,
  },
  quickCard: {
    gap: spacing.sm,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  quickIconCoral: {
    backgroundColor: colors.accent,
  },
  quickTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  quickBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
