import { useEffect, useState } from 'react';
import { AccessibilityInfo, PixelRatio, I18nManager } from 'react-native';

/** Reduced motion — respects iOS/Android system setting */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);

  return reduced;
}

/** Dynamic Type scale factor */
export function useFontScale(): number {
  return PixelRatio.getFontScale();
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
