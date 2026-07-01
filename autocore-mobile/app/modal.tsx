import { View } from 'react-native';
import { Stack } from 'expo-router';

import { Text } from '@/components/ui';
import { useDesignLanguage } from '@/hooks';

export default function ModalScreen() {
  const dl = useDesignLanguage();

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', title: 'Modal' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dl.colors.background,
          padding: dl.layout.cardPadding,
        }}
      >
        <Text variant="title">Modal placeholder</Text>
      </View>
    </>
  );
}
