import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  KeyboardStickyView,
  OverKeyboardView,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';

import { AutocompletePanel, AutocompleteRow } from '@/components/autocomplete/autocomplete-row';
import { AUTOCOMPLETE_MAX_SUGGESTIONS } from '@/lib/autocomplete/constants';
import type { AutocompleteSession } from '@/lib/autocomplete/types';

type AutocompleteOverlayProps = {
  session: AutocompleteSession | null;
  chromeBottomInset?: number;
  onSelect: (index: number) => void;
  onInteractionStart?: () => void;
};

export const AutocompleteOverlay = memo(function AutocompleteOverlay({
  session,
  chromeBottomInset = 0,
  onSelect,
  onInteractionStart,
}: AutocompleteOverlayProps) {
  const { progress } = useReanimatedKeyboardAnimation();

  const suggestions = session?.visible ? session.suggestions.slice(0, AUTOCOMPLETE_MAX_SUGGESTIONS) : [];
  const show = Boolean(session?.visible && suggestions.length > 0);

  const stickyOffset = useMemo(
    () => ({
      closed: 0,
      opened: -chromeBottomInset,
    }),
    [chromeBottomInset],
  );

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const rows = useMemo(
    () =>
      suggestions.map((option, index) => (
        <AutocompleteRow
          key={`${option.value}-${index}`}
          option={option}
          highlighted={session?.highlightedIndex === index}
          isLast={index === suggestions.length - 1}
          onPress={() => onSelect(index)}
        />
      )),
    [onSelect, session?.highlightedIndex, suggestions],
  );

  if (!show) return null;

  return (
    <OverKeyboardView visible>
      <KeyboardStickyView
        enabled={show}
        offset={stickyOffset}
        style={styles.sticky}
        pointerEvents="box-none"
      >
        <Animated.View style={fadeStyle} pointerEvents="box-none">
          <View onTouchStart={onInteractionStart}>
            <AutocompletePanel>{rows}</AutocompletePanel>
          </View>
        </Animated.View>
      </KeyboardStickyView>
    </OverKeyboardView>
  );
});

const styles = StyleSheet.create({
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
