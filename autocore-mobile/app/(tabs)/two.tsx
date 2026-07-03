import { ScrollView, View } from 'react-native';

import { Card, CardContent, Text, TopBar } from '@/components/ui';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';

export default function SettingsPlaceholder() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title="Настройки" subtitle="Временный экран без авторизации" />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}>
        <Card>
          <CardContent>
            <View style={{ gap: spacing[2] }}>
              <Text variant="body">Firebase-логин временно отключён.</Text>
              <Text variant="body">Следующий этап: строить экраны и данные приложения локально.</Text>
              <Text variant="caption" color="muted">
                Когда понадобится, auth flow можно будет вернуть обратно.
              </Text>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}
