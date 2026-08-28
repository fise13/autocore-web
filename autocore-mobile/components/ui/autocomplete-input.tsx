import { memo, useCallback } from 'react';
import type { TextInputProps } from 'react-native';

import { InputField } from '@/components/ui/input/input-field';
import { useAutocomplete } from '@/hooks/use-autocomplete';
import type {
  AutocompleteConfig,
  AutocompleteOption,
  AutocompleteSourceId,
  AutocompleteType,
} from '@/lib/autocomplete/types';

type AutocompleteInputProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> & {
  value: string;
  onValueChange: (value: string) => void;
  /** High-level entity type — preferred for WO / shared forms. */
  type?: AutocompleteType;
  /** Registry source. Used when `type` is omitted; `type` wins when both are set. */
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
  presentation?: AutocompleteConfig['presentation'];
};

/**
 * Text field wired to the shared autocomplete session.
 * Suggestions render in the keyboard-docked overlay — not under this input.
 */
export const AutocompleteInput = memo(function AutocompleteInput({
  value,
  onValueChange,
  type,
  source,
  fieldKey,
  context,
  options,
  onOptionSelect,
  replaceMode = 'full',
  matchMode = 'flexible',
  debounceMs,
  minQueryLength,
  invalid,
  presentation = 'chips',
  onFocus,
  onBlur,
  onSubmitEditing,
  onKeyPress,
  ...props
}: AutocompleteInputProps) {
  const { inputProps } = useAutocomplete({
    type,
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
    presentation,
  });

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (event) => {
      inputProps.onFocus?.(event);
      onFocus?.(event);
    },
    [inputProps, onFocus],
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
  );
});
