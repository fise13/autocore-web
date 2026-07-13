import { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { createElement, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFloatingTabBarInset } from '@/hooks/use-floating-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { layout, rhythm } from '@/theme';

/**
 * Shared layout for BottomSheetModal overlays that should sit like stack modals
 * (new order / new operation): full height to the screen bottom, tab bar floats on top.
 */
export function useModalBottomSheet(options?: { backdropOpacity?: number }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { footerBottom, scrollBottom } = useFloatingTabBarInset();
  const backdropOpacity = options?.backdropOpacity ?? 0.5;

  const formSnapPoints = useMemo(() => ['100%'], []);

  const compactSnapPoints = useCallback((percent: number) => [`${percent}%`], []);

  const documentSnapPoints = useMemo(() => ['60%', '100%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) =>
      createElement(BottomSheetBackdrop, {
        ...props,
        disappearsOnIndex: -1,
        appearsOnIndex: 0,
        opacity: backdropOpacity,
        pressBehavior: 'close',
      }),
    [backdropOpacity],
  );

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: colors.card,
      borderTopLeftRadius: layout.bottomSheet.borderRadius,
      borderTopRightRadius: layout.bottomSheet.borderRadius,
    }),
    [colors.card],
  );

  const handleIndicatorStyle = useMemo(
    () => ({
      backgroundColor: colors.mutedForeground,
      width: layout.bottomSheet.handleWidth,
    }),
    [colors.mutedForeground],
  );

  /** Gorhom v5 defaults enableDynamicSizing to true, which overrides fixed snap points. */
  const sheetLayout = useMemo(
    () => ({
      bottomInset: 0,
      enableDynamicSizing: false as const,
    }),
    [],
  );

  const formContentStyle = useMemo(
    () => ({
      paddingHorizontal: rhythm.pad,
      paddingBottom: scrollBottom,
      gap: 14 as const,
    }),
    [scrollBottom],
  );

  const compactContentStyle = useMemo(
    () => ({
      paddingHorizontal: rhythm.pad,
      paddingBottom: footerBottom,
    }),
    [footerBottom],
  );

  return {
    sheetLayout,
    formSnapPoints,
    compactSnapPoints,
    documentSnapPoints,
    renderBackdrop,
    backgroundStyle,
    handleIndicatorStyle,
    topInset: insets.top,
    formContentStyle,
    compactContentStyle,
    footerBottom,
    scrollBottom,
  };
}
