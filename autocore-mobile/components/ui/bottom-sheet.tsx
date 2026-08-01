import { forwardRef, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';

import { useModalBottomSheet } from '@/hooks';
import { rhythm } from '@/theme';

type BottomSheetComponentProps = Omit<BottomSheetProps, 'children'> & {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
};

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetComponentProps>(
  function BottomSheet({ children, snapPoints: customSnapPoints, ...props }, ref) {
    const sheet = useModalBottomSheet({ backdropOpacity: 0.45 });
    const snapPoints = useMemo(() => customSnapPoints ?? ['100%'], [customSnapPoints]);

    const renderBackdrop = useCallback(
      (backdropProps: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...backdropProps} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
      ),
      [],
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        {...sheet.sheetLayout}
        index={-1}
        enablePanDownToClose
        snapPoints={snapPoints}
        topInset={sheet.topInset}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
        backgroundStyle={sheet.backgroundStyle}
        {...props}
      >
        <BottomSheetView style={{ padding: rhythm.pad, paddingBottom: sheet.sheetContentBottom }}>{children}</BottomSheetView>
      </GorhomBottomSheet>
    );
  },
);
