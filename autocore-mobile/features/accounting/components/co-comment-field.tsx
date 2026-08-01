import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/hooks';
import { radius, spacing } from '@/theme';

type CoCommentFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** `plain` drops the fill so the field can sit directly inside a card. */
  variant?: 'filled' | 'plain';
};

const MIN_HEIGHT = 44;
const MAX_HEIGHT = 132;

/** Multiline note that grows with its content instead of scrolling in a box. */
export function CoCommentField({
  value,
  onChangeText,
  placeholder = 'Add a note (optional)',
  variant = 'filled',
}: CoCommentFieldProps) {
  const { colors } = useTheme();
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={
        variant === 'plain'
          ? undefined
          : {
              borderRadius: radius['2xl'],
              backgroundColor: colors.secondary,
              borderWidth: 1,
              borderColor: focused ? colors.ring : 'transparent',
              paddingHorizontal: spacing[3.5],
              paddingVertical: spacing[3],
            }
      }
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onContentSizeChange={(event) => {
          const next = Math.min(
            MAX_HEIGHT,
            Math.max(MIN_HEIGHT, Math.ceil(event.nativeEvent.contentSize.height)),
          );
          setHeight((current) => (current === next ? current : next));
        }}
        multiline
        textAlignVertical="top"
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel="Comment"
        selectionColor={colors.primary}
        style={{
          height,
          fontSize: 15,
          lineHeight: 21,
          color: colors.foreground,
          padding: 0,
        }}
      />
    </View>
  );
}
