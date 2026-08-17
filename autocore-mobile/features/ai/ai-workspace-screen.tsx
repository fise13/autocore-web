import { View } from 'react-native';

import { ProductScreenShell } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

/** Stub — full AI workspace is parked. */
export function AiWorkspaceScreen() {
  const { colors } = useTheme();

  return (
    <ProductScreenShell animateEnter={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: 44,
            fontWeight: '600',
            letterSpacing: -1,
            color: colors.mutedForeground,
          }}
        >
          #
        </Text>
      </View>
    </ProductScreenShell>
  );
}
