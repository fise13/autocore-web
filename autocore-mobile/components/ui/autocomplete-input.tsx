import { memo, useCallback, useRef } from 'react';
import { View, type LayoutChangeEvent, type TextInputProps, type View as RNView } from 'react-native';

import { InputField } from '@/components/ui/input/input-field';
import { useAutocomplete } from '@/hooks/use-autocomplete';
import type { AutocompleteConfig, AutocompleteOption, AutocompleteSourceId } from '@/lib/autocomplete/types';

type AutocompleteInputProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Registry source. When omitted, `options` override is used. */
  source?: AutocompleteSourceId;
  fieldKey?: string;
  context?: Record<string, string>;
  options?: AutocompleteOption[];
  onOptionSelect?: (value: string) => void;
  replaceMode?: AutocompleteConfig['replaceMode'];
  matchMode?: AutocompleteConfig['matchMode'];
  debounceMs?: number;
  minQueryLength?: number;
  invalid?: boolean;
};

export const AutocompleteInput = memo(function AutocompleteInput({
  value,
  onValueChange,
  source = 'previousValue',
  fieldKey,
  context,
  options,
  onOptionSelect,
  replaceMode = 'full',
  matchMode = 'flexible',
  debounceMs,
  minQueryLength,
  invalid,
  onFocus,
  onBlur,
  onSubmitEditing,
  onKeyPress,
  ...props
}: AutocompleteInputProps) {
  const anchorRef = useRef<RNView>(null);
  const { inputProps, setAnchor } = useAutocomplete({
    source,
    fieldKey,
    context,
    value,
    onValueChange,
    onOptionSelect,
    options,
    replaceMode,
    matchMode,
    debounceMs,
    minQueryLength,
  });

  const measureAnchor = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      setAnchor({ x, y, width, height });
    });
  }, [setAnchor]);

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (event) => {
      inputProps.onFocus?.(event);
      // Register happens on focus, so measure right after it to seat the panel.
      requestAnimationFrame(measureAnchor);
      onFocus?.(event);
    },
    [inputProps, measureAnchor, onFocus],
  );

  const handleLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      measureAnchor();
    },
    [measureAnchor],
  );

  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (event) => {
      inputProps.onBlur?.(event);
      onBlur?.(event);
    },
    [inputProps, onBlur],
  );

  const handleSubmit = useCallback<NonNullable<TextInputProps['onSubmitEditing']>>(
    (event) => {
      inputProps.onSubmitEditing?.(event);
      onSubmitEditing?.(event);
    },
    [inputProps, onSubmitEditing],
  );

  const handleKeyPress = useCallback<NonNullable<TextInputProps['onKeyPress']>>(
    (event) => {
      inputProps.onKeyPress?.(event);
      onKeyPress?.(event);
    },
    [inputProps, onKeyPress],
  );

  return (
    <View ref={anchorRef} collapsable={false} onLayout={handleLayout}>
      <InputField
        {...props}
        {...inputProps}
        value={value}
        invalid={invalid}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmit}
        onKeyPress={handleKeyPress}
        returnKeyType={props.returnKeyType ?? 'done'}
      />
    </View>
  );
});
