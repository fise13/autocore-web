import type { ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks';
import { useFloatingTabBarInset } from '@/hooks/use-floating-tab-bar-inset';
import { useRegisterAutocompleteChromeInset } from '@/providers/autocomplete-provider';
import { spacing } from '@/theme';

type ScreenActionFooterProps = {
  children: ReactNode;
  horizontalPadding?: number;
  /** Pin above the floating tab bar instead of the screen bottom edge. */
  absolute?: boolean;
  /**
   * Reserve space for the floating tab bar.
   * Set false on modal screens (create order, new operation, etc.) — otherwise
   * the oversized footer pad sits on top of the software keyboard.
   */
  aboveTabBar?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ScreenActionFooter({
  children,
  horizontalPadding = spacing[5],
  absolute = false,
  aboveTabBar = true,
  style,
}: ScreenActionFooterProps) {
  const { colors } = useTheme();
  const { footerBottom, safeBottom } = useFloatingTabBarInset();
  const updateChromeInset = useRegisterAutocompleteChromeInset();
  const bottomInset = aboveTabBar ? footerBottom : safeBottom;

  const handleLayout = (event: LayoutChangeEvent) => {
    updateChromeInset(event.nativeEvent.layout.height);
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: 12,
          paddingBottom: absolute ? 0 : bottomInset,
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
              bottom: bottomInset,
            }
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
