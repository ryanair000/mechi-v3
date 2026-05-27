import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

type BrandMarkProps = {
  size?: number;
  framed?: boolean;
  dark?: boolean;
  style?: object;
};

export function BrandMark({ size = 32, framed = false, dark = false, style }: BrandMarkProps) {
  const inset = framed ? Math.max(6, Math.round(size * 0.14)) : 0;

  return (
    <View
      style={[
        styles.mark,
        framed && styles.markFramed,
        dark && framed && styles.markFramedDark,
        {
          width: size,
          height: size,
          borderRadius: framed ? radii.md : Math.round(size / 2),
        },
        style,
      ]}
    >
      <Image
        source={require('../../assets/logo-mark.png')}
        resizeMode="contain"
        style={{
          width: size - inset * 2,
          height: size - inset * 2,
        }}
      />
    </View>
  );
}

type BrandWordmarkProps = {
  dark?: boolean;
  size?: 'compact' | 'regular' | 'hero';
  stacked?: boolean;
  tagline?: string;
};

export function BrandWordmark({
  dark = false,
  size = 'regular',
  stacked = false,
  tagline,
}: BrandWordmarkProps) {
  const wordmarkWidth = size === 'hero' ? 232 : size === 'compact' ? 122 : 156;
  const wordmarkHeight = Math.round(wordmarkWidth / 4.26);

  return (
    <View style={[styles.wordmark, stacked && styles.wordmarkStacked]}>
      <Image
        source={require('../../assets/brand-wordmark.png')}
        resizeMode="contain"
        style={{
          width: wordmarkWidth,
          height: wordmarkHeight,
        }}
      />
      <View style={[styles.wordmarkCopy, stacked && styles.wordmarkCopyStacked]}>
        {tagline ? (
          <Text
            numberOfLines={2}
            style={[styles.wordmarkTagline, { color: dark ? colors.neutral : colors.muted }]}
          >
            {tagline}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  markFramed: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  markFramedDark: {
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: colors.nightPanel,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wordmarkStacked: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: spacing.md,
  },
  wordmarkCopy: {
    flexShrink: 1,
  },
  wordmarkCopyStacked: {
    alignItems: 'center',
  },
  wordmarkTagline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0,
  },
});
