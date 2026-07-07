import type { ReactNode } from 'react';
import { View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type KeyboardFormShellProps = Omit<ScrollViewProps, 'children' | 'contentContainerStyle'> & {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  backgroundColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra space between focused field and keyboard. */
  bottomOffset?: number;
};

/** Form layout with automatic scroll-to-focused-field when the keyboard opens. */
export function KeyboardFormShell({
  header,
  footer,
  children,
  backgroundColor,
  contentContainerStyle,
  bottomOffset = 20,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  ...scrollProps
}: KeyboardFormShellProps) {
  return (
    <View style={{ flex: 1, backgroundColor }}>
      {header}
      <KeyboardAwareScrollView
        bottomOffset={bottomOffset}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentContainerStyle={contentContainerStyle}
        {...scrollProps}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer}
    </View>
  );
}
