import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isProfileComplete, useAuth } from '../../src/auth/AuthProvider';
import { SplashScreen } from '../../src/screens/auth';
import { p } from '../../src/ui/production-ui';

const tabs: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Home', icon: 'home-outline' },
  arena: { label: 'Arena', icon: 'trophy-outline' },
  feed: { label: 'Matches', icon: 'flash-outline' },
  community: { label: 'Blog', icon: 'newspaper-outline' },
  profile: { label: 'Profile', icon: 'person-outline' },
};

export default function TabsLayout() {
  const { initializing, token, user } = useAuth();
  const insets = useSafeAreaInsets();

  if (initializing) return <SplashScreen />;
  if (!token) return <Redirect href="/(auth)/login" />;
  if (!isProfileComplete(user)) return <Redirect href="/(onboarding)/profile" />;

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: p.bg },
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => <Dock {...props} bottom={Math.max(insets.bottom + 8, 12)} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="arena" options={{ title: 'Arena' }} />
      <Tabs.Screen name="feed" options={{ title: 'Matches' }} />
      <Tabs.Screen name="community" options={{ title: 'Blog' }} />
      <Tabs.Screen name="register" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

function Dock({ state, navigation, bottom }: { state: any; navigation: any; bottom: number }) {
  const visibleRoutes = state.routes.filter((route: { name: string }) => tabs[route.name]);

  return (
    <View pointerEvents="box-none" style={[styles.dockWrap, { bottom }]}>
      <View style={styles.dock}>
        {visibleRoutes.map((route: { key: string; name: string }) => {
          const active = state.index === state.routes.findIndex((item: { key: string }) => item.key === route.key);
          const meta = tabs[route.name];
          if (!meta) return null;
          return (
            <Pressable key={route.key} onPress={() => navigation.navigate(route.name)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={[styles.activeLine, active && styles.activeLineOn]} />
              <Ionicons name={meta.icon} color={active ? p.teal : p.faint} size={21} />
              <Text style={[styles.label, active && styles.labelOn]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 50,
  },
  dock: {
    minHeight: 64,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: p.lineStrong,
    backgroundColor: 'rgba(9,15,25,0.86)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  item: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  pressed: {
    opacity: 0.76,
  },
  activeLine: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  activeLineOn: {
    backgroundColor: p.teal,
  },
  label: {
    color: p.faint,
    fontSize: 10,
    fontWeight: '800',
  },
  labelOn: {
    color: p.text,
  },
});
