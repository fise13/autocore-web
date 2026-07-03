import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

import { ProfileMetaCard } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { SettingsToggleRow } from '../components/settings-toggle-row';

const BUSINESS_TOGGLES = [
  { key: 'orders' as const, title: 'Наряды', subtitle: 'Статусы, назначения и дедлайны' },
  { key: 'reservations' as const, title: 'Бронирования', subtitle: 'Новые записи и изменения слотов' },
  { key: 'warranty' as const, title: 'Гарантия', subtitle: 'Гарантийные случаи и продления' },
  { key: 'inventory' as const, title: 'Склад', subtitle: 'Низкие остатки и инвентаризация' },
  { key: 'payments' as const, title: 'Платежи', subtitle: 'Поступления и просрочки' },
  { key: 'invoices' as const, title: 'Счета', subtitle: 'Выставление и оплата счетов' },
  { key: 'team' as const, title: 'Команда', subtitle: 'Приглашения и изменения ролей' },
];

const DEMO_BUSINESS_PREFS = {
  orders: true,
  reservations: true,
  warranty: false,
  inventory: true,
  payments: true,
  invoices: true,
  team: true,
  emailEnabled: true,
};

export function NotificationsSettingsScreen() {
  const { preferences, loaded, updatePreference } = useNotificationPreferences();

  return (
    <ProfileScreenShell title="Уведомления" subtitle="Push, email и бизнес-события">
      <ProfileMetaCard title="Push-уведомления" delay={60}>
        {!loaded ? (
          <Text variant="caption" color="muted">
            Загрузка…
          </Text>
        ) : (
          <>
            <SettingsToggleRow
              label="Push на этом устройстве"
              subtitle="Разрешить уведомления от AutoCore"
              value={preferences.pushEnabled}
              onValueChange={(value) => void updatePreference('pushEnabled', value)}
            />
            <SettingsToggleRow
              label="Сканирование"
              subtitle="Результаты QR и быстрый приём"
              value={preferences.scanAlerts}
              onValueChange={(value) => void updatePreference('scanAlerts', value)}
            />
          </>
        )}
      </ProfileMetaCard>

      <ProfileMetaCard title="Бизнес-события" delay={100}>
        {BUSINESS_TOGGLES.map((item) => (
          <SettingsToggleRow
            key={item.key}
            label={item.title}
            subtitle={item.subtitle}
            value={DEMO_BUSINESS_PREFS[item.key]}
            onValueChange={() => {}}
          />
        ))}
      </ProfileMetaCard>

      <ProfileMetaCard title="Email" delay={140}>
        <SettingsToggleRow
          label="Email-уведомления"
          subtitle="Дублировать важные события на почту"
          value={DEMO_BUSINESS_PREFS.emailEnabled}
          onValueChange={() => {}}
        />
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Ежедневный дайджест отправляется в 09:00 по времени компании.
        </Text>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
