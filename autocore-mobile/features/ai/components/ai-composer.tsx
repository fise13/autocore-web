import { memo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

const SEND_ORB = 36;

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
};

export const AiComposer = memo(function AiComposer({ disabled, onSend }: Props) {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const trimmed = value.trim();
  const canSend = Boolean(trimmed) && !disabled;

  const submit = () => {
    if (!canSend) return;
    haptics.medium();
    onSend(trimmed);
    setValue('');
  };

  return (
    <View
      style={[
        styles.field,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        placeholder="Search or ask anything"
        placeholderTextColor={colors.mutedForeground}
        multiline
        textAlignVertical="top"
        autoCorrect
        autoCapitalize="sentences"
        blurOnSubmit={false}
        editable={!disabled}
        onSubmitEditing={submit}
        style={[styles.input, { color: colors.foreground }]}
      />
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={!canSend}
          onPress={submit}
          hitSlop={8}
          style={[
            styles.sendOrb,
            { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.32 },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="arrow.up" size={17} tintColor="#ffffff" weight="bold" />
          ) : (
            <Text variant="headline" style={{ color: '#ffffff' }}>
              ↑
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    borderRadius: 22,
    borderWidth: tokens.control.hairline,
    padding: 14,
  },
  input: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '400',
    letterSpacing: -0.2,
    minHeight: 44,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 2 : 0,
    paddingBottom: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  sendOrb: {
    width: SEND_ORB,
    height: SEND_ORB,
    borderRadius: SEND_ORB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
