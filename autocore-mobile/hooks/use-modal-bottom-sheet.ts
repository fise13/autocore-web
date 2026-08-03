import { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { createElement, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFloatingTabBarInset } from '@/hooks/use-floating-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { layout, rhythm, spacing } from '@/theme';

/**
 * Shared layout for Gorhom BottomSheetModal overlays.
 * Compose flows that belong to a tab (e.g. new operation) prefer the native
 * `formSheet` stack presentation instead — see `formSheetScreenOptions`.
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
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
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

  /**
   * A modal sheet renders over the floating tab bar, so its content must clear
   * the home indicator — not the tab bar. Reserving tab-bar space here left a
   * screenful of dead scroll under every sheet's actions.
   */
  const sheetContentBottom = Math.max(insets.bottom, spacing[3]) + spacing[4];

  const formContentStyle = useMemo(
    () => ({
      paddingHorizontal: rhythm.pad,
      paddingBottom: sheetContentBottom,
      gap: 14 as const,
    }),
    [sheetContentBottom],
  );

  const compactContentStyle = useMemo(
    () => ({
      paddingHorizontal: rhythm.pad,
      paddingBottom: sheetContentBottom,
    }),
    [sheetContentBottom],
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
    sheetContentBottom,
  };
}
