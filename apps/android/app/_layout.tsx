import 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../src/lib/sentry';
import { AuthProvider } from '../src/auth/AuthProvider';
import { ToastProvider, p } from '../src/ui/production-ui';
import { PushNotificationsBridge } from '../src/components/PushNotificationsBridge';
import { NotificationsProvider } from '../src/data/notifications-context';

function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 20_000,
          },
        },
      })
  );

  useEffect(() => {
    if (Platform.OS === 'android') {
      void NavigationBar.setButtonStyleAsync('light').catch(() => {});
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: p.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NotificationsProvider>
              <ToastProvider>
                <PushNotificationsBridge />
                <StatusBar style="light" backgroundColor={p.bg} />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: p.bg },
                  }}
                />
              </ToastProvider>
            </NotificationsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
