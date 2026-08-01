import { useEffect, useState } from 'react';
import { AccessibilityInfo, PixelRatio, I18nManager } from 'react-native';

import { useAppearanceSettingsStore } from '@/features/settings/store/appearance-settings-store';

/** Reduced motion — system setting OR user disabled animations in Appearance. */
export function useReducedMotion(): boolean {
  const [systemReduced, setSystemReduced] = useState(false);
  const animationsEnabled = useAppearanceSettingsStore((s) => s.animationsEnabled);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => sub.remove();
  }, []);

  return systemReduced || !animationsEnabled;
}

/** Dynamic Type scale factor (+15% when Large text is on in Appearance). */
export function useFontScale(): number {
  const largeText = useAppearanceSettingsStore((s) => s.largeText);
  const system = PixelRatio.getFontScale();
  return largeText ? system * 1.15 : system;
}

/** High contrast detection (iOS invert colors / Android high contrast) */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isInvertColorsEnabled?.()
      ?.then(setHighContrast)
      .catch(() => setHighContrast(false));
  }, []);

  return highContrast;
}

/** RTL layout direction */
export function useIsRTL(): boolean {
  return I18nManager.isRTL;
}

/** Screen reader active */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setEnabled);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => sub.remove();
  }, []);

  return enabled;
}

/** Combined accessibility context values */
export function useAccessibility() {
  const reducedMotion = useReducedMotion();
  const fontScale = useFontScale();
  const highContrast = useHighContrast();
  const isRTL = useIsRTL();
  const screenReaderEnabled = useScreenReaderEnabled();

  return {
    reducedMotion,
    fontScale,
    highContrast,
    isRTL,
    screenReaderEnabled,
    /** Scale typography size for Dynamic Type */
    scaledSize: (base: number) => Math.round(base * fontScale),
  };
}
