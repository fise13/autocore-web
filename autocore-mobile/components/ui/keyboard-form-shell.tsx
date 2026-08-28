import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';

import { useAutocompleteDockInset } from '@/providers/autocomplete-provider';

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
  style,
  ...scrollProps
}: KeyboardFormShellProps) {
  const [footerHeight, setFooterHeight] = useState(0);
  const dockInset = useAutocompleteDockInset();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  const handleFooterLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    setFooterHeight((current) => (current === next ? current : next));
  };

  useEffect(() => {
    if (dockInset <= 0) return;
    scrollRef.current?.assureFocusedInputVisible();
  }, [dockInset]);

  const flattenedContent = StyleSheet.flatten(contentContainerStyle) ?? {};
  const ownBottomPadding =
    typeof flattenedContent.paddingBottom === 'number' ? flattenedContent.paddingBottom : 0;
  const contentBottom = ownBottomPadding + footerHeight + dockInset;

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {header}
      {/* `flex: 1` is load-bearing: without it the scroll view sizes to its
          content and pushes the sticky bar off the bottom of the screen. */}
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={[{ flex: 1 }, style]}
        bottomOffset={bottomOffset + footerHeight + dockInset}
        extraKeyboardSpace={dockInset}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        // The bar floats over the content, so the form reserves its measured
        // height — content scrolls underneath without ever hiding behind it.
        contentContainerStyle={[contentContainerStyle, { paddingBottom: contentBottom }]}
        {...scrollProps}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        <KeyboardStickyView
          offset={{ closed: 0, opened: 0 }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        >
          <View onLayout={handleFooterLayout}>{footer}</View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}
