import { memo, useCallback } from 'react';
import type { TextInputProps } from 'react-native';

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
  matchMode = 'prefix',
  debounceMs,
  minQueryLength,
  invalid,
  onFocus,
  onBlur,
  onSubmitEditing,
  ...props
}: AutocompleteInputProps) {
  const { inputProps } = useAutocomplete({
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

  return (
    <InputField
      {...props}
      {...inputProps}
      value={value}
      invalid={invalid}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onSubmitEditing={handleSubmit}
      returnKeyType={props.returnKeyType ?? 'done'}
    />
  );
});
