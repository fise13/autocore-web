import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

import { registerNotificationDevice } from '@/services/api/notification-api';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { getString, setString } from '@/lib/storage/kv';

const DEVICE_ID_KEY = 'autocore-mobile:push-device-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function resolveDeepLink(data: Record<string, unknown> | undefined): string | null {
  const deepLink = typeof data?.deepLink === 'string' ? data.deepLink.trim() : '';
  if (!deepLink) return null;
  if (deepLink.startsWith('autocoremobile://')) {
    const path = deepLink.replace('autocoremobile://', '');
    if (path.startsWith('orders/')) {
      return `/(tabs)/orders/${path.replace('orders/', '')}`;
    }
    if (path === 'orders') return '/(tabs)/orders';
    if (path.startsWith('profile/')) return `/(tabs)/profile/${path.replace('profile/', '')}`;
    if (path === 'scan') return '/(tabs)/scan';
    if (path.startsWith('accounting')) return '/(tabs)/accounting';
    if (path.startsWith('search')) return '/(tabs)/search';
    return '/(tabs)';
  }
  return deepLink;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'AutoCore',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function getStableDeviceId(): string {
  const existing = getString(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = `${Platform.OS}-${Date.now()}`;
  setString(DEVICE_ID_KEY, next);
  return next;
}

export function usePushNotifications(enabled: boolean) {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<Notifications.PermissionStatus | null>(null);
  const registeredRef = useRef(false);
  const { preferences } = useNotificationPreferences();

  useEffect(() => {
    if (!enabled || !preferences.channels.push) return;

    let cancelled = false;

    void (async () => {
      if (!Device.isDevice) return;
      await ensureAndroidChannel();

      const current = await Notifications.getPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (cancelled) return;
      setPermission(status);
      if (status !== 'granted') return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      if (cancelled) return;
      setPushToken(tokenResult.data);

      if (!registeredRef.current && tokenResult.data) {
        registeredRef.current = true;
        await registerNotificationDevice({
          deviceId: getStableDeviceId(),
          platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
          pushToken: tokenResult.data,
          appVersion: Constants.expoConfig?.version,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, preferences.channels.push]);

  useEffect(() => {
    const openFromResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const href = resolveDeepLink(response.notification.request.content.data as Record<string, unknown>);
      if (href) {
        router.push(href as never);
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    void Notifications.getLastNotificationResponseAsync().then(openFromResponse);

    return () => subscription.remove();
  }, []);

  return { pushToken, permission };
}
