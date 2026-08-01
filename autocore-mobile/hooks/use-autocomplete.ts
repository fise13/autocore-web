import { useCallback, useId, useMemo } from 'react';
import type { TextInputProps } from 'react-native';

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
  matchMode = 'flexible',
  ...config
}: UseAutocompleteArgs) {
  const inputId = useId();
  const ctx = useAutocompleteContext();

  const nativeProps = useMemo(
    () => getNativeInputProps(config.source, config.context),
    [config.context, config.source],
  );

  const onFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    () => {
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

  const setAnchor = useCallback(
    (anchor: { x: number; y: number; width: number; height: number }) => {
      ctx.setAnchor(inputId, anchor);
    },
    [ctx, inputId],
  );

  const onBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    () => {
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

  const onKeyPress = useCallback<NonNullable<TextInputProps['onKeyPress']>>(
    (event) => {
      const key = event.nativeEvent.key;
      if (key === 'ArrowDown') {
        event.preventDefault?.();
        ctx.moveHighlight(inputId, 1);
        return;
      }
      if (key === 'ArrowUp') {
        event.preventDefault?.();
        ctx.moveHighlight(inputId, -1);
        return;
      }
      if (key === 'Escape') {
        event.preventDefault?.();
        ctx.dismiss(inputId);
      }
    },
    [ctx, inputId],
  );

  return {
    inputId,
    setAnchor,
    inputProps: {
      ...nativeProps,
      onFocus,
      onBlur,
      onChangeText,
      onSubmitEditing,
      onKeyPress,
    } satisfies Partial<TextInputProps>,
    isActive: ctx.activeInputId === inputId,
  };
}

export type UseAutocompleteReturn = ReturnType<typeof useAutocomplete>;
