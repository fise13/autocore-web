import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';

type KeyboardFormShellProps = Omit<ScrollViewProps, 'children' | 'contentContainerStyle'> & {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  backgroundColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra space between focused field and keyboard (above sticky footer). */
  bottomOffset?: number;
};

/** Form layout with automatic scroll-to-focused-field when the keyboard opens. */
export function KeyboardFormShell({
  header,
  footer,
  children,
  backgroundColor,
  contentContainerStyle,
  bottomOffset = 16,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'on-drag',
  showsVerticalScrollIndicator = false,
  ...scrollProps
}: KeyboardFormShellProps) {
  const [footerHeight, setFooterHeight] = useState(0);

  const handleFooterLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    setFooterHeight((current) => (current === next ? current : next));
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {header}
      <KeyboardAwareScrollView
        bottomOffset={bottomOffset + footerHeight}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={contentContainerStyle}
        {...scrollProps}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
          <View onLayout={handleFooterLayout}>{footer}</View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}
