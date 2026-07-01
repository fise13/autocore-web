import { forwardRef, memo } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { useDesignLanguage } from '@/hooks';

type InputProps = TextInputProps & {
  invalid?: boolean;
  size?: 'default' | 'lg';
};

export const Input = memo(
  forwardRef<TextInput, InputProps>(function Input(
    { invalid, size = 'default', style, ...props },
    ref,
  ) {
    const dl = useDesignLanguage();

    return (
      <TextInput
        ref={ref}
        placeholderTextColor={dl.colors.mutedForeground}
        style={[
          dl.styles.createInputStyle({ scheme: dl.scheme, colors: dl.colors }, { invalid, large: size === 'lg' }),
          dl.styles.createInputTextStyle({ scheme: dl.scheme, colors: dl.colors }),
          style,
        ]}
        {...props}
      />
    );
  }),
);
