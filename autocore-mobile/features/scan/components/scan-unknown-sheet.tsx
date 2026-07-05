import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { isHttpUrl } from '../lib/classify-payload';

type ScanUnknownSheetProps = {
  payload: string | null;
  onBindPart: () => void;
  onTryAi: () => void;
  onSearch: () => void;
  /** Shown only when the payload is a foreign URL QR. */
  onOpenUrl?: () => void;
  isAiLoading?: boolean;
  onDismiss: () => void;
};

function OptionRow({
  label,
  onPress,
  disabled,
  primary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
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
        backgroundColor: primary ? colors.primary : colors.secondary,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text
        variant="body"
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: primary ? colors.primaryForeground : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ScanUnknownSheetContent({
  payload,
  onBindPart,
  onTryAi,
  onSearch,
  onOpenUrl,
  isAiLoading,
}: Omit<ScanUnknownSheetProps, 'onDismiss'>) {
  const isUrl = isHttpUrl(payload);

  if (!payload) return <View style={{ minHeight: 1 }} />;

  let host = payload;
  if (isUrl) {
    try {
      host = new URL(payload).host;
    } catch {
      host = payload;
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text variant="heading" style={{ fontSize: 20, fontWeight: '700' }}>
          {isUrl ? 'Внешняя ссылка' : 'Код не найден'}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={2}>
          {isUrl ? host : payload}
        </Text>
      </View>

      {isUrl && onOpenUrl ? <OptionRow label="Открыть ссылку" onPress={onOpenUrl} primary /> : null}
      {!isUrl ? <OptionRow label="Привязать к запчасти" onPress={onBindPart} primary /> : null}
      {!isUrl ? (
        <OptionRow label={isAiLoading ? 'Ищем…' : 'Распознать с AI'} onPress={onTryAi} disabled={isAiLoading} />
      ) : null}
      <OptionRow label="Поиск вручную" onPress={onSearch} />
    </View>
  );
}

export const ScanUnknownSheet = forwardRef<BottomSheetModal, ScanUnknownSheetProps>(function ScanUnknownSheet(
  props,
  ref,
) {
  const sheet = useModalBottomSheet();
  const modalProps = {
    ...sheet.sheetLayout,
    index: 0 as const,
    snapPoints: sheet.compactSnapPoints(42),
    enablePanDownToClose: true,
    onDismiss: props.onDismiss,
    backdropComponent: sheet.renderBackdrop,
    backgroundStyle: sheet.backgroundStyle,
    handleIndicatorStyle: sheet.handleIndicatorStyle,
  };

  if (!props.payload) {
    return (
      <BottomSheetModal ref={ref} {...modalProps}>
        <BottomSheetView style={{ minHeight: 1 }}>
          <View />
        </BottomSheetView>
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal ref={ref} {...modalProps}>
      <BottomSheetView style={sheet.compactContentStyle}>
        <ScanUnknownSheetContent {...props} />
      </BottomSheetView>
    </BottomSheetModal>
  );
});
