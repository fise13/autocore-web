import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks';
import { useFloatingTabBarInset } from '@/hooks/use-floating-tab-bar-inset';
import { spacing } from '@/theme';

type ScreenActionFooterProps = {
  children: ReactNode;
  horizontalPadding?: number;
  /** Pin above the floating tab bar instead of the screen bottom edge. */
  absolute?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ScreenActionFooter({
  children,
  horizontalPadding = spacing[5],
  absolute = false,
  style,
}: ScreenActionFooterProps) {
  const { colors } = useTheme();
  const { footerBottom } = useFloatingTabBarInset();

  return (
    <View
      style={[
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: 12,
          paddingBottom: absolute ? 0 : footerBottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          flexDirection: 'row',
          gap: 10,
        },
        absolute
          ? {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: footerBottom,
            }
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
