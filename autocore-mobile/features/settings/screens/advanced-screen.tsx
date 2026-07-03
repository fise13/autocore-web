import { Alert, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useAuth } from '@/authentication/auth-provider';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { DESKTOP_DEMO } from '../data/demo-data';
import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { SettingsToggleRow } from '../components/settings-toggle-row';

export function AdvancedScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();

  const confirmDanger = (title: string, message: string) => {
    Alert.alert(title, message, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Подтвердить', style: 'destructive', onPress: () => haptics.warning() },
    ]);
  };

  return (
    <ProfileScreenShell title="Расширенные" subtitle="Данные, кэш и опасные операции">
      <ProfileMetaCard title="Данные" delay={60}>
        <ProfileMetaRow label="Экспорт" value="Excel · CSV · JSON" />
        <Button variant="secondary" onPress={() => haptics.light()}>
          Экспортировать данные
        </Button>
      </ProfileMetaCard>

      <ProfileMetaCard title="Подключение к компьютеру" delay={100}>
        <ProfileMetaRow label="Статус" value={DESKTOP_DEMO.connected ? 'Активно' : 'Не подключено'} />
        <ProfileMetaRow label="Устройство" value={DESKTOP_DEMO.deviceName} />
        <ProfileMetaRow label="Версия" value={DESKTOP_DEMO.appVersion} />
      </ProfileMetaCard>

      <ProfileMetaCard title="Производительность" delay={140}>
        <SettingsToggleRow
          label="Офлайн-кэш"
          subtitle="Справочники для работы без сети · 128 МБ"
          value
          onValueChange={() => {}}
        />
        <Button variant="secondary" onPress={() => haptics.light()}>
          Сбросить кэш
        </Button>
      </ProfileMetaCard>

      <ProfileMetaCard title="Разработчик" delay={180}>
        <ProfileMetaRow label="Среда" value="Production" />
        <ProfileMetaRow label="Версия" value="1.0.0 (build 240)" />
        <SettingsToggleRow
          label="Режим разработчика"
          subtitle="Диагностика и расширенные логи"
          value={false}
          onValueChange={() => {}}
        />
      </ProfileMetaCard>

      <ProfileMetaCard title="Опасная зона" delay={220}>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Эти действия необратимы. Убедитесь, что есть резервная копия.
        </Text>
        <View style={{ gap: 10 }}>
          <Button
            variant="secondary"
            onPress={() =>
              confirmDanger('Удалить бухгалтерию?', 'Все финансовые записи будут удалены.')
            }
          >
            Удалить бухгалтерию
          </Button>
          <Button
            variant="secondary"
            onPress={() => confirmDanger('Удалить склад?', 'Остатки и движения будут удалены.')}
          >
            Удалить склад
          </Button>
          <Button
            variant="secondary"
            onPress={() =>
              confirmDanger('Удалить компанию?', 'Компания и все данные будут удалены.')
            }
          >
            Удалить компанию
          </Button>
          <Button
            onPress={async () => {
              haptics.warning();
              await signOut();
            }}
            style={{ backgroundColor: colors.destructive }}
          >
            Выйти из аккаунта
          </Button>
        </View>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
