import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, type TextInputProps } from 'react-native';

import { InputField } from '@/components/ui/input/input-field';
import { useTheme } from '@/hooks';
import { filterAutocompleteOptions } from '@/lib/autocomplete/filter-options';
import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { haptics } from '@/theme';

import { Text } from './text';

type AutocompleteInputProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> & {
  value: string;
  onValueChange: (value: string) => void;
  options: AutocompleteOption[];
  onOptionSelect?: (value: string) => void;
  matchMode?: 'prefix' | 'flexible';
  maxSuggestions?: number;
  invalid?: boolean;
};

export const AutocompleteInput = memo(function AutocompleteInput({
  value,
  onValueChange,
  options,
  onOptionSelect,
  matchMode = 'prefix',
  maxSuggestions = 8,
  invalid,
  onFocus,
  onBlur,
  ...props
}: AutocompleteInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () => filterAutocompleteOptions(value, options, matchMode, maxSuggestions),
    [matchMode, maxSuggestions, options, value],
  );

  const showSuggestions = focused && suggestions.length > 0;

  const commitOption = useCallback(
    (next: string) => {
      onValueChange(next);
      onOptionSelect?.(next);
      haptics.selection();
      setFocused(false);
    },
    [onOptionSelect, onValueChange],
  );

  return (
    <View style={{ zIndex: showSuggestions ? 40 : 1 }}>
      <InputField
        {...props}
        value={value}
        invalid={invalid}
        onChangeText={onValueChange}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setTimeout(() => setFocused(false), 140);
          onBlur?.(event);
        }}
      />

      {showSuggestions ? (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            maxHeight: 220,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {suggestions.map((option) => (
              <Pressable
                key={`${option.value}-${option.label ?? ''}`}
                onPress={() => commitOption(option.value)}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  backgroundColor: pressed ? colors.muted : 'transparent',
                })}
              >
                <Text variant="body" style={{ fontSize: 14, fontWeight: '500' }} numberOfLines={1}>
                  {option.label ?? option.value}
                </Text>
                {option.label && option.label !== option.value ? (
                  <Text variant="caption" color="muted" style={{ fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                    {option.value}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
});
