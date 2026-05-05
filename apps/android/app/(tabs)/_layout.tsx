import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingState, Screen } from '../../src/components/ui';
import { isProfileComplete, useAuth } from '../../src/auth/AuthProvider';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const { initializing, token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 34 : 0);

  if (initializing) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Opening PlayMechi" />
      </Screen>
    );
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isProfileComplete(user)) {
    return <Redirect href="/(onboarding)/profile" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: {
          backgroundColor: colors.bg,
        },
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopColor: colors.border,
          height: 64 + bottomInset,
          paddingBottom: bottomInset + 6,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          minHeight: 50,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '900',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          title: 'Register',
          tabBarIcon: ({ color, size }) => <Ionicons name="ticket" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="arena"
        options={{
          title: 'Desk',
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
