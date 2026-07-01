import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { breakpoints, sidebarWidth, contentMaxWidth } from '@/theme/breakpoints';
import { layoutRhythm } from '@/theme/design-language';
import { screenPadding, spacing } from '@/theme/spacing';

export type DeviceClass = 'compact' | 'regular' | 'expanded' | 'large';

export function useAdaptiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const deviceClass: DeviceClass = useMemo(() => {
    if (width >= breakpoints.lg) return 'large';
    if (width >= breakpoints.md) return 'expanded';
    if (width >= breakpoints.sm) return 'regular';
    return 'compact';
  }, [width]);

  const isTablet = width >= breakpoints.md;
  const isFoldable = width >= breakpoints.md && width < breakpoints.lg && isLandscape;
  const isSplitView = isTablet && width < breakpoints.lg;

  const contentWidth = Math.min(width - insets.left - insets.right, contentMaxWidth);
  const horizontalPadding = isTablet ? spacing[6] : screenPadding.horizontal;

  const columns = useMemo(() => {
    if (width >= breakpoints.xl) return 4;
    if (width >= breakpoints.lg) return 3;
    if (width >= breakpoints.md) return 2;
    return 1;
  }, [width]);

  const gridGap = isTablet ? spacing[4] : spacing[3];

  return {
    width,
    height,
    fontScale,
    insets,
    isLandscape,
    isTablet,
    isFoldable,
    isSplitView,
    deviceClass,
    columns,
    gridGap,
    contentWidth,
    horizontalPadding,
    sidebarWidth: isTablet ? sidebarWidth.expanded : 0,
    layoutRhythm,
    /** Responsive value picker — never hardcode breakpoints in components */
    select: <T,>(options: { compact: T; regular?: T; expanded?: T; large?: T }) => {
      if (deviceClass === 'large' && options.large !== undefined) return options.large;
      if (deviceClass === 'expanded' && options.expanded !== undefined) return options.expanded;
      if (deviceClass === 'regular' && options.regular !== undefined) return options.regular;
      return options.compact;
    },
  };
}
