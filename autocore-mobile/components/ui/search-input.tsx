import { forwardRef } from 'react';
import { View, TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks';
import { SearchIcon } from '@/assets/icons';
import { layout, radius, spacing, typography } from '@/theme';

type SearchInputProps = Omit<TextInputProps, 'style'> & {
  onClear?: () => void;
};

export const SearchInput = forwardRef<TextInput, SearchInputProps>(function SearchInput(
  { onClear, ...props },
  ref,
) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: layout.input.heightLg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.input,
        backgroundColor: colors.background,
        paddingHorizontal: spacing[2.5],
        gap: spacing[2],
      }}
    >
      <SearchIcon size="sm" color={colors.mutedForeground} />
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mutedForeground}
        style={{
          flex: 1,
          fontSize: typography.body.fontSize,
          fontFamily: 'GeistSans',
          color: colors.foreground,
          padding: 0,
        }}
        returnKeyType="search"
        {...props}
      />
    </View>
  );
});
