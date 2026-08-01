import { memo, useEffect, useMemo, useState } from 'react';
import { Dimensions, Keyboard, StyleSheet, View } from 'react-native';
import { OverKeyboardView } from 'react-native-keyboard-controller';

import { InlineAutocomplete } from '@/components/autocomplete/inline-autocomplete';
import {
  AUTOCOMPLETE_ROW_HEIGHT,
  AUTOCOMPLETE_VISIBLE_ROWS,
} from '@/lib/autocomplete/constants';
import type { AutocompleteSession } from '@/lib/autocomplete/types';

type AutocompleteOverlayProps = {
  session: AutocompleteSession | null;
  chromeBottomInset?: number;
  onSelect: (index: number) => void;
  onInteractionStart?: () => void;
};

/** Distance between the field and its suggestion panel. */
const ANCHOR_GAP = 6;
const EDGE_INSET = 8;

/**
 * Hosts the suggestion panel directly under the focused field — the same
 * anchored behaviour as the web autocomplete, instead of a bar parked at the
 * bottom of the screen. Flips above the field when the keyboard would cover it.
 */
export const AutocompleteOverlay = memo(function AutocompleteOverlay({
  session,
  onSelect,
  onInteractionStart,
}: AutocompleteOverlayProps) {
  const suggestions = session?.visible ? session.suggestions : [];
  const show = Boolean(session?.visible && suggestions.length > 0);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);

  useEffect(() => {
    const onShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardTop(event.endCoordinates.screenY);
    });
    const onHide = Keyboard.addListener('keyboardDidHide', () => setKeyboardTop(null));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const placement = useMemo(() => {
    const anchor = session?.anchor;
    if (!anchor) return null;

    const window = Dimensions.get('window');
    const rows = Math.min(suggestions.length, AUTOCOMPLETE_VISIBLE_ROWS);
    const panelHeight = Math.max(rows, 1) * AUTOCOMPLETE_ROW_HEIGHT;
    const floor = keyboardTop ?? window.height;

    const below = anchor.y + anchor.height + ANCHOR_GAP;
    const spaceBelow = floor - below - EDGE_INSET;
    const spaceAbove = anchor.y - ANCHOR_GAP - EDGE_INSET;

    // Prefer hanging below the field; flip only when it genuinely doesn't fit.
    const flip =
      spaceBelow < Math.min(panelHeight, AUTOCOMPLETE_ROW_HEIGHT * 2) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(AUTOCOMPLETE_ROW_HEIGHT, flip ? spaceAbove : spaceBelow);

    return {
      left: Math.max(EDGE_INSET, anchor.x),
      width: Math.min(anchor.width, window.width - EDGE_INSET * 2),
      top: flip
        ? Math.max(EDGE_INSET, anchor.y - ANCHOR_GAP - Math.min(panelHeight, maxHeight))
        : below,
      maxHeight,
    };
  }, [keyboardTop, session?.anchor, suggestions.length]);

  return (
    <OverKeyboardView visible={show}>
      {show && session && placement ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View
            onTouchStart={onInteractionStart}
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: placement.top,
              left: placement.left,
              width: placement.width,
              maxHeight: placement.maxHeight,
            }}
          >
            <InlineAutocomplete
              items={suggestions}
              query={session.query}
              highlightedIndex={session.highlightedIndex}
              visible={show}
              onSelect={onSelect}
            />
          </View>
        </View>
      ) : null}
    </OverKeyboardView>
  );
});
