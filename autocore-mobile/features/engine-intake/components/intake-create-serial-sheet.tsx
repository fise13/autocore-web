import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Button, Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { minTouchTarget, spacing, tokens } from '@/theme';

export type IntakeCreateSerialSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type IntakeCreateSerialSheetProps = {
  loading?: boolean;
  onSubmit: (serialCode: string) => void | Promise<void>;
};

export const IntakeCreateSerialSheet = forwardRef<
  IntakeCreateSerialSheetRef,
  IntakeCreateSerialSheetProps
>(function IntakeCreateSerialSheet({ loading = false, onSubmit }, ref) {
  const { colors } = useTheme();
  const sheet = useModalBottomSheet({ backdropOpacity: 0.42 });
  const sheetRef = useRef<BottomSheetModal>(null);
  const [serialDraft, setSerialDraft] = useState('');

  useImperativeHandle(ref, () => ({
    present: () => {
      setSerialDraft('');
      sheetRef.current?.present();
    },
    dismiss: () => {
      Keyboard.dismiss();
      sheetRef.current?.dismiss();
    },
  }));

  const submit = useCallback(async () => {
    const serialCode = serialDraft.trim().toUpperCase();
    if (!serialCode || loading) return;
    Keyboard.dismiss();
    await onSubmit(serialCode);
  }, [loading, onSubmit, serialDraft]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      {...sheet.sheetLayout}
      index={0}
      snapPoints={sheet.compactSnapPoints(46)}
      topInset={sheet.topInset}
      enablePanDownToClose={!loading}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={sheet.renderBackdrop}
      backgroundStyle={sheet.backgroundStyle}
      handleIndicatorStyle={sheet.handleIndicatorStyle}
      onDismiss={() => {
        Keyboard.dismiss();
        setSerialDraft('');
      }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ ...sheet.compactContentStyle, gap: spacing[4] }}
      >
        <View style={{ gap: spacing[1] }}>
          <Text
            variant="heading"
            style={{ color: colors.foreground, fontWeight: '800', letterSpacing: -0.3 }}
          >
            Engine serial
          </Text>
          <Text variant="caption" style={{ color: colors.mutedForeground }}>
            Type the plate, then photograph freely.
          </Text>
        </View>

        <TextInput
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          editable={!loading}
          value={serialDraft}
          onChangeText={setSerialDraft}
          placeholder="UF398539"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="go"
          blurOnSubmit
          accessibilityLabel="Engine serial"
          style={{
            minHeight: minTouchTarget + spacing[3],
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: tokens.radius.control,
            paddingHorizontal: spacing[4],
            fontSize: 28,
            fontWeight: '800',
            color: colors.foreground,
            letterSpacing: 1.2,
            fontVariant: ['tabular-nums'],
            backgroundColor: colors.surfaceSecondary,
          }}
          onSubmitEditing={() => void submit()}
        />

        <Button
          size="xl"
          loading={loading}
          disabled={loading || !serialDraft.trim()}
          onPress={() => void submit()}
        >
          Open camera
        </Button>

        <Button
          variant="ghost"
          disabled={loading}
          onPress={() => {
            Keyboard.dismiss();
            sheetRef.current?.dismiss();
          }}
        >
          Cancel
        </Button>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
