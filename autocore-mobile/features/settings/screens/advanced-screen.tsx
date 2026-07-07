import { View } from 'react-native';

import { Button, Text, toast } from '@/components/ui';
import { haptics, rhythm } from '@/theme';

import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function AdvancedScreen() {
  const notifyComingSoon = (feature: string) => {
    haptics.selection();
    toast({ title: `${feature} скоро`, description: 'Функция появится в следующих обновлениях.' });
  };

  return (
    <ProfileScreenShell title="Расширенные" subtitle="Экспорт, синхронизация и очистка данных">
      <ProfileMetaCard title="Экспорт">
        <ProfileMetaRow label="Форматы" value="Excel · CSV · JSON" />
        <View style={{ paddingTop: rhythm.inline }}>
          <Button variant="secondary" onPress={() => notifyComingSoon('Экспорт')}>
            Экспортировать данные
          </Button>
        </View>
      </ProfileMetaCard>

      <ProfileMetaCard title="Подключение к компьютеру">
        <ProfileMetaRow label="Статус" value="Не подключено" />
        <Text variant="caption" color="muted" style={{ lineHeight: 18, marginTop: rhythm.inline }}>
          AutoCore Desktop пока не синхронизируется с мобильным приложением. Используйте веб-версию
          для полного управления данными компании.
        </Text>
      </ProfileMetaCard>

      <ProfileMetaCard title="Очистка данных" tone="danger">
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Удаление модулей компании доступно только в веб-версии AutoCore. Это защищает от
          случайной потери данных на мобильном устройстве.
        </Text>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
