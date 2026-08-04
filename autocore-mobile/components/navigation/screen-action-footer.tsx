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
  /**
   * `default` — filled bar + top border (StickyActionBar language).
   * `plain` — transparent, hairline or no border — tab-continuation strips.
   */
  chrome?: 'default' | 'plain';
  style?: StyleProp<ViewStyle>;
};

export function ScreenActionFooter({
  children,
  horizontalPadding = spacing[5],
  absolute = false,
  aboveTabBar = true,
  chrome = 'default',
  style,
}: ScreenActionFooterProps) {
  const { colors } = useTheme();
  const { footerBottom, safeBottom } = useFloatingTabBarInset();
  const updateChromeInset = useRegisterAutocompleteChromeInset();
  const bottomInset = aboveTabBar ? footerBottom : safeBottom;
  const isPlain = chrome === 'plain';

  const handleLayout = (event: LayoutChangeEvent) => {
    updateChromeInset(event.nativeEvent.layout.height);
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: isPlain ? spacing[1] : spacing[3.5],
          // Absolute footers still reserve the inset so their background runs
          // all the way to the screen edge — otherwise content scrolls through
          // the gap between the footer and the tab bar.
          paddingBottom: bottomInset,
          borderTopWidth: isPlain ? 0 : 1,
          borderTopColor: colors.border,
          backgroundColor: isPlain ? 'transparent' : colors.background,
          flexDirection: 'row',
          gap: spacing[2.5],
        },
        absolute
          ? {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
            }
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
