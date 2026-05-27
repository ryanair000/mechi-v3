import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandWordmark } from './brand';
import { colors, radii, spacing } from '../theme';
import { priorityTone, type NotificationCategory, type NotificationItem } from '../data/notifications';
import { useNotifications } from '../data/notifications-context';

type ToastTone = 'success' | 'info' | 'warning' | 'error';

type ToastPayload = {
  title: string;
  body?: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type ToastContextValue = {
  showToast: (payload: ToastPayload) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastTone: Record<ToastTone, { icon: keyof typeof Ionicons.glyphMap; bg: string; border: string; color: string }> = {
  success: {
    icon: 'checkmark-circle-outline',
    bg: '#151B2C',
    border: 'rgba(50,224,196,0.34)',
    color: colors.primary,
  },
  info: {
    icon: 'information-circle-outline',
    bg: '#151B2C',
    border: 'rgba(186,202,197,0.18)',
    color: colors.neutral,
  },
  warning: {
    icon: 'alert-circle-outline',
    bg: '#151B2C',
    border: 'rgba(245,158,11,0.36)',
    color: colors.warning,
  },
  error: {
    icon: 'close-circle-outline',
    bg: '#151B2C',
    border: 'rgba(255,107,107,0.38)',
    color: colors.accent,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const showToast = useCallback((payload: ToastPayload) => {
    setToast(payload);
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => setToast(null), toast.duration ?? 3200);
    return () => clearTimeout(timeout);
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const tone = toastTone[toast?.tone ?? 'info'];

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.toastRoot}>
        {children}
        {toast ? (
          <View pointerEvents="box-none" style={[styles.toastLayer, { top: insets.top + 10 }]}>
            <View style={[styles.toast, { backgroundColor: tone.bg, borderColor: tone.border }]}>
              <Ionicons name={tone.icon} color={tone.color} size={20} />
              <View style={styles.toastCopy}>
                <Text style={styles.toastTitle}>{toast.title}</Text>
                {toast.body ? <Text style={styles.toastBody}>{toast.body}</Text> : null}
              </View>
              {toast.actionLabel ? (
                <Pressable
                  onPress={() => {
                    toast.onAction?.();
                    setToast(null);
                  }}
                  style={styles.toastAction}
                >
                  <Text style={styles.toastActionText}>{toast.actionLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}

export function FigmaScreen({
  children,
  dark = false,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  dark?: boolean;
  scroll?: boolean;
  contentStyle?: object;
}) {
  const backgroundColor = dark ? colors.slate : colors.bg;
  const content = <View style={[styles.screenContent, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor }]}>
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          style={{ backgroundColor }}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { backgroundColor }]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

export function TopBar({ mode = 'dark' }: { mode?: 'light' | 'dark' }) {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const isDark = mode === 'dark';
  const badgeText = unreadCount === 0 ? '' : unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <View style={[styles.topBar, isDark ? styles.topBarDark : styles.topBarLight]}>
      <View style={styles.iconButton} />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(tabs)')}
        style={styles.brandButton}
      >
        <BrandWordmark size="compact" dark={isDark} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        onPress={() => router.push('/notifications')}
        style={styles.iconButton}
      >
        <Ionicons
          name="notifications-outline"
          color={isDark ? colors.white : colors.text}
          size={22}
        />
        {badgeText ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

export function HeaderBar({
  title,
  dark = false,
  right,
}: {
  title: string;
  dark?: boolean;
  right?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: dark ? colors.slate : colors.white }}>
      <View style={[styles.headerBar, dark ? styles.headerBarDark : styles.headerBarLight]}>
        <Pressable onPress={() => router.back()} style={styles.headerIconButton}>
          <Ionicons name="chevron-back" color={dark ? colors.white : colors.text} size={26} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: dark ? colors.white : colors.text }]}>{title}</Text>
        <View style={styles.headerRight}>{right}</View>
      </View>
    </SafeAreaView>
  );
}

export function AppUpdateBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { showToast } = useToast();

  if (dismissed) return null;

  return (
    <View style={styles.updateBanner}>
      <View style={styles.updateIcon}>
        <Ionicons name="download-outline" color={colors.slate} size={18} />
      </View>
      <View style={styles.updateCopy}>
        <Text style={styles.updateTitle}>Update available</Text>
        <Text style={styles.updateBody}>Smoother match alerts and fixes are ready.</Text>
      </View>
      <Pressable
        onPress={() => showToast({ title: 'Update started', tone: 'success' })}
        style={styles.updateButton}
      >
        <Text style={styles.updateButtonText}>Update</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss update notice"
        onPress={() => setDismissed(true)}
        style={styles.updateDismiss}
      >
        <Ionicons name="close" color={colors.faint} size={18} />
      </Pressable>
    </View>
  );
}

export type LiveVariant = 'fresh' | 'new-items' | 'urgent' | 'offline' | 'syncing' | 'restored';

const liveVariants: Record<
  LiveVariant,
  { bg: string; border: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  fresh: { bg: '#EFFFFB', border: 'rgba(50,224,196,0.24)', color: '#006B5C', icon: 'radio-outline' },
  'new-items': { bg: '#EFFFFB', border: 'rgba(50,224,196,0.24)', color: '#006B5C', icon: 'radio-outline' },
  urgent: {
    bg: 'rgba(255,107,107,0.12)',
    border: 'rgba(255,107,107,0.32)',
    color: colors.accent,
    icon: 'warning-outline',
  },
  offline: { bg: '#F5F7FA', border: colors.border, color: colors.muted, icon: 'cloud-offline-outline' },
  syncing: { bg: '#F5F7FA', border: colors.border, color: colors.muted, icon: 'sync-outline' },
  restored: { bg: '#EFFFFB', border: 'rgba(50,224,196,0.24)', color: '#006B5C', icon: 'checkmark-circle-outline' },
};

export function LiveBanner({
  variant,
  title,
  body,
  actionLabel,
  onAction,
}: {
  variant: LiveVariant;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const tone = liveVariants[variant];

  return (
    <View style={[styles.liveBanner, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Ionicons name={tone.icon} color={tone.color} size={18} />
      <View style={styles.liveCopy}>
        <Text style={[styles.liveTitle, { color: tone.color }]}>{title}</Text>
        {body ? <Text style={[styles.liveBody, { color: tone.color }]}>{body}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} style={styles.liveAction}>
          <Text style={[styles.liveActionText, { color: tone.color }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CategoryChip({ category }: { category: NotificationCategory }) {
  const tone: Record<NotificationCategory, { bg: string; color: string }> = {
    Match: { bg: colors.slate, color: colors.primary },
    Tournament: { bg: colors.surfaceNeutral, color: colors.text },
    Proof: { bg: 'rgba(255,107,107,0.12)', color: colors.accent },
    Community: { bg: colors.surfaceNeutral, color: colors.muted },
    Support: { bg: 'rgba(245,158,11,0.12)', color: '#A36009' },
    Account: { bg: colors.surfaceNeutral, color: colors.muted },
    System: { bg: '#F5F7FA', color: colors.faint },
  };
  const selected = tone[category];

  return (
    <View style={[styles.categoryChip, { backgroundColor: selected.bg }]}>
      <Text style={[styles.categoryChipText, { color: selected.color }]}>{category}</Text>
    </View>
  );
}

export function NotificationRow({
  notification,
  onPress,
  onArchive,
}: {
  notification: NotificationItem;
  onPress: (notification: NotificationItem) => void;
  onArchive?: (notification: NotificationItem) => void;
}) {
  const tone = priorityTone[notification.priority];
  const icon: Record<typeof notification.priority, keyof typeof Ionicons.glyphMap> = {
    critical: 'warning-outline',
    action: 'flash-outline',
    success: 'checkmark-circle-outline',
    info: 'notifications-outline',
    live: 'radio-outline',
  };
  const urgent = notification.priority === 'critical';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.destinationHint}`}
      onPress={() => onPress(notification)}
      style={({ pressed }) => [
        styles.notificationRow,
        urgent && styles.notificationRowCritical,
        !notification.unread && styles.notificationRowRead,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.notificationIcon, { backgroundColor: tone.bg }]}>
        <Ionicons name={icon[notification.priority]} color={tone.accent} size={18} />
      </View>
      <View style={styles.notificationCopy}>
        <View style={styles.notificationMetaRow}>
          <CategoryChip category={notification.category} />
          {urgent ? <Text style={styles.criticalText}>Critical</Text> : null}
          {notification.unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.notificationTitle, !notification.unread && styles.notificationTitleRead]}
        >
          {notification.title}
        </Text>
        <Text numberOfLines={2} style={styles.notificationBody}>
          {notification.body}
        </Text>
        <View style={styles.notificationFooter}>
          <Text style={styles.notificationTime}>{notification.time}</Text>
          <Text style={styles.destinationText}>{notification.destinationHint}</Text>
          <Ionicons name="chevron-forward" color={colors.text} size={14} />
        </View>
      </View>
      {onArchive ? (
        <Pressable
          accessibilityLabel={`Archive ${notification.title}`}
          onPress={() => onArchive(notification)}
          style={styles.archiveButton}
        >
          <Ionicons name="close" color={colors.faint} size={14} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export type CriticalSheetData = {
  title: string;
  body: string;
  badge?: string;
  details?: Array<{ label: string; value: string }>;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function CriticalSheet({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data?: CriticalSheetData;
}) {
  if (!data) return null;

  return (
    <Modal transparent visible={open} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetContent}>
          <View style={styles.sheetTop}>
            <View style={styles.sheetBadge}>
              <Ionicons name="warning-outline" color={colors.accent} size={14} />
              <Text style={styles.sheetBadgeText}>{data.badge ?? 'Critical'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.headerIconButton}>
              <Ionicons name="close" color={colors.neutral} size={22} />
            </Pressable>
          </View>
          <View>
            <Text style={styles.sheetTitle}>{data.title}</Text>
            <Text style={styles.sheetBody}>{data.body}</Text>
          </View>
          {data.details?.length ? (
            <View style={styles.sheetDetails}>
              {data.details.map((detail) => (
                <View key={detail.label} style={styles.sheetDetailRow}>
                  <Text style={styles.sheetDetailLabel}>{detail.label}</Text>
                  <Text style={styles.sheetDetailValue}>{detail.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.sheetActions}>
            <Pressable
              onPress={() => {
                data.onPrimary();
                onClose();
              }}
              style={styles.sheetPrimary}
            >
              <Text style={styles.sheetPrimaryText}>{data.primaryLabel}</Text>
            </Pressable>
            {data.secondaryLabel ? (
              <Pressable
                onPress={() => {
                  data.onSecondary?.();
                  onClose();
                }}
                style={styles.sheetSecondary}
              >
                <Text style={styles.sheetSecondaryText}>{data.secondaryLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function NativeSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.white}
    />
  );
}

export function FigmaInput({ style, ...props }: TextInputProps) {
  return <TextInput placeholderTextColor={colors.faint} style={[styles.input, style]} {...props} />;
}

export function FigmaButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'dark' | 'light' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.figmaButton,
        styles[`figmaButton_${variant}`],
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.slate : colors.white} />
      ) : icon ? (
        <Ionicons
          name={icon}
          color={variant === 'primary' || variant === 'light' ? colors.slate : colors.white}
          size={18}
        />
      ) : null}
      <Text
        style={[
          styles.figmaButtonText,
          (variant === 'primary' || variant === 'light') && styles.figmaButtonTextDark,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionLabel({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return <Text style={[styles.sectionLabel, dark && styles.sectionLabelDark]}>{children}</Text>;
}

export function MiniStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, accent && styles.miniStatAccent]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href as never} asChild>
      <Pressable>{children}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  toastRoot: {
    flex: 1,
  },
  toastLayer: {
    left: 14,
    right: 14,
    position: 'absolute',
    zIndex: 1000,
  },
  toast: {
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    boxShadow: '0 12px 24px rgba(11,17,33,0.24)',
  },
  toastCopy: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  toastBody: {
    color: colors.neutral,
    fontSize: 12,
    fontWeight: '700',
  },
  toastAction: {
    minHeight: 36,
    justifyContent: 'center',
  },
  toastActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 164,
  },
  screenContent: {
    flex: 1,
  },
  topBar: {
    height: 56,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarDark: {
    backgroundColor: colors.slate,
    borderBottomColor: 'rgba(186,202,197,0.16)',
  },
  topBarLight: {
    backgroundColor: colors.bg,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  brandButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.slate,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
  headerBar: {
    height: 56,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBarDark: {
    backgroundColor: colors.slate,
    borderBottomColor: 'rgba(186,202,197,0.16)',
  },
  headerBarLight: {
    backgroundColor: colors.white,
    borderBottomColor: colors.border,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  updateBanner: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(50,224,196,0.24)',
    backgroundColor: 'rgba(50,224,196,0.12)',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  updateIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateCopy: {
    flex: 1,
    gap: 2,
  },
  updateTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  updateBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  updateButton: {
    minHeight: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '900',
  },
  updateDismiss: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBanner: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveCopy: {
    flex: 1,
    gap: 2,
  },
  liveTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  liveBody: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  liveAction: {
    minHeight: 34,
    justifyContent: 'center',
  },
  liveActionText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
  categoryChip: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  categoryChipText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notificationRow: {
    minHeight: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    position: 'relative',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  notificationRowCritical: {
    borderColor: 'rgba(255,107,107,0.32)',
  },
  notificationRowRead: {
    opacity: 0.78,
  },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCopy: {
    flex: 1,
    gap: 4,
  },
  notificationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  criticalText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginLeft: 'auto',
  },
  notificationTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  notificationTitleRead: {
    color: colors.muted,
    fontWeight: '800',
  },
  notificationBody: {
    color: colors.faint,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  notificationTime: {
    flex: 1,
    color: colors.faint,
    fontSize: 11,
    fontWeight: '700',
  },
  destinationText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  archiveButton: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.slate,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(186,202,197,0.16)',
    marginTop: 'auto',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(186,202,197,0.32)',
    marginTop: spacing.md,
  },
  sheetContent: {
    padding: spacing.xl,
    paddingBottom: 28,
    gap: spacing.lg,
  },
  sheetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetBadge: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.32)',
    backgroundColor: 'rgba(255,107,107,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sheetBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sheetTitle: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  sheetBody: {
    color: colors.neutral,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  sheetDetails: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(186,202,197,0.16)',
    backgroundColor: colors.nightPanel,
    overflow: 'hidden',
  },
  sheetDetailRow: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(186,202,197,0.08)',
    gap: spacing.md,
  },
  sheetDetailLabel: {
    color: colors.neutral,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sheetDetailValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sheetPrimary: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryText: {
    color: colors.slate,
    fontSize: 14,
    fontWeight: '900',
  },
  sheetSecondary: {
    minHeight: 50,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(186,202,197,0.16)',
    backgroundColor: colors.nightPanel2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSecondaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  figmaButton: {
    minHeight: 50,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  figmaButton_primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  figmaButton_dark: {
    backgroundColor: colors.slate,
    borderColor: colors.slate,
  },
  figmaButton_light: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  figmaButton_danger: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  figmaButton_ghost: {
    backgroundColor: 'rgba(186,202,197,0.1)',
    borderColor: 'rgba(186,202,197,0.16)',
  },
  figmaButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  figmaButtonTextDark: {
    color: colors.slate,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.78,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionLabelDark: {
    color: colors.white,
  },
  miniStat: {
    flex: 1,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  miniStatValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  miniStatAccent: {
    color: colors.primary,
  },
  miniStatLabel: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
