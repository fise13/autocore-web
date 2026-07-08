import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/hooks';
import { rhythm, radius } from '@/theme';

const CODE_LENGTH = 6;

type VerificationCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
};

function normalizeCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
  invalid = false,
}: VerificationCodeInputProps) {
  const { colors } = useTheme();
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? '');

  useEffect(() => {
    if (value.length === 0) {
      inputRefs.current[0]?.focus();
    }
  }, [value]);

  function updateAt(index: number, nextDigit: string) {
    const chars = digits.slice();
    chars[index] = nextDigit;
    onChange(chars.join('').replace(/\s/g, ''));
  }

  function focusAt(index: number) {
    const clamped = Math.max(0, Math.min(CODE_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
  }

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
      {digits.map((digit, index) => {
        const filled = digit.length > 0;
        return (
          <TextInput
            key={index}
            ref={(node) => {
              inputRefs.current[index] = node;
            }}
            value={digit}
            editable={!disabled}
            keyboardType="number-pad"
            maxLength={index === 0 ? CODE_LENGTH : 1}
            textContentType={index === 0 ? 'oneTimeCode' : 'none'}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            onChangeText={(raw) => {
              const normalized = normalizeCode(raw);
              if (!normalized) {
                updateAt(index, '');
                return;
              }
              if (normalized.length === 1) {
                updateAt(index, normalized);
                if (index < CODE_LENGTH - 1) focusAt(index + 1);
                return;
              }
              onChange(normalized);
              focusAt(Math.min(normalized.length, CODE_LENGTH - 1));
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
                updateAt(index - 1, '');
                focusAt(index - 1);
              }
            }}
            style={{
              width: 44,
              height: 48,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: invalid
                ? colors.destructive
                : filled
                  ? `${colors.primary}55`
                  : colors.border,
              backgroundColor: filled ? `${colors.primary}10` : colors.background,
              textAlign: 'center',
              fontSize: 20,
              fontWeight: '600',
              color: colors.foreground,
              opacity: disabled ? 0.55 : 1,
            }}
          />
        );
      })}
    </View>
  );
}
