import { Alert, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { haptics, rhythm } from '@/theme';

import { DESKTOP_DEMO } from '../data/demo-data';
import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function AdvancedScreen() {
  const confirmDanger = (title: string, message: string) => {
    Alert.alert(title, message, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Подтвердить', style: 'destructive', onPress: () => haptics.warning() },
    ]);
  };

  return (
    <ProfileScreenShell title="Расширенные" subtitle="Экспорт, синхронизация и очистка данных">
      <ProfileMetaCard title="Экспорт">
        <ProfileMetaRow label="Форматы" value="Excel · CSV · JSON" />
        <View style={{ paddingTop: rhythm.inline }}>
          <Button variant="secondary" onPress={() => haptics.selection()}>
            Экспортировать данные
          </Button>
        </View>
      </ProfileMetaCard>

      <ProfileMetaCard title="Подключение к компьютеру">
        <ProfileMetaRow label="Статус" value={DESKTOP_DEMO.connected ? 'Активно' : 'Не подключено'} />
        <ProfileMetaRow label="Устройство" value={DESKTOP_DEMO.deviceName} />
        <ProfileMetaRow label="Версия" value={DESKTOP_DEMO.appVersion} />
      </ProfileMetaCard>

      <ProfileMetaCard title="Очистка данных" tone="danger">
        <Text variant="caption" color="muted" style={{ lineHeight: 18, marginBottom: rhythm.inline }}>
          Удаление модулей компании необратимо. Используйте только при полной переинициализации.
        </Text>
        <View style={{ gap: rhythm.inline }}>
          <Button
            variant="secondary"
            onPress={() => confirmDanger('Удалить бухгалтерию?', 'Все финансовые записи будут удалены.')}
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
            onPress={() => confirmDanger('Удалить компанию?', 'Компания и все данные будут удалены.')}
          >
            Удалить компанию
          </Button>
        </View>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
