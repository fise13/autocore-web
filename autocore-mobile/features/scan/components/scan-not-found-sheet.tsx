import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { isHttpUrl } from '../lib/classify-payload';

type ScanNotFoundSheetProps = {
  payload: string | null;
  isAiLoading?: boolean;
  orderContext?: boolean;
  onCreateItem: () => void;
  onAddAsSpecific: () => void;
  onTryAi?: () => void;
  onOpenUrl?: () => void;
  onCancel: () => void;
  onDismiss: () => void;
};

function OptionButton({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
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
        minHeight: 50,
        borderRadius: 14,
        paddingHorizontal: 16,
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
          fontSize: 15,
          fontWeight: '600',
          color: primary ? colors.primaryForeground : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const ScanNotFoundSheet = forwardRef<BottomSheetModal, ScanNotFoundSheetProps>(
  function ScanNotFoundSheet(
    {
      payload,
      isAiLoading,
      orderContext,
      onCreateItem,
      onAddAsSpecific,
      onTryAi,
      onOpenUrl,
      onCancel,
      onDismiss,
    },
    ref,
  ) {
    const sheet = useModalBottomSheet();
    const isUrl = isHttpUrl(payload);
    const modalProps = {
      ...sheet.sheetLayout,
      index: 0 as const,
      snapPoints: sheet.compactSnapPoints(orderContext ? 40 : 44),
      enablePanDownToClose: true,
      onDismiss,
      backdropComponent: sheet.renderBackdrop,
      backgroundStyle: sheet.backgroundStyle,
      handleIndicatorStyle: sheet.handleIndicatorStyle,
    };

    if (!payload) {
      return (
        <BottomSheetModal ref={ref} {...modalProps}>
          <BottomSheetView style={{ minHeight: 1 }}>
            <View />
          </BottomSheetView>
        </BottomSheetModal>
      );
    }

    let host = payload;
    if (isUrl) {
      try {
        host = new URL(payload).host;
      } catch {
        host = payload;
      }
    }

    return (
      <BottomSheetModal ref={ref} {...modalProps}>
        <BottomSheetView style={{ ...sheet.compactContentStyle, gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text variant="heading" style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>
              {isUrl ? 'Внешняя ссылка' : 'Товар не найден'}
            </Text>
            <Text variant="caption" color="muted" numberOfLines={2} style={{ fontVariant: ['tabular-nums'] }}>
              {isUrl ? host : payload}
            </Text>
          </View>

          {isUrl && onOpenUrl ? <OptionButton label="Открыть ссылку" onPress={onOpenUrl} primary /> : null}

          {!isUrl ? (
            <>
              <OptionButton
                label={orderContext ? 'Создать товар на складе' : 'Создать новый товар'}
                onPress={onCreateItem}
                primary
              />
              <OptionButton
                label={orderContext ? 'Добавить как произвольную запчасть' : 'Рассмотреть как запчасть'}
                onPress={onAddAsSpecific}
              />
              {!orderContext && onTryAi ? (
                <OptionButton
                  label={isAiLoading ? 'Ищем…' : 'Уточнить с AI'}
                  onPress={onTryAi}
                  disabled={isAiLoading}
                />
              ) : null}
            </>
          ) : null}

          <OptionButton label="Отмена" onPress={onCancel} />
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
