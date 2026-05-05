import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { deletePushToken, registerPushToken } from '../api/mechi';

export const PUSH_NOTIFICATION_CHANNEL_ID = 'default';

const PUSH_TOKEN_KEY = 'mechi.expo_push_token';

export type PushRegistrationResult = {
  ok: boolean;
  message: string;
  token?: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

async function getStoredPushToken(): Promise<string | null> {
  if (canUseWebStorage()) {
    return window.localStorage.getItem(PUSH_TOKEN_KEY);
  }

  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

async function setStoredPushToken(token: string): Promise<void> {
  if (canUseWebStorage()) {
    window.localStorage.setItem(PUSH_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

async function clearStoredPushToken(): Promise<void> {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(PUSH_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

function getProjectId(): string | null {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;

  return typeof projectId === 'string' && projectId.trim() ? projectId : null;
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(PUSH_NOTIFICATION_CHANNEL_ID, {
    name: 'PlayMechi alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#32E0C4',
  });
}

function getDeviceLabel(): string | null {
  return Device.deviceName ?? Device.modelName ?? Device.osName ?? null;
}

export async function getPushNotificationStatusMessage(): Promise<string> {
  if (Platform.OS === 'web') {
    return 'App notifications are available on Android builds.';
  }

  if (!Device.isDevice) {
    return 'Use a physical Android device to receive push notifications.';
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status === 'granted') {
    return 'App notifications are enabled on this device.';
  }

  if (!permissions.canAskAgain) {
    return 'Notifications are blocked in Android settings.';
  }

  return 'App notifications are ready to enable.';
}

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return {
      ok: false,
      message: 'App notifications are available on Android builds.',
    };
  }

  await ensureAndroidNotificationChannel();

  if (!Device.isDevice) {
    return {
      ok: false,
      message: 'Use a physical Android device to receive push notifications.',
    };
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (existingPermission.status !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== 'granted') {
    return {
      ok: false,
      message: 'Notifications were not enabled for this device.',
    };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return {
      ok: false,
      message: 'Expo project ID is missing from the Android app config.',
    };
  }

  const expoPushToken = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  await registerPushToken({
    token: expoPushToken,
    platform: Platform.OS,
    device_name: getDeviceLabel(),
    app_version: Constants.expoConfig?.version ?? null,
    experience_id: Constants.expoConfig?.slug ?? null,
  });
  await setStoredPushToken(expoPushToken);

  return {
    ok: true,
    message: 'App notifications are enabled on this device.',
    token: expoPushToken,
  };
}

function readRouteValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function resolveNotificationRoute(data: Record<string, unknown> | undefined): string | null {
  const target =
    readRouteValue(data?.mobileRoute) ?? readRouteValue(data?.href) ?? readRouteValue(data?.url);

  if (!target) {
    return null;
  }

  if (target.startsWith('/(tabs)/')) {
    return target;
  }

  if (target.startsWith('/match/') || target.startsWith('/matches') || target.startsWith('/inbox')) {
    return '/(tabs)/arena';
  }

  if (target.startsWith('/profile') || target.startsWith('/notifications')) {
    return '/(tabs)/profile';
  }

  return '/(tabs)/index';
}

export async function unregisterStoredPushToken(): Promise<void> {
  const token = await getStoredPushToken();
  if (!token) {
    return;
  }

  try {
    await deletePushToken(token);
  } finally {
    await clearStoredPushToken();
  }
}
