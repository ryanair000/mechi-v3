import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Linking, Image, ImageBackground, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBadge } from './ui';
import { colors, radii, spacing } from '../theme';
import type { FeedAction, FeedPost } from '../config/feed';

function FeedActionButton({ action, primary = false }: { action: FeedAction; primary?: boolean }) {
  const buttonStyle = [styles.actionButton, primary ? styles.actionButtonPrimary : styles.actionButtonSecondary];
  const textStyle = [styles.actionText, primary ? styles.actionTextPrimary : styles.actionTextSecondary];

  if (action.kind === 'internal') {
    return (
      <Link href={action.href} asChild>
        <Pressable style={({ pressed }) => [buttonStyle, pressed && styles.pressed]}>
          <Text style={textStyle}>{action.label}</Text>
          <Ionicons
            name="arrow-forward"
            size={15}
            color={primary ? colors.bg : colors.text}
          />
        </Pressable>
      </Link>
    );
  }

  return (
    <Pressable
      onPress={() => void Linking.openURL(action.href)}
      style={({ pressed }) => [buttonStyle, pressed && styles.pressed]}
    >
      <Text style={textStyle}>{action.label}</Text>
      <Ionicons
        name="open-outline"
        size={15}
        color={primary ? colors.bg : colors.text}
      />
    </Pressable>
  );
}

export function FeedPostCard({ post }: { post: FeedPost }) {
  const { width } = useWindowDimensions();
  const mediaHeight = Math.min(Math.max(width * 0.9, 260), 360);

  return (
    <View style={styles.frame}>
      <View pointerEvents="none" style={styles.glowMint} />
      <View pointerEvents="none" style={styles.glowCoral} />
      <View style={styles.shell}>
        <View style={styles.headerRow}>
          <View style={styles.authorRow}>
            <View style={styles.logoWrap}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.authorCopy}>
              <View style={styles.authorLine}>
                <Text selectable style={styles.authorName}>
                  {post.author}
                </Text>
                {post.pinned ? <StatusBadge label="Pinned" tone="warn" /> : null}
              </View>
              <Text selectable style={styles.authorMeta}>
                {post.channel} . {post.publishedAt}
              </Text>
            </View>
          </View>
          <View style={styles.verifiedWrap}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          </View>
        </View>

        <ImageBackground
          source={{ uri: post.imageUrl }}
          imageStyle={styles.mediaImage}
          style={[styles.media, { minHeight: mediaHeight }]}
        >
          <View style={styles.mediaOverlay} />
          <View style={styles.mediaTopRow}>
            <View style={styles.timePill}>
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <Text style={styles.timePillText}>Official drop</Text>
            </View>
          </View>
          <View style={styles.tagRow}>
            {post.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </ImageBackground>

        <View style={styles.bodyBlock}>
          <Text selectable style={styles.kicker}>
            PLAYMECHI FEED
          </Text>
          <Text selectable style={styles.title}>
            {post.title}
          </Text>
          <Text selectable style={styles.body}>
            {post.body}
          </Text>
        </View>

        <View style={styles.metricsWrap}>
          {post.metrics.map((metric) => (
            <View key={`${metric.label}-${metric.value}`} style={styles.metricPill}>
              <View style={styles.metricIconWrap}>
                <Ionicons name={metric.icon} size={14} color={colors.primary} />
              </View>
              <View style={styles.metricCopy}>
                <Text selectable style={styles.metricLabel}>
                  {metric.label}
                </Text>
                <Text selectable style={styles.metricValue}>
                  {metric.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actionsRow}>
          {post.primaryAction ? <FeedActionButton action={post.primaryAction} primary /> : null}
          {post.secondaryAction ? <FeedActionButton action={post.secondaryAction} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 1,
  },
  glowMint: {
    position: 'absolute',
    top: -54,
    left: -24,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(50, 224, 196, 0.18)',
  },
  glowCoral: {
    position: 'absolute',
    right: -36,
    bottom: -78,
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 92, 119, 0.12)',
  },
  shell: {
    position: 'relative',
    overflow: 'hidden',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 23,
    backgroundColor: 'rgba(9, 13, 10, 0.94)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  authorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 28,
    height: 28,
  },
  authorCopy: {
    flex: 1,
    gap: 4,
  },
  authorLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  authorMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
  },
  mediaImage: {
    borderRadius: 16,
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 10, 8, 0.28)',
  },
  mediaTopRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(7, 10, 8, 0.62)',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  timePillText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  tagChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(7, 10, 8, 0.58)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  tagText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  bodyBlock: {
    gap: spacing.sm,
  },
  kicker: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  metricsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricPill: {
    minWidth: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50, 224, 196, 0.1)',
  },
  metricCopy: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: 46,
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: colors.panel2,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '900',
  },
  actionTextPrimary: {
    color: colors.bg,
  },
  actionTextSecondary: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.82,
  },
});
