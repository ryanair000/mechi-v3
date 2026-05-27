import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isProfileComplete, useAuth } from '../../src/auth/AuthProvider';
import { SplashNewScreen } from '../../src/components/new-screens';
import { colors } from '../../src/theme';

const TAB_BAR_HEIGHT = 76;
const TAB_BAR_SIDE_OFFSET = 22;
const TAB_BAR_RADIUS = 28;
const TAB_SCENE_BOTTOM_SPACE = 164;
const TAB_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'HOME', icon: 'home-outline' },
  arena: { label: 'ARENA', icon: 'game-controller-outline' },
  feed: { label: 'FEED', icon: 'logo-rss' },
  community: { label: 'COMMUNITY', icon: 'chatbubble-ellipses-outline' },
  profile: { label: 'PROFILE', icon: 'person-outline' },
};

export default function TabsLayout() {
  const { initializing, token, user } = useAuth();
  const insets = useSafeAreaInsets();

  if (initializing) {
    return <SplashNewScreen />;
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isProfileComplete(user)) {
    return <Redirect href="/(onboarding)/profile" />;
  }

  const tabBarBottom = Platform.OS === 'web' ? 18 : Math.max(insets.bottom + 12, 18);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'rgba(226, 232, 240, 0.62)',
        tabBarActiveBackgroundColor: 'rgba(50, 224, 196, 0.12)',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: colors.bg,
          paddingBottom: TAB_SCENE_BOTTOM_SPACE,
        },
        tabBarStyle: {
          ...(Platform.OS === 'web' ? ({ position: 'fixed' } as object) : { position: 'absolute' }),
          left: TAB_BAR_SIDE_OFFSET,
          right: TAB_BAR_SIDE_OFFSET,
          bottom: tabBarBottom,
          height: TAB_BAR_HEIGHT,
          paddingTop: 8,
          paddingBottom: 10,
          paddingHorizontal: 8,
          backgroundColor: 'rgba(15, 23, 42, 0.86)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.18)',
          borderRadius: TAB_BAR_RADIUS,
          overflow: 'hidden',
          shadowColor: colors.slate,
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.26,
          shadowRadius: 28,
          elevation: 18,
          zIndex: 50,
        },
        tabBarItemStyle: {
          height: 54,
          minHeight: 54,
          borderRadius: 20,
          marginHorizontal: 2,
          paddingVertical: 4,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          lineHeight: 12,
          fontWeight: '900',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 1,
        },
        tabBarBackground: () => <View pointerEvents="none" style={styles.tabBarGlass} />,
      }}
      tabBar={(props) => <FigmaTabBar {...props} bottom={tabBarBottom} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="arena"
        options={{
          title: 'Arena',
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="logo-rss" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

function FigmaTabBar({ state, navigation, bottom }: { state: any; navigation: any; bottom: number }) {
  const routes = state.routes.filter((route: { name: string }) => TAB_LABELS[route.name]);

  return (
    <>
      <View style={[styles.customDock, { bottom }]}>
        <View pointerEvents="none" style={styles.dockTopHighlight} />
        <View pointerEvents="none" style={styles.dockSheen} />
        <View style={styles.dockItems}>
          {routes.map((route: { key: string; name: string }, index: number) => {
            const meta = TAB_LABELS[route.name];
            if (!meta) return null;
            const active = state.index === state.routes.findIndex((item: { key: string }) => item.key === route.key);

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={active ? { selected: true } : {}}
                onPress={() => navigation.navigate(route.name)}
                style={({ pressed }) => [
                  styles.dockItem,
                  active && styles.dockItemActive,
                  pressed && styles.dockItemPressed,
                  index === routes.length - 1 && styles.dockLastItem,
                ]}
              >
                {active ? <View pointerEvents="none" style={styles.dockActiveFill} /> : null}
                <Ionicons
                  name={meta.icon}
                  color={active ? colors.slate : 'rgba(186,202,197,0.88)'}
                  size={20}
                  style={styles.dockIcon}
                />
                {active ? <Text style={styles.dockLabel}>{meta.label}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: TAB_BAR_RADIUS,
  },
  customDock: {
    position: 'absolute',
    left: 12,
    right: 12,
    minHeight: 62,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(11,17,33,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 50,
    boxShadow: '0 12px 24px rgba(11,17,33,0.18)',
  },
  dockTopHighlight: {
    position: 'absolute',
    left: 32,
    right: 32,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  dockSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dockItems: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dockItem: {
    minWidth: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  dockItemActive: {
    paddingHorizontal: 14,
  },
  dockItemPressed: {
    opacity: 0.72,
  },
  dockLastItem: {},
  dockActiveFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  dockIcon: {
    zIndex: 1,
  },
  dockLabel: {
    zIndex: 1,
    color: colors.slate,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
