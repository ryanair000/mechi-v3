import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  type ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark, BrandWordmark } from '../components/brand';
import { useNotifications } from '../data/notifications-context';

export const p = {
  bg: '#050A12',
  bg2: '#070D17',
  panel: '#0B1422',
  panel2: '#101B2B',
  panel3: '#111F31',
  line: 'rgba(226,232,240,0.13)',
  lineStrong: 'rgba(226,232,240,0.22)',
  text: '#F7FAFC',
  muted: '#A3AFBF',
  faint: '#6F7D8E',
  teal: '#32E0C4',
  tealDark: '#0E766C',
  coral: '#FF4F5D',
  amber: '#F6BD3C',
  blue: '#78A6FF',
  ink: '#041014',
};

type ToastTone = 'success' | 'info' | 'warning' | 'error';
type ToastPayload = { title: string; body?: string; tone?: ToastTone; duration?: number };
type ToastContextValue = { showToast: (payload: ToastPayload) => void };
export type BreadcrumbItem = { label: string; href?: string };

const ToastContext = createContext<ToastContextValue | null>(null);
const SIDE_NAV_ITEMS: Array<{ label: string; body: string; icon: keyof typeof Ionicons.glyphMap; href: string }> = [
  { label: 'Home', body: 'Player desk and live cup status', icon: 'home-outline', href: '/(tabs)' },
  { label: 'Arena', body: 'Browse active tournaments', icon: 'trophy-outline', href: '/(tabs)/arena' },
  { label: 'Register', body: 'Join, pay, and verify entry', icon: 'ticket-outline', href: '/(tabs)/register' },
  { label: 'Check In', body: 'Confirm match-day readiness', icon: 'checkmark-circle-outline', href: '/check-in' },
  { label: 'Rooms', body: 'Released room IDs and passwords', icon: 'key-outline', href: '/rooms' },
  { label: 'Notifications', body: 'Tournament alerts and updates', icon: 'notifications-outline', href: '/notifications' },
  { label: 'Support', body: 'Rules, disputes, and help', icon: 'help-circle-outline', href: '/support' },
  { label: 'Settings', body: 'Security and alert preferences', icon: 'settings-outline', href: '/settings' },
];

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const showToast = useCallback((payload: ToastPayload) => setToast(payload), []);
  const value = useMemo(() => ({ showToast }), [showToast]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.duration ?? 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const tone = toast?.tone ?? 'info';
  const color = tone === 'error' ? p.coral : tone === 'warning' ? p.amber : p.teal;

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.toastRoot}>
        {children}
        {toast ? (
          <View pointerEvents="box-none" style={[styles.toastLayer, { top: insets.top + 10 }]}>
            <View style={[styles.toast, { borderColor: color }]}>
              <Ionicons name="flash-outline" color={color} size={18} />
              <View style={{ flex: 1 }}>
                <Text selectable style={styles.toastTitle}>{toast.title}</Text>
                {toast.body ? <Text selectable style={styles.toastBody}>{toast.body}</Text> : null}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

export function imageSource(source: ImageSourcePropType | string) {
  return typeof source === 'string' ? { uri: source } : source;
}

export function Screen({
  children,
  title,
  subtitle,
  breadcrumbs,
  backTo,
  backLabel = 'Back',
  scroll = true,
  top = true,
  bottomInset = 168,
}: {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  backTo?: string;
  backLabel?: string;
  scroll?: boolean;
  top?: boolean;
  bottomInset?: number;
}) {
  const content = (
    <View style={[styles.content, !scroll && styles.contentFill, { paddingBottom: bottomInset }]}>
      {top ? <TopBar /> : null}
      {breadcrumbs?.length || backTo ? <Breadcrumbs items={breadcrumbs} backTo={backTo} backLabel={backLabel} /> : null}
      {title ? <TitleBlock title={title} subtitle={subtitle} /> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContainer}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
    </SafeAreaView>
  );
}

export function Breadcrumbs({
  items = [],
  backTo,
  backLabel = 'Back',
}: {
  items?: BreadcrumbItem[];
  backTo?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const clickableItems = items.length ? items : [{ label: backLabel, href: backTo }];

  return (
    <View style={styles.breadcrumbWrap}>
      {backTo ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(backTo as never)}
          style={({ pressed }) => [styles.backCrumb, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" color={p.teal} size={16} />
          <Text style={styles.backCrumbText}>{backLabel}</Text>
        </Pressable>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScroller}>
        {clickableItems.map((item, index) => {
          const isLast = index === clickableItems.length - 1;
          const canPress = Boolean(item.href) && !isLast;
          const crumb = (
            <View style={[styles.crumb, isLast && styles.crumbCurrent]}>
              <Text numberOfLines={1} style={[styles.crumbText, isLast && styles.crumbTextCurrent]}>
                {item.label}
              </Text>
            </View>
          );

          return (
            <View key={`${item.label}-${index}`} style={styles.crumbGroup}>
              {canPress ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push(item.href as never)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  {crumb}
                </Pressable>
              ) : (
                crumb
              )}
              {!isLast ? <Ionicons name="chevron-forward" color={p.faint} size={13} /> : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function TopBar({ title }: { title?: string }) {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = unreadCount > 9 ? '9+' : unreadCount ? String(unreadCount) : '';

  return (
    <>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open navigation" onPress={() => setMenuOpen(true)} style={styles.topIcon}>
          <Ionicons name="menu-outline" color={p.text} size={24} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)')} style={styles.logoButton}>
          <BrandWordmark size="compact" dark />
        </Pressable>
        {title ? <Text selectable style={styles.topTitle}>{title}</Text> : <View style={{ flex: 1 }} />}
        <Pressable accessibilityRole="button" onPress={() => router.push('/notifications')} style={styles.topIcon}>
          <Ionicons name="notifications-outline" color={p.text} size={22} />
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.menuModal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close navigation" onPress={() => setMenuOpen(false)} style={styles.menuScrim} />
          <View style={styles.menuPanel}>
            <View style={styles.menuHeader}>
              <View style={{ flex: 1, gap: 6 }}>
                <BrandWordmark size="compact" dark />
                <Text selectable style={styles.menuSubtitle}>PlayMechi controls</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close navigation" onPress={() => setMenuOpen(false)} style={styles.topIcon}>
                <Ionicons name="close-outline" color={p.text} size={24} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuList}>
              {SIDE_NAV_ITEMS.map((item) => (
                <Pressable
                  key={item.href}
                  accessibilityRole="button"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push(item.href as never);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                >
                  <View style={styles.menuItemIcon}>
                    <Ionicons name={item.icon} color={p.teal} size={21} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuItemTitle}>{item.label}</Text>
                    <Text style={styles.menuItemBody}>{item.body}</Text>
                  </View>
                  <Ionicons name="chevron-forward" color={p.faint} size={18} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function SplashSurface({ onStart, onLogin }: { onStart?: () => void; onLogin?: () => void }) {
  return (
    <Screen scroll={false} top={false} bottomInset={24}>
      <View style={styles.splash}>
        <BrandMark size={72} dark />
        <BrandWordmark size="hero" dark />
        <Text selectable style={styles.splashTitle}>Your game. Your tournaments. One app.</Text>
        <Text selectable style={styles.splashBody}>Register, check in, get room details, and submit proof without chasing links.</Text>
        <PrimaryButton label="Get Started" icon="arrow-forward" onPress={onStart} />
        <Pressable onPress={onLogin} style={styles.textButton}>
          <Text style={styles.textButtonText}>I already have an account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

export function TitleBlock({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <View style={styles.titleBlock}>
      {eyebrow ? <Text selectable style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text selectable style={styles.title}>{title}</Text>
      {subtitle ? <Text selectable style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text selectable style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name="chevron-forward" color={p.teal} size={14} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatusPill({ label, tone = 'teal' }: { label: string; tone?: 'teal' | 'coral' | 'amber' | 'blue' }) {
  const color = tone === 'coral' ? p.coral : tone === 'amber' ? p.amber : tone === 'blue' ? p.blue : p.teal;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text selectable style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
      {icon ? <Ionicons name={icon} color={p.ink} size={18} /> : null}
    </Pressable>
  );
}

export function GhostButton({ label, icon, onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} color={p.teal} size={18} /> : null}
      <Text style={styles.ghostButtonText}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function RowCard({
  icon,
  title,
  body,
  right,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.rowIcon}><Ionicons name={icon} color={p.teal} size={22} /></View>
      <View style={{ flex: 1 }}>
        <Text selectable style={styles.rowTitle}>{title}</Text>
        {body ? <Text selectable style={styles.rowBody}>{body}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" color={p.faint} size={21} />}
    </>
  );

  if (!onPress) {
    return <View style={styles.rowCard}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

export function Stat({ label, value, icon, tone = 'teal' }: { label: string; value: string | number; icon?: keyof typeof Ionicons.glyphMap; tone?: 'teal' | 'amber' | 'coral' }) {
  const color = tone === 'amber' ? p.amber : tone === 'coral' ? p.coral : p.teal;
  return (
    <View style={styles.stat}>
      {icon ? <Ionicons name={icon} color={color} size={20} /> : null}
      <Text selectable style={styles.statValue}>{value}</Text>
      <Text selectable style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function HeroCard({
  image,
  label,
  title,
  subtitle,
  meta,
  action,
  onPress,
}: {
  image: ImageSourcePropType;
  label: string;
  title: string;
  subtitle?: string;
  meta?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.heroCard, pressed && styles.pressed]}>
      <ImageBackground source={imageSource(image)} imageStyle={styles.heroImage} style={styles.heroImageWrap}>
        <View style={styles.heroShade} />
        <View style={styles.heroInner}>
          <StatusPill label={label} tone="teal" />
          <Text selectable style={styles.heroTitle}>{title}</Text>
          {subtitle ? <Text selectable style={styles.heroSubtitle}>{subtitle}</Text> : null}
          {meta ? <Text selectable style={styles.heroMeta}>{meta}</Text> : null}
          {action ? (
            <View style={styles.heroAction}>
              <Text style={styles.heroActionText}>{action}</Text>
              <Ionicons name="chevron-forward" color={p.ink} size={18} />
            </View>
          ) : null}
        </View>
      </ImageBackground>
    </Pressable>
  );
}

export function TileImage({ source, title, body, onPress }: { source: ImageSourcePropType; title: string; body?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <Image source={imageSource(source)} style={styles.tileImage} />
      <View style={styles.tileCopy}>
        <Text selectable numberOfLines={1} style={styles.tileTitle}>{title}</Text>
        {body ? <Text selectable numberOfLines={2} style={styles.tileBody}>{body}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.fieldWrap}>
      {props.label ? <Text selectable style={styles.fieldLabel}>{props.label}</Text> : null}
      <View style={styles.field}>
        {props.icon ? <Ionicons name={props.icon} color={p.faint} size={18} /> : null}
        <TextInput
          placeholderTextColor={p.faint}
          selectionColor={p.teal}
          {...props}
          style={[styles.input, props.style]}
        />
      </View>
    </View>
  );
}

export const images = {
  hero: require('../../assets/esports/mobile-tournament.jpg'),
  codm: require('../../assets/esports/battle-royale-controller.jpg'),
  pubg: require('../../assets/esports/mobile-team.jpg'),
  freefire: require('../../assets/esports/trophy-team.jpg'),
  efootball: require('../../assets/esports/football-controller.jpg'),
  versus: require('../../assets/esports/football-versus.jpg'),
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: p.bg },
  safe: { flex: 1, backgroundColor: p.bg },
  scroll: { flex: 1, backgroundColor: p.bg },
  scrollContainer: { flexGrow: 1 },
  content: { gap: 16, paddingHorizontal: 16, paddingTop: 6 },
  contentFill: { flex: 1 },
  topBar: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoButton: { width: 118, height: 34, alignItems: 'flex-start', justifyContent: 'center' },
  topTitle: { flex: 1, color: p.text, fontSize: 14, fontWeight: '800' },
  topIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: 2, top: 2, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: p.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  menuModal: { flex: 1, flexDirection: 'row' },
  menuScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,6,12,0.64)' },
  menuPanel: { width: '84%', maxWidth: 340, height: '100%', backgroundColor: p.bg2, borderRightWidth: 1, borderRightColor: p.lineStrong, paddingHorizontal: 16, paddingTop: 22 },
  menuHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: p.line, paddingBottom: 14 },
  menuSubtitle: { color: p.muted, fontSize: 12, fontWeight: '800' },
  menuList: { gap: 10, paddingVertical: 14, paddingBottom: 38 },
  menuItem: { minHeight: 66, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.panel, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(50,224,196,0.11)', alignItems: 'center', justifyContent: 'center' },
  menuItemTitle: { color: p.text, fontSize: 14, fontWeight: '900' },
  menuItemBody: { color: p.muted, fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 2 },
  breadcrumbWrap: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8 },
  breadcrumbScroller: { alignItems: 'center', gap: 6, paddingRight: 8 },
  crumbGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  crumb: { height: 30, maxWidth: 136, borderRadius: 10, borderWidth: 1, borderColor: p.line, backgroundColor: 'rgba(16,27,43,0.7)', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  crumbCurrent: { borderColor: 'rgba(50,224,196,0.42)', backgroundColor: 'rgba(50,224,196,0.1)' },
  crumbText: { color: p.muted, fontSize: 11, fontWeight: '900' },
  crumbTextCurrent: { color: p.teal },
  backCrumb: { height: 30, borderRadius: 10, borderWidth: 1, borderColor: p.lineStrong, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: p.panel2 },
  backCrumbText: { color: p.teal, fontSize: 11, fontWeight: '900' },
  titleBlock: { gap: 4 },
  eyebrow: { color: p.teal, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: p.text, fontSize: 31, lineHeight: 35, fontWeight: '900' },
  subtitle: { color: p.muted, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  sectionHeader: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: p.text, fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { color: p.teal, fontSize: 12, fontWeight: '800' },
  pill: { alignSelf: 'flex-start', height: 29, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(5,10,18,0.62)' },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: p.teal, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  primaryButtonText: { color: p.ink, fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  ghostButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: p.lineStrong, backgroundColor: p.panel2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
  ghostButtonText: { color: p.text, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.992 }] },
  card: { borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.panel, padding: 14, gap: 10 },
  rowCard: { minHeight: 72, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.panel, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(50,224,196,0.11)', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: p.text, fontSize: 15, fontWeight: '900' },
  rowBody: { color: p.muted, fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 2 },
  stat: { flex: 1, minHeight: 74, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.panel, alignItems: 'center', justifyContent: 'center', gap: 3 },
  statValue: { color: p.text, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLabel: { color: p.faint, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: p.lineStrong, backgroundColor: p.panel },
  heroImageWrap: { minHeight: 228, justifyContent: 'flex-end' },
  heroImage: { borderRadius: 18 },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,8,15,0.28)' },
  heroInner: { padding: 16, gap: 10, backgroundColor: 'rgba(4,8,15,0.24)' },
  heroTitle: { color: p.text, fontSize: 34, lineHeight: 36, fontWeight: '900', textTransform: 'uppercase' },
  heroSubtitle: { color: p.teal, fontSize: 24, lineHeight: 27, fontWeight: '900', textTransform: 'uppercase' },
  heroMeta: { color: p.text, fontSize: 14, fontWeight: '800' },
  heroAction: { alignSelf: 'flex-start', marginTop: 2, height: 38, borderRadius: 10, backgroundColor: p.teal, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroActionText: { color: p.ink, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  tile: { flex: 1, minWidth: 0, borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: p.line, backgroundColor: p.panel },
  tileImage: { width: '100%', height: 94 },
  tileCopy: { padding: 10, gap: 2 },
  tileTitle: { color: p.text, fontSize: 13, fontWeight: '900' },
  tileBody: { color: p.muted, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: p.muted, fontSize: 12, fontWeight: '800' },
  field: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: p.line, backgroundColor: p.panel, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, color: p.text, fontSize: 14, fontWeight: '700', paddingVertical: 0 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 8 },
  splashTitle: { color: p.text, textAlign: 'center', fontSize: 28, lineHeight: 32, fontWeight: '900', textTransform: 'uppercase' },
  splashBody: { color: p.muted, textAlign: 'center', fontSize: 14, lineHeight: 20, fontWeight: '600', maxWidth: 310 },
  textButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  textButtonText: { color: p.teal, fontWeight: '800', fontSize: 13 },
  toastRoot: { flex: 1, backgroundColor: p.bg },
  toastLayer: { position: 'absolute', left: 12, right: 12, zIndex: 100 },
  toast: { minHeight: 54, borderRadius: 14, borderWidth: 1, backgroundColor: p.panel3, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toastTitle: { color: p.text, fontSize: 13, fontWeight: '900' },
  toastBody: { color: p.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
});
