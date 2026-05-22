import { StyleSheet, Text, View } from 'react-native';
import { FeedPostCard } from '../../src/components/feed-post-card';
import { PLAYMECHI_FEED_POSTS } from '../../src/config/feed';
import { Card, Screen, StatusBadge } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';

export default function FeedTab() {
  return (
    <Screen title="Feed" subtitle="Official PlayMechi drops, built for phone first.">
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <StatusBadge label="Android-first" tone="good" />
            <Text selectable style={styles.heroTitle}>
              PlayMechi on phone should feel like a feed, not a maze.
            </Text>
            <Text selectable style={styles.heroBody}>
              Official tournament updates, community highlights, and PlayMechi announcements in one
              phone-first feed.
            </Text>
          </View>
        </View>
        <View style={styles.chipRow}>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>Official posts only</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>Feed-first home</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>PlayMechi updates</Text>
          </View>
        </View>
      </Card>

      {PLAYMECHI_FEED_POSTS.map((post) => (
        <FeedPostCard key={post.id} post={post} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md,
    borderColor: 'rgba(50, 224, 196, 0.22)',
    backgroundColor: '#0f1a14',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  heroBody: {
    color: colors.muted,
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
});
