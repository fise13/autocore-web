import { useCallback, useId, useMemo } from 'react';
import type { TextInput, TextInputProps } from 'react-native';

import { useAutocompleteContext } from '@/providers/autocomplete-provider';
import type { AutocompleteConfig, AutocompleteOption } from '@/lib/autocomplete/types';
import { getNativeInputProps } from '@/lib/autocomplete/native-input-props';

type UseAutocompleteArgs = AutocompleteConfig & {
  value: string;
  onValueChange: (value: string) => void;
  onOptionSelect?: (value: string) => void;
  options?: AutocompleteOption[];
  replaceMode?: AutocompleteConfig['replaceMode'];
  matchMode?: AutocompleteConfig['matchMode'];
};

export function useAutocomplete({
  value,
  onValueChange,
  onOptionSelect,
  options,
  replaceMode = 'full',
  matchMode = 'prefix',
  ...config
}: UseAutocompleteArgs) {
  const inputId = useId();
  const ctx = useAutocompleteContext();

  const nativeProps = useMemo(
    () => getNativeInputProps(config.source, config.context),
    [config.context, config.source],
  );

  const onFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (event) => {
      ctx.registerInput({
        inputId,
        config,
        replaceMode,
        matchMode,
        onChange: onValueChange,
        onOptionSelect,
        customOptions: options,
      });
      ctx.setQuery(inputId, value);
    },
    [config, ctx, inputId, matchMode, onOptionSelect, onValueChange, options, replaceMode, value],
  );

  const onBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (event) => {
      ctx.unregisterInput(inputId);
    },
    [ctx, inputId],
  );

  const onChangeText = useCallback(
    (text: string) => {
      onValueChange(text);
      ctx.setQuery(inputId, text);
    },
    [ctx, inputId, onValueChange],
  );

  const onSubmitEditing = useCallback<NonNullable<TextInputProps['onSubmitEditing']>>(
    () => {
      ctx.commitHighlighted(inputId);
    },
    [ctx, inputId],
  );

  return {
    inputId,
    inputProps: {
      ...nativeProps,
      onFocus,
      onBlur,
      onChangeText,
      onSubmitEditing,
    } satisfies Partial<TextInputProps>,
    isActive: ctx.activeInputId === inputId,
  };
}

export type UseAutocompleteReturn = ReturnType<typeof useAutocomplete>;
