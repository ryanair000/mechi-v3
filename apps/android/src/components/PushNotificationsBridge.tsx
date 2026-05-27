import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { registerForPushNotificationsAsync, resolveNotificationRoute } from '../lib/push-notifications';

const AUTO_REGISTER_PUSH = process.env.EXPO_PUBLIC_MECHI_AUTO_REGISTER_PUSH === '1';

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const route = resolveNotificationRoute(data);

  if (route) {
    router.push(route as Parameters<typeof router.push>[0]);
  }
}

export function PushNotificationsBridge() {
  const { token, user } = useAuth();
  const lastRegistrationKey = useRef<string | null>(null);
  const lastHandledResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !user?.id) {
      lastRegistrationKey.current = null;
      return;
    }

    if (!AUTO_REGISTER_PUSH) {
      return;
    }

    const registrationKey = `${user.id}:${token}`;
    if (lastRegistrationKey.current === registrationKey) {
      return;
    }

    lastRegistrationKey.current = registrationKey;
    registerForPushNotificationsAsync().catch((error) => {
      console.warn('[PushNotificationsBridge] Registration failed:', error);
    });
  }, [token, user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let mounted = true;

    const openResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) {
        return;
      }

      const responseId = response.notification.request.identifier;
      if (lastHandledResponseId.current === responseId) {
        return;
      }

      lastHandledResponseId.current = responseId;
      handleNotificationResponse(response);
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (mounted) {
          openResponse(response);
        }
      })
      .catch((error) => {
        console.warn('[PushNotificationsBridge] Initial response failed:', error);
      });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(openResponse);

    return () => {
      mounted = false;
      responseSubscription.remove();
    };
  }, []);

  return null;
}
