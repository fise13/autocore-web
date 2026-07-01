import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useDesignLanguage } from '@/hooks';

export default function NotFoundScreen() {
  const dl = useDesignLanguage();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: dl.layout.cardPadding,
          backgroundColor: dl.colors.background,
          gap: dl.layout.stackGap,
        }}
      >
        <Text variant="title">Screen not found</Text>
        <Text variant="body" color="muted">
          This route does not exist in Autocore Mobile.
        </Text>
        <Link href="/" asChild>
          <Button>Go home</Button>
        </Link>
      </View>
    </>
  );
}
