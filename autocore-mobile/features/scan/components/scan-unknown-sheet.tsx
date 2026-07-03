import { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, layout } from '@/theme';

type ScanUnknownSheetProps = {
  payload: string | null;
  onBindPart: () => void;
  onTryAi: () => void;
  onSearch: () => void;
  isAiLoading?: boolean;
  onDismiss: () => void;
};

function OptionRow({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        haptics.light();
        onPress();
      }}
      style={{
        minHeight: 48,
        borderRadius: 12,
        paddingHorizontal: 14,
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        backgroundColor: colors.secondary,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export const ScanUnknownSheet = forwardRef<BottomSheetModal, ScanUnknownSheetProps>(function ScanUnknownSheet(
  { payload, onBindPart, onTryAi, onSearch, isAiLoading, onDismiss },
  ref,
) {
  const { colors } = useTheme();
  const snapPoints = useMemo(() => ['38%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  if (!payload) {
    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onDismiss={onDismiss}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground, width: layout.bottomSheet.handleWidth }}
        backgroundStyle={{
          backgroundColor: colors.card,
          borderTopLeftRadius: layout.bottomSheet.borderRadius,
          borderTopRightRadius: layout.bottomSheet.borderRadius,
        }}
      >
        <BottomSheetView style={{ minHeight: 1 }}>
          <View />
        </BottomSheetView>
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground, width: layout.bottomSheet.handleWidth }}
      backgroundStyle={{
        backgroundColor: colors.card,
        borderTopLeftRadius: layout.bottomSheet.borderRadius,
        borderTopRightRadius: layout.bottomSheet.borderRadius,
      }}
    >
      <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text variant="heading" style={{ fontSize: 20, fontWeight: '700' }}>
            Код не найден
          </Text>
          <Text variant="caption" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {payload}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <OptionRow label="Найти через AI" onPress={onTryAi} disabled={isAiLoading} />
          <OptionRow label="Привязать к позиции" onPress={onBindPart} />
          <OptionRow label="Поиск вручную" onPress={onSearch} />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
