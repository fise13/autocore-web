import { memo, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { workOsColors } from '../tokens/colors';
import { workOsSpace, workOsElevation } from '../tokens/space';

export type StickyActionBarProps = {
  children: ReactNode;
  scheme?: 'light' | 'dark';
};

export const StickyActionBar = memo(function StickyActionBar({
  children,
  scheme = 'light',
}: StickyActionBarProps) {
  const colors = workOsColors(scheme);
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: Math.max(insets.bottom, workOsSpace.sm),
          paddingTop: workOsSpace.sm,
          paddingHorizontal: workOsSpace.screenX,
          backgroundColor: colors.elevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          gap: workOsSpace.sm,
        },
        workOsElevation.floating,
      ]}
    >
      {children}
    </View>
  );
});
