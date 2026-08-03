import { forwardRef, useCallback, useMemo, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

import { Text } from './text';

export type SheetDetent = 'compact' | 'medium' | 'large' | 'full';

const DETENT_POINTS: Record<SheetDetent, (string | number)[]> = {
  compact: ['35%'],
  medium: ['55%'],
  large: ['78%'],
  full: ['100%'],
};

const SHEET_SPRING = {
  damping: tokens.motion.springs.sheet.damping,
  stiffness: tokens.motion.springs.sheet.stiffness,
  mass: tokens.motion.springs.sheet.mass,
  overshootClamping: true,
} as const;

type SheetProps = Omit<BottomSheetModalProps, 'children' | 'snapPoints'> & {
  children: ReactNode;
  detent?: SheetDetent;
  snapPoints?: (string | number)[];
  title?: string;
  footer?: ReactNode;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Unified modal sheet — detent-first, DL sheet spring dismiss, shared chrome.
 * Prefer this over ad-hoc BottomSheetModal configuration.
 */
export const Sheet = forwardRef<BottomSheetModal, SheetProps>(function Sheet(
  {
    children,
    detent = 'medium',
    snapPoints: customSnapPoints,
    title,
    footer,
    scrollable = true,
    contentStyle,
    animationConfigs,
    ...props
  },
  ref,
) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(
    () => customSnapPoints ?? DETENT_POINTS[detent],
    [customSnapPoints, detent],
  );

  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={tokens.opacity.scrim}
        pressBehavior="close"
      />
    ),
    [],
  );

  const bodyPad = {
    paddingHorizontal: tokens.space.screenX,
    paddingBottom: Math.max(insets.bottom, tokens.space.stack) + tokens.space.stack,
    gap: tokens.space.stack,
  } as const;

  const chrome = (
    <>
      {title ? (
        <Text variant="headline" style={{ paddingTop: tokens.space.inline }}>
          {title}
        </Text>
      ) : null}
      {children}
      {footer ? <View style={{ paddingTop: tokens.space.inline }}>{footer}</View> : null}
    </>
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enablePanDownToClose
      enableDynamicSizing={false}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      animationConfigs={animationConfigs ?? SHEET_SPRING}
      handleIndicatorStyle={{
        backgroundColor: colors.mutedForeground,
        width: 36,
      }}
      backgroundStyle={{
        backgroundColor: colors.card,
        borderTopLeftRadius: tokens.radius.sheet,
        borderTopRightRadius: tokens.radius.sheet,
      }}
      {...props}
    >
      {scrollable ? (
        <BottomSheetScrollView contentContainerStyle={[bodyPad, contentStyle]}>
          {chrome}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={[bodyPad, contentStyle]}>{chrome}</BottomSheetView>
      )}
    </BottomSheetModal>
  );
});

export { DETENT_POINTS };
