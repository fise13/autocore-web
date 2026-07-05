import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { SearchIcon } from '@/assets/icons';
import { useTheme } from '@/hooks';

import { InputField } from './input-field';
import { INPUT_HEIGHT } from './tokens';

export type SearchInputProps = Omit<TextInputProps, 'style'> & {
  onClear?: () => void;
  fieldHeight?: number;
};

export const SearchInput = forwardRef<TextInput, SearchInputProps>(function SearchInput(
  { fieldHeight = INPUT_HEIGHT, ...props },
  ref,
) {
  const { colors } = useTheme();

  return (
    <InputField
      ref={ref}
      fieldHeight={fieldHeight}
      returnKeyType="search"
      autoCorrect={false}
      leftSlot={<SearchIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />}
      {...props}
    />
  );
});
