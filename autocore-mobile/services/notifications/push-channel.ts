import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerNotificationDevice } from '@/services/api/notification-api';
import { getString, setString } from '@/lib/storage/kv';

import { openNotificationDeepLink } from './deep-link-resolver';

const DEVICE_ID_KEY = 'autocore-mobile:push-device-id';

let handlerInstalled = false;

export function ensureNotificationHandler(): void {
  if (handlerInstalled) return;
  handlerInstalled = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'AutoCore',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync('critical', {
    name: 'Критичные',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
  });
  await Notifications.setNotificationChannelAsync('silent', {
    name: 'Тихие',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0],
  });
}

function getStableDeviceId(): string {
  const existing = getString(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = `${Platform.OS}-${Date.now()}`;
  setString(DEVICE_ID_KEY, next);
  return next;
}

export type PushSetupResult = {
  token: string | null;
  permission: Notifications.PermissionStatus | null;
};

export async function setupPushToken(): Promise<PushSetupResult> {
  if (!Device.isDevice) {
    return { token: null, permission: null };
  }

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    return { token: null, permission: status };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  const tokenResult = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  return { token: tokenResult.data, permission: status };
}

export async function registerPushDevice(pushToken: string): Promise<void> {
  await registerNotificationDevice({
    deviceId: getStableDeviceId(),
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    pushToken,
    appVersion: Constants.expoConfig?.version,
  });
}

export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Badge not supported on all platforms
  }
}

export async function scheduleLocalNotification(options: {
  id?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
}): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    identifier: options.id,
    content: {
      title: options.title,
      body: options.body,
      data: options.data,
      sound: options.channelId !== 'silent',
    },
    trigger: null,
  });
  return id;
}

export async function cancelLocalNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export type PushTapHandler = (data: Record<string, unknown> | undefined) => void;

export function attachPushListeners(onTap?: PushTapHandler): () => void {
  const openFromResponse = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    const data = response.notification.request.content.data as Record<string, unknown>;
    if (onTap) {
      onTap(data);
      return;
    }
    const deepLink = typeof data?.deepLink === 'string' ? data.deepLink : undefined;
    void openNotificationDeepLink(deepLink);
  };

  const responseSub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
  void Notifications.getLastNotificationResponseAsync().then(openFromResponse);

  return () => responseSub.remove();
}

export type ForegroundPushHandler = (notification: Notifications.Notification) => void;

export function attachForegroundListener(handler: ForegroundPushHandler): () => void {
  const sub = Notifications.addNotificationReceivedListener(handler);
  return () => sub.remove();
}
