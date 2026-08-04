import { memo, useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  InlineAutocomplete,
  InlineAutocompleteEmpty,
} from '@/components/autocomplete/inline-autocomplete';
import type { AutocompleteSession } from '@/lib/autocomplete/types';
import { tokens } from '@/theme';

type AutocompleteOverlayProps = {
  session: AutocompleteSession | null;
  chromeBottomInset?: number;
  onSelect: (index: number) => void;
  onInteractionStart?: () => void;
};

type DockPanelProps = {
  session: AutocompleteSession;
  loading: boolean;
  suggestions: AutocompleteSession['suggestions'];
  onSelect: (index: number) => void;
  onInteractionStart?: () => void;
  paddingBottom: number;
};

function DockPanel({
  session,
  loading,
  suggestions,
  onSelect,
  onInteractionStart,
  paddingBottom,
}: DockPanelProps) {
  return (
    <View
      onTouchStart={onInteractionStart}
      pointerEvents="box-none"
      style={{
        paddingHorizontal: tokens.space.screenX,
        paddingBottom,
      }}
    >
      {/* auto — only the panel itself captures presses */}
      <View pointerEvents="auto">
        <InlineAutocomplete
          items={suggestions}
          query={session.query}
          highlightedIndex={session.highlightedIndex}
          visible
          loading={loading}
          variant="keyboardDock"
          emptyState={<InlineAutocompleteEmpty />}
          onSelect={onSelect}
        />
      </View>
    </View>
  );
}

/**
 * Keyboard-docked suggestions.
 *
 * iOS: FullWindowOverlay so the dock paints above formSheet/pageSheet, with
 * box-none pass-through so the form stays tappable.
 * Android: KeyboardStickyView in the normal hierarchy (no form-sheet window).
 */
export const AutocompleteOverlay = memo(function AutocompleteOverlay({
  session,
  chromeBottomInset = 0,
  onSelect,
  onInteractionStart,
}: AutocompleteOverlayProps) {
  const insets = useSafeAreaInsets();
  const suggestions = session?.visible ? session.suggestions : [];
  const loading = session?.status === 'loading';
  const show = Boolean(session?.visible && session);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const bottomPad = useMemo(() => {
    if (keyboardHeight > 0) {
      return keyboardHeight + Math.max(chromeBottomInset, tokens.space.micro);
    }
    return Math.max(insets.bottom, tokens.space.inline) + chromeBottomInset;
  }, [chromeBottomInset, insets.bottom, keyboardHeight]);

  if (!show || !session) return null;

  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              // Keep the host only as tall as the dock + keyboard band so we
              // don't rely solely on hit-testing quirks of a full-screen layer.
              paddingBottom: 0,
            }}
          >
            <DockPanel
              session={session}
              loading={loading}
              suggestions={suggestions}
              onSelect={onSelect}
              onInteractionStart={onInteractionStart}
              paddingBottom={bottomPad}
            />
          </View>
        </View>
      </FullWindowOverlay>
    );
  }

  return (
    <KeyboardStickyView
      enabled
      offset={{ closed: 0, opened: 0 }}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      <DockPanel
        session={session}
        loading={loading}
        suggestions={suggestions}
        onSelect={onSelect}
        onInteractionStart={onInteractionStart}
        paddingBottom={Math.max(chromeBottomInset, tokens.space.micro)}
      />
    </KeyboardStickyView>
  );
});
