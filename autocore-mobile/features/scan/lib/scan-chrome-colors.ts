import { useMemo } from 'react';

import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

/**
 * Brand-aware palette for scan chrome.
 * Camera overlays stay high-contrast on live video; footer/controls use semantic tokens.
 */
export function useScanChromeColors() {
  const { colors, isDark } = useTheme();

  return useMemo(() => {
    const cameraInk = isDark ? colors.foreground : colors.card;
    const cameraScrim = withAlpha(isDark ? colors.background : colors.foreground, 0.42);

    return {
      stage: colors.background,
      viewport: colors.background,

      controlIdleBg: withAlpha(isDark ? colors.background : colors.foreground, 0.4),
      controlIdleBorder: withAlpha(cameraInk, 0.16),
      controlActiveBg: colors.primary,
      controlActiveBorder: colors.primary,
      controlIcon: cameraInk,
      controlIconActive: colors.primaryForeground,

      track: colors.secondary,
      thumb: colors.primary,
      thumbLabel: colors.primaryForeground,
      trackLabel: colors.mutedForeground,

      toolWell: colors.secondary,
      toolIcon: colors.foreground,
      toolLabel: colors.mutedForeground,

      status: cameraInk,
      frameIdle: withAlpha(cameraInk, 0.9),
      frameDetected: colors.primary,
      detectionBorder: colors.primary,
      detectionFill: withAlpha(colors.primary, 0.12),

      flash: colors.primary,
      flashRing: cameraInk,

      bannerBg: withAlpha(colors.card, 0.94),
      bannerBorder: colors.border,
      bannerTitle: colors.cardForeground,
      bannerMeta: colors.mutedForeground,
      bannerAction: colors.primary,

      ocrScrim: colors.overlay,
      ocrLabel: cameraInk,

      shutterRing: colors.card,
      shutterFill: colors.primary,

      cameraScrim,
      permissionTitle: colors.foreground,
      permissionBody: colors.mutedForeground,
    };
  }, [colors, isDark]);
}
