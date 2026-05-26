import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme';

export function KineticScreen({
  children,
  dark = false,
  title = 'PlayMechi',
  padded = true,
}: {
  children: React.ReactNode;
  dark?: boolean;
  title?: string;
  padded?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, dark && styles.darkRoot]}>
      <View style={[styles.topBar, dark && styles.darkTopBar, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Ionicons name="menu" size={27} color={dark ? colors.mutedDark : colors.primary} />
        </Pressable>
        <View style={[styles.brandPlate, dark && styles.darkBrandPlate]}>
          <Text style={[styles.brand, dark && styles.darkBrand]}>{title}</Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Ionicons
            name="notifications-outline"
            size={28}
            color={dark ? colors.mutedDark : colors.primary}
          />
        </Pressable>
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, padded && styles.padded]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Label({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={[styles.label, muted && styles.labelMuted]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  icon,
  danger = false,
  disabled = false,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        danger && styles.dangerButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={24} color={danger ? colors.white : colors.slate} /> : null}
      <Text style={[styles.primaryButtonText, danger && styles.dangerButtonText]}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  dark = false,
  style,
}: {
  children: React.ReactNode;
  dark?: boolean;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[styles.card, dark && styles.darkCard, style]}>{children}</View>;
}

export function BottomTabLink({
  href,
  label,
  icon,
  active = false,
}: {
  href: Href;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.bottomItem}>
        <Ionicons name={icon} size={24} color={active ? colors.primary : colors.bottomMuted} />
        <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  darkRoot: {
    backgroundColor: colors.slate,
  },
  topBar: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: colors.slate,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(186,202,197,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  darkTopBar: {
    borderBottomColor: 'rgba(186,202,197,0.16)',
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandPlate: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBrandPlate: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
  },
  brand: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: 0,
  },
  darkBrand: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 150,
    gap: spacing.lg,
  },
  padded: {
    padding: 14,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  labelMuted: {
    color: colors.muted,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dangerButton: {
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    color: colors.slate,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  dangerButtonText: {
    color: colors.white,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  card: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    gap: spacing.sm,
  },
  darkCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(186,202,197,0.16)',
  },
  bottomItem: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomLabel: {
    color: colors.bottomMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  bottomLabelActive: {
    color: colors.primary,
  },
});

export const kineticStyles = styles;
