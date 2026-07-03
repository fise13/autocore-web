import { ScrollView, View } from 'react-native';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Text, TopBar } from '@/components/ui';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';

type TabScreenPlaceholderProps = {
  title: string;
  subtitle: string;
  cardTitle: string;
  cardDescription: string;
};

export function TabScreenPlaceholder({
  title,
  subtitle,
  cardTitle,
  cardDescription,
}: TabScreenPlaceholderProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title={title} subtitle={subtitle} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] }}>
        <Card>
          <CardHeader>
            <CardTitle>{cardTitle}</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Text variant="caption" color="muted">
              Временная заглушка для локальной разработки.
            </Text>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}
