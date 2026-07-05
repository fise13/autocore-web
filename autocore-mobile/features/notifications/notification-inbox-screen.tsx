import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { BellIcon } from '@/assets/icons';
import { NotificationCard } from '@/components/business/notification-card';
import { Button, EmptyState, Text } from '@/components/ui';
import { useNotificationInbox } from '@/hooks/use-notification-inbox';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import type { NotificationRecord } from '@/types/notifications';

function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ru });
  } catch {
    return '';
  }
}

function openDeepLink(deepLink?: string) {
  if (!deepLink) return;
  if (deepLink.startsWith('autocoremobile://')) {
    const path = deepLink.replace('autocoremobile://', '');
    if (path.startsWith('orders/')) {
      router.push(`/(tabs)/orders/${path.replace('orders/', '')}` as never);
      return;
    }
    if (path === 'orders') {
      router.push('/(tabs)/orders' as never);
      return;
    }
    if (path.startsWith('profile/')) {
      router.push(`/(tabs)/profile/${path.replace('profile/', '')}` as never);
      return;
    }
    if (path === 'scan') {
      router.push('/(tabs)/scan' as never);
      return;
    }
    if (path.startsWith('accounting')) {
      router.push('/(tabs)/accounting' as never);
      return;
    }
    if (path.startsWith('search')) {
      router.push('/(tabs)/search' as never);
      return;
    }
    router.push('/(tabs)' as never);
    return;
  }
  void Linking.openURL(deepLink);
}

export function NotificationInboxScreen() {
  const { items, unreadCount, loading, error, refresh, markRead, markAllRead } =
    useNotificationInbox('active');

  const handlePress = useCallback(
    async (item: NotificationRecord) => {
      if (item.state === 'unread') {
        await markRead(item.id);
      }
      openDeepLink(item.deepLink);
    },
    [markRead],
  );

  return (
    <ProfileScreenShell
      title="Центр уведомлений"
      subtitle={unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все прочитано'}
    >
      <View style={{ gap: 12 }}>
        {unreadCount > 0 ? (
          <Button variant="secondary" size="sm" onPress={() => void markAllRead()}>
            Отметить все прочитанными
          </Button>
        ) : null}

        {loading && items.length === 0 ? (
          <Text variant="caption" color="muted">
            Загрузка…
          </Text>
        ) : null}

        {error ? (
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        ) : null}

        {!loading && items.length === 0 && !error ? (
          <EmptyState
            icon={BellIcon}
            title="Нет уведомлений"
            description="Здесь появятся важные события по нарядам, складу и команде."
            primaryAction={{ label: 'Обновить', onPress: () => void refresh() }}
          />
        ) : null}

        {items.map((item) => (
          <Pressable key={item.id} onPress={() => void handlePress(item)}>
            <NotificationCard
              title={item.title}
              body={item.body}
              time={formatRelativeTime(item.createdAt)}
              read={item.state !== 'unread'}
              priority={item.priority}
            />
          </Pressable>
        ))}
      </View>
    </ProfileScreenShell>
  );
}
