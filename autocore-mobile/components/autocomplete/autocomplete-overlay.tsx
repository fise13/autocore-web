import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';

import { AutocompletePanel, AutocompleteRow } from '@/components/autocomplete/autocomplete-row';
import {
  AUTOCOMPLETE_MAX_SUGGESTIONS,
  AUTOCOMPLETE_ROW_HEIGHT,
} from '@/lib/autocomplete/constants';
import type { AutocompleteSession } from '@/lib/autocomplete/types';

type AutocompleteOverlayProps = {
  session: AutocompleteSession | null;
  onSelect: (index: number) => void;
};

export const AutocompleteOverlay = memo(function AutocompleteOverlay({
  session,
  onSelect,
}: AutocompleteOverlayProps) {
  const { height, progress } = useReanimatedKeyboardAnimation();

  const suggestions = session?.visible ? session.suggestions.slice(0, AUTOCOMPLETE_MAX_SUGGESTIONS) : [];
  const panelHeight = suggestions.length * AUTOCOMPLETE_ROW_HEIGHT;

  const animatedStyle = useAnimatedStyle(() => {
    const keyboardHeight = height.value;
    const open = progress.value;
    return {
      opacity: open,
      transform: [
        {
          translateY: interpolate(open, [0, 1], [panelHeight, 0]),
        },
      ],
      bottom: keyboardHeight,
    };
  }, [panelHeight]);

  const show = Boolean(session?.visible && suggestions.length > 0);

  const rows = useMemo(
    () =>
      suggestions.map((option, index) => (
        <AutocompleteRow
          key={`${option.value}-${index}`}
          option={option}
          highlighted={session?.highlightedIndex === index}
          onPress={() => onSelect(index)}
        />
      )),
    [onSelect, session?.highlightedIndex, suggestions],
  );

  if (!show) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
          },
          animatedStyle,
        ]}
      >
        <AutocompletePanel>{rows}</AutocompletePanel>
      </Animated.View>
    </View>
  );
});
