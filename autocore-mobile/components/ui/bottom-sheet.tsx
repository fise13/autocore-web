import { forwardRef, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';

import { useTheme } from '@/hooks';
import { layout, radius, spacing } from '@/theme';

type BottomSheetComponentProps = Omit<BottomSheetProps, 'children'> & {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
};

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetComponentProps>(
  function BottomSheet({ children, snapPoints: customSnapPoints, ...props }, ref) {
    const { colors } = useTheme();
    const snapPoints = useMemo(() => customSnapPoints ?? ['50%', '90%'], [customSnapPoints]);

    const renderBackdrop = useCallback(
      (backdropProps: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...backdropProps} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
      ),
      [],
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={-1}
        enablePanDownToClose
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{
          width: layout.bottomSheet.handleWidth,
          height: layout.bottomSheet.handleHeight,
          backgroundColor: colors.mutedForeground,
        }}
        backgroundStyle={{
          backgroundColor: colors.card,
          borderTopLeftRadius: layout.bottomSheet.borderRadius,
          borderTopRightRadius: layout.bottomSheet.borderRadius,
        }}
        {...props}
      >
        <BottomSheetView style={{ padding: spacing[4] }}>{children}</BottomSheetView>
      </GorhomBottomSheet>
    );
  },
);
