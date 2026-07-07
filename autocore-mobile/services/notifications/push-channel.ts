import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';

import { registerNotificationDevice } from '@/services/api/notification-api';
import { MobileApiError } from '@/services/api/mobile-client';
import { getFirebaseAuth, getFirebaseDb } from '@/services/firebase';
import { getString, setString } from '@/lib/storage/kv';

import { openNotificationDeepLink } from './deep-link-resolver';

const DEVICE_ID_KEY = 'autocore-mobile:push-device-id';

let handlerInstalled = false;
let registeredToken: string | null = null;
let pushRegistrationPromise: Promise<void> | null = null;

function resolveExpoProjectId(): string | undefined {
  const fromConfig =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  return fromConfig || fromEnv || undefined;
}

function logPushIssue(message: string, error?: unknown): void {
  if (__DEV__) {
    console.warn(`[push] ${message}`, error ?? '');
    return;
  }
  console.error(`[push] ${message}`, error instanceof Error ? error.message : error ?? '');
}

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

function resolveExpoExperienceId(): string | null {
  const owner = Constants.expoConfig?.owner?.trim();
  const slug = Constants.expoConfig?.slug?.trim() || 'autocore-mobile';
  if (!owner) return null;
  return `@${owner}/${slug}`;
}

function getNativePushType(): 'apns' | 'fcm' {
  return Platform.OS === 'ios' ? 'apns' : 'fcm';
}

function serializeDeviceToken(data: string | Record<string, unknown>): string {
  return typeof data === 'string' ? data : JSON.stringify(data);
}

async function shouldUseDevelopmentPushService(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const env = await Application.getIosPushNotificationServiceEnvironmentAsync();
    return env === 'development';
  } catch {
    return false;
  }
}

async function fetchExpoPushTokenViaExperienceId(): Promise<string> {
  const experienceId = resolveExpoExperienceId();
  if (!experienceId) {
    throw new Error('EAS projectId missing and no expo owner configured');
  }

  const devicePushToken = await Notifications.getDevicePushTokenAsync();
  const applicationId = Application.applicationId;
  if (!applicationId) {
    throw new Error('No applicationId for push registration');
  }

  const response = await fetch('https://exp.host/--/api/v2/push/getExpoPushToken', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: getNativePushType(),
      deviceId: getStableDeviceId().toLowerCase(),
      development: await shouldUseDevelopmentPushService(),
      appId: applicationId,
      deviceToken: serializeDeviceToken(devicePushToken.data),
      experienceId,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Expo push token request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    data?: { expoPushToken?: string };
    errors?: Array<{ message?: string }>;
  };

  const token = payload.data?.expoPushToken;
  if (!token) {
    const message = payload.errors?.map((item) => item.message).filter(Boolean).join('; ');
    throw new Error(message || 'Expo push token missing in response');
  }

  return token;
}

async function fetchExpoPushToken(): Promise<string> {
  const projectId = resolveExpoProjectId();
  if (projectId) {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResult.data;
  }

  return fetchExpoPushTokenViaExperienceId();
}

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

  try {
    const token = await fetchExpoPushToken();
    return { token, permission: status };
  } catch (error) {
    logPushIssue('getExpoPushTokenAsync failed', error);
    return { token: null, permission: status };
  }
}

export async function ensurePushDeviceRegistered(pushEnabled = true): Promise<void> {
  if (!pushEnabled || !Device.isDevice) return;

  if (pushRegistrationPromise) {
    await pushRegistrationPromise;
    return;
  }

  pushRegistrationPromise = (async () => {
    const { token, permission } = await setupPushToken();
    if (permission !== 'granted') {
      if (permission === 'denied') {
        logPushIssue('notification permission denied');
      }
      return;
    }
    if (!token) return;
    if (token === registeredToken) return;

    await registerPushDevice(token);
    registeredToken = token;
    if (__DEV__) {
      console.log('[push] device registered', token.slice(0, 28));
    }
  })();

  try {
    await pushRegistrationPromise;
  } catch (error) {
    logPushIssue('device registration failed', error);
  } finally {
    pushRegistrationPromise = null;
  }
}

export function resetPushRegistrationState(): void {
  registeredToken = null;
  pushRegistrationPromise = null;
}

export async function registerPushDevice(pushToken: string): Promise<void> {
  const deviceId = getStableDeviceId();
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const appVersion = Constants.expoConfig?.version;

  try {
    await registerNotificationDevice({
      deviceId,
      platform,
      pushToken,
      appVersion,
    });
    return;
  } catch (apiError) {
    if (apiError instanceof MobileApiError && (apiError.status === 401 || apiError.status === 403)) {
      throw apiError;
    }
    logPushIssue('API register failed, falling back to Firestore', apiError);
  }

  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error('Требуется авторизация для push-уведомлений');
  }

  await setDoc(
    doc(getFirebaseDb(), 'users', uid, 'devices', deviceId),
    {
      id: deviceId,
      platform,
      pushToken,
      ...(appVersion ? { appVersion } : {}),
      lastSeenAt: new Date().toISOString(),
    },
    { merge: true },
  );
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
