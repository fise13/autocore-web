import { ScrollView, View } from 'react-native';

import { Text, TopBar, Card, CardContent, Switch } from '@/components/ui';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';
import { useState } from 'react';

export default function SettingsPlaceholder() {
  const { colors, scheme } = useTheme();
  const [darkMode, setDarkMode] = useState(scheme === 'dark');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title="Settings" subtitle="Placeholder — screens come next" />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}>
        <Card>
          <CardContent>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body">Dark mode (system)</Text>
              <Switch value={darkMode} onValueChange={setDarkMode} />
            </View>
            <Text variant="caption" color="muted" style={{ marginTop: spacing[2] }}>
              Theme follows system preference. Forced theme provider coming in screen migration.
            </Text>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}
