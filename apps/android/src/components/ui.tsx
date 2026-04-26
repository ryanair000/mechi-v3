import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
};

export function Screen({ title, subtitle, children, scroll = true, padded = true }: ScreenProps) {
  const content = (
    <View style={[styles.screenContent, padded && styles.padded]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  icon,
  variant = 'primary',
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bg : colors.text} />
      ) : icon ? (
        <Ionicons
          name={icon}
          color={variant === 'primary' ? colors.bg : colors.text}
          size={18}
        />
      ) : null}
      <Text style={[styles.buttonText, variant === 'primary' && styles.buttonTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function Field({ label, error, style, ...props }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        style={[styles.field, error && styles.fieldError, style]}
        {...props}
      />
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

type ChipProps<T extends string> = {
  label: string;
  value: T;
  selected?: boolean;
  onPress: (value: T) => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function Chip<T extends string>({ label, value, selected, onPress, icon }: ChipProps<T>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(value)}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={15} color={selected ? colors.bg : colors.muted} />
      ) : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T; icon?: keyof typeof Ionicons.glyphMap }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chipGroup}>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          value={option.value}
          selected={option.value === value}
          icon={option.icon}
          onPress={onChange}
        />
      ))}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle" color={colors.danger} size={18} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  icon = 'sparkles',
}: {
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Card>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} color={colors.primary} size={22} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </Card>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export const textStyles = StyleSheet.create({
  h2: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  h3: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screenContent: {
    flex: 1,
    gap: spacing.lg,
  },
  padded: {
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: -spacing.sm,
  },
  button: {
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  button_primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  button_secondary: {
    backgroundColor: colors.panel2,
    borderColor: colors.border,
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  button_danger: {
    backgroundColor: '#2a1419',
    borderColor: '#67313b',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonTextPrimary: {
    color: colors.bg,
  },
  fieldWrap: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  field: {
    minHeight: 48,
    color: colors.text,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  fieldErrorText: {
    color: colors.danger,
    fontSize: 12,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    borderRadius: radii.pill,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.panel,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: colors.bg,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorBanner: {
    borderWidth: 1,
    borderColor: '#67313b',
    backgroundColor: '#261116',
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  errorText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  muted: {
    color: colors.muted,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: '#173629',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  cardBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  statPill: {
    backgroundColor: colors.panel2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 88,
  },
  statValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
});
