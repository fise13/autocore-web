import { useState } from 'react';
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
import {
  APP_CATEGORY_LABELS,
  APP_NOTIFICATION_CATEGORIES,
  NotificationService,
  type AppNotificationCategory,
} from '@/services/notifications';
import { useNotificationStore } from '@/stores/notification-store';

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

const EXTENDED_CATEGORY_HINTS: Record<AppNotificationCategory, string> = {
  order: 'Назначения, статусы, комментарии',
  inventory: 'Остатки, резервы, склад',
  finance: 'Платежи, счета, выручка',
  subscription: 'Продление, истечение, оплата',
  import: 'Импорт данных и прогресс',
  export: 'Экспорт отчётов и документов',
  documents: 'PDF, гарантии, загрузки',
  team: 'Приглашения и роли',
  sync: 'Синхронизация (без push)',
  system: 'Обновления и сервисные события',
  ai: 'AI-задачи и распознавание',
  security: 'Безопасность и доступ',
};

export function NotificationsSettingsScreen() {
  const { preferences, loaded, syncing, error, updateChannel, updateCategory, updateQuietHours, updateEmailDigest } =
    useNotificationPreferences();
  const { unreadCount } = useNotificationInbox('active');
  const [expandedCategory, setExpandedCategory] = useState<AppNotificationCategory | null>(null);
  const extendedPrefs = useNotificationStore((s) => s.extendedPrefs);

  const toggleExtendedChannel = (
    category: AppNotificationCategory,
    channel: 'push' | 'inApp' | 'activityFeed',
    value: boolean,
  ) => {
    NotificationService.updateCategoryChannels(category, { [channel]: value });
    setExpandedCategory(category);
  };

  return (
    <ProfileScreenShell
      title="Уведомления"
      subtitle="Каналы, категории и тихие часы"
    >
      <ProfileMetaCard title="Центр активности" delay={40}>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => router.push('/(tabs)/profile/inbox' as never)}
        >
          {unreadCount > 0 ? `Открыть · ${unreadCount} новых` : 'Открыть центр активности'}
        </Button>
      </ProfileMetaCard>

      <ProfileMetaCard title="Глобальные каналы" delay={60}>
        {!loaded ? (
          <Text variant="caption" color="muted">
            Загрузка…
          </Text>
        ) : (
          <>
            <SettingsToggleRow
              label="Push"
              subtitle="Мгновенные уведомления (критичные — даже в тихие часы)"
              value={preferences.channels.push}
              onValueChange={(value) => void updateChannel('push', value)}
            />
            <SettingsToggleRow
              label="In-App"
              subtitle="Баннеры при открытом приложении"
              value={preferences.channels.inApp ?? true}
              onValueChange={(value) => void updateChannel('inApp', value)}
            />
            <SettingsToggleRow
              label="Лента активности"
              subtitle="История в центре уведомлений"
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

      <ProfileMetaCard title="Категории (сервер)" delay={100}>
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

      <ProfileMetaCard title="Каналы по категориям" delay={120}>
        <Text variant="caption" color="muted" style={{ marginBottom: 8, lineHeight: 18 }}>
          Тонкая настройка push, in-app и ленты для каждой категории
        </Text>
        {APP_NOTIFICATION_CATEGORIES.map((category) => (
          <View key={category} style={{ marginBottom: 12 }}>
            <SettingsToggleRow
              label={APP_CATEGORY_LABELS[category]}
              subtitle={EXTENDED_CATEGORY_HINTS[category]}
              value={
                extendedPrefs[category].push ||
                extendedPrefs[category].inApp ||
                extendedPrefs[category].activityFeed
              }
              onValueChange={(value) => {
                NotificationService.updateCategoryChannels(category, {
                  push: value,
                  inApp: value,
                  activityFeed: value,
                });
                setExpandedCategory(value ? category : null);
              }}
            />
            {expandedCategory === category || extendedPrefs[category].push ? (
              <View style={{ paddingLeft: 8, gap: 4 }}>
                <SettingsToggleRow
                  label="Push"
                  value={extendedPrefs[category].push}
                  onValueChange={(v) => toggleExtendedChannel(category, 'push', v)}
                />
                <SettingsToggleRow
                  label="In-App"
                  value={extendedPrefs[category].inApp}
                  onValueChange={(v) => toggleExtendedChannel(category, 'inApp', v)}
                />
                <SettingsToggleRow
                  label="Лента"
                  value={extendedPrefs[category].activityFeed}
                  onValueChange={(v) => toggleExtendedChannel(category, 'activityFeed', v)}
                />
              </View>
            ) : null}
          </View>
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
              {`Начало ${hour}:00`}
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
              {`Конец ${hour}:00`}
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
