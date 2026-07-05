import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text } from '@/components/ui';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  QUIET_HOUR_OPTIONS,
} from '@/types/notifications';
import { useNotificationInbox } from '@/hooks/use-notification-inbox';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

import { ProfileMetaCard } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { SettingsToggleRow } from '../components/settings-toggle-row';

const CATEGORY_HINTS: Record<(typeof NOTIFICATION_CATEGORIES)[number], string> = {
  work_orders: 'Статусы, назначения и дедлайны',
  reservations: 'Бронирования моторов и слотов',
  warranty: 'Гарантийные случаи и продления',
  inventory: 'Низкие остатки и импорт',
  payments: 'Поступления и просрочки',
  invoices: 'Выставление и оплата счетов',
  team: 'Приглашения и изменения ролей',
  scan: 'Результаты сканирования',
  sales: 'Крупные продажи и итоги дня',
  system: 'Подписка, синхронизация и ошибки',
};

export function NotificationsSettingsScreen() {
  const { preferences, loaded, syncing, error, updateChannel, updateCategory, updateQuietHours, updateEmailDigest } =
    useNotificationPreferences();
  const { unreadCount } = useNotificationInbox('active');

  return (
    <ProfileScreenShell
      title="Уведомления"
      subtitle="Каналы, категории и тихие часы"
    >
      <ProfileMetaCard title="Центр уведомлений" delay={40}>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => router.push('/(tabs)/profile/inbox' as never)}
        >
          {unreadCount > 0 ? `Открыть inbox · ${unreadCount}` : 'Открыть inbox'}
        </Button>
      </ProfileMetaCard>

      <ProfileMetaCard title="Каналы доставки" delay={60}>
        {!loaded ? (
          <Text variant="caption" color="muted">
            Загрузка…
          </Text>
        ) : (
          <>
            <SettingsToggleRow
              label="Push на этом устройстве"
              subtitle="Мгновенные уведомления (критичные — даже в тихие часы)"
              value={preferences.channels.push}
              onValueChange={(value) => void updateChannel('push', value)}
            />
            <SettingsToggleRow
              label="Inbox в приложении"
              subtitle="История и центр уведомлений"
              value={preferences.channels.inbox}
              onValueChange={(value) => void updateChannel('inbox', value)}
            />
            <SettingsToggleRow
              label="Email"
              subtitle="Дублировать важные события на почту (скоро)"
              value={preferences.channels.email}
              onValueChange={(value) => void updateChannel('email', value)}
            />
          </>
        )}
      </ProfileMetaCard>

      <ProfileMetaCard title="Категории событий" delay={100}>
        {NOTIFICATION_CATEGORIES.map((category) => (
          <SettingsToggleRow
            key={category}
            label={NOTIFICATION_CATEGORY_LABELS[category]}
            subtitle={CATEGORY_HINTS[category]}
            value={preferences.categories[category]}
            onValueChange={(value) => void updateCategory(category, value)}
          />
        ))}
      </ProfileMetaCard>

      <ProfileMetaCard title="Тихие часы" delay={140}>
        <SettingsToggleRow
          label="Тихий режим"
          subtitle="Push отключается, кроме критичных событий"
          value={preferences.quietHours.enabled}
          onValueChange={(value) => void updateQuietHours({ enabled: value })}
        />
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          С {preferences.quietHours.startHour}:00 до {preferences.quietHours.endHour}:00 (
          {preferences.quietHours.timezone})
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {QUIET_HOUR_OPTIONS.map((hour) => (
            <Button
              key={`start-${hour}`}
              size="sm"
              variant={preferences.quietHours.startHour === hour ? 'default' : 'secondary'}
              onPress={() => void updateQuietHours({ startHour: hour })}
            >
              Начало {hour}:00
            </Button>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {QUIET_HOUR_OPTIONS.map((hour) => (
            <Button
              key={`end-${hour}`}
              size="sm"
              variant={preferences.quietHours.endHour === hour ? 'default' : 'secondary'}
              onPress={() => void updateQuietHours({ endHour: hour })}
            >
              Конец {hour}:00
            </Button>
          ))}
        </View>
      </ProfileMetaCard>

      <ProfileMetaCard title="Email-дайджест" delay={180}>
        <SettingsToggleRow
          label="Ежедневный дайджест"
          subtitle="Сводка в 09:00 по времени компании (скоро)"
          value={preferences.emailDigestEnabled}
          onValueChange={(value) => void updateEmailDigest(value)}
        />
      </ProfileMetaCard>

      {syncing ? (
        <Text variant="caption" color="muted">
          Синхронизация…
        </Text>
      ) : null}
      {error ? (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      ) : null}
    </ProfileScreenShell>
  );
}
