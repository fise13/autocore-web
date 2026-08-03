import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

type StickyActionBarProps = {
  children: ReactNode;
};

/**
 * Sticky bottom action bar — quiet hairline chrome (DL v3).
 * Pads home-indicator safe area so CTAs clear the system edge.
 * No ornamental blur.
 */
export function StickyActionBar({ children }: StickyActionBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, tokens.space[2]) + tokens.space.stack;

  return (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: tokens.space.stack,
          paddingHorizontal: tokens.space.screenX,
          paddingTop: tokens.space.stack,
          paddingBottom: bottomPad,
        }}
      >
        {children}
      </View>
    </View>
  );
}
