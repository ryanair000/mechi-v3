import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { LoadingState, Screen } from '../../src/components/ui';
import { isProfileComplete, useAuth } from '../../src/auth/AuthProvider';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const { initializing, token, user } = useAuth();

  if (initializing) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Opening Mechi" />
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
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopColor: colors.border,
          minHeight: 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: 'Play',
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaders',
          tabBarIcon: ({ color, size }) => <Ionicons name="podium" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
