import { memo, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { KeyboardStickyView, useKeyboardState } from 'react-native-keyboard-controller';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AutocompleteDock } from '@/components/autocomplete/autocomplete-dock';
import {
  InlineAutocomplete,
  InlineAutocompleteEmpty,
} from '@/components/autocomplete/inline-autocomplete';
import type { AutocompleteSession } from '@/lib/autocomplete/types';
import { spacing, tokens } from '@/theme';

type AutocompleteOverlayProps = {
  session: AutocompleteSession | null;
  chromeBottomInset?: number;
  onSelect: (index: number) => void;
  onInteractionStart?: () => void;
  onDockHeight?: (height: number) => void;
};

type DockPanelProps = {
  session: AutocompleteSession;
  loading: boolean;
  suggestions: AutocompleteSession['suggestions'];
  onSelect: (index: number) => void;
  onInteractionStart?: () => void;
  paddingBottom: number;
  onContentHeight: (height: number) => void;
};

function reportHeight(
  event: LayoutChangeEvent,
  onContentHeight: (height: number) => void,
) {
  onContentHeight(Math.round(event.nativeEvent.layout.height));
}

function ListDockPanel({
  session,
  loading,
  suggestions,
  onSelect,
  onInteractionStart,
  paddingBottom,
  onContentHeight,
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
      <View pointerEvents="auto" onLayout={(event) => reportHeight(event, onContentHeight)}>
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

function ChipDockPanel({
  session,
  suggestions,
  onSelect,
  onInteractionStart,
  paddingBottom,
  onContentHeight,
}: Omit<DockPanelProps, 'loading'>) {
  if (suggestions.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={{ paddingBottom }}>
      <View pointerEvents="auto" onLayout={(event) => reportHeight(event, onContentHeight)}>
        <AutocompleteDock
          suggestions={suggestions}
          query={session.query}
          onSelect={onSelect}
          onInteractionStart={onInteractionStart}
        />
      </View>
    </View>
  );
}

/**
 * Keyboard-docked suggestions. Not in the form layout.
 *
 * iOS: FullWindowOverlay so the bar paints above formSheet.
 * `KeyboardExtender` / `InputAccessoryView` crash or vanish with KeyboardProvider
 * + formSheet — do not use them here.
 * Android: KeyboardStickyView.
 */
export const AutocompleteOverlay = memo(function AutocompleteOverlay({
  session,
  chromeBottomInset = 0,
  onSelect,
  onInteractionStart,
  onDockHeight,
}: AutocompleteOverlayProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardState((state) => state.height);
  const chips = session?.config.presentation !== 'list';
  const suggestions = session?.visible ? session.suggestions : [];
  const loading = session?.status === 'loading';
  const show = Boolean(
    session?.visible && session && (chips ? suggestions.length > 0 : true),
  );

  useEffect(() => {
    if (!show) {
      onDockHeight?.(0);
      return;
    }
    onDockHeight?.(
      chips ? tokens.autocomplete.dockHeight : tokens.autocomplete.dockHeight * 2,
    );
  }, [chips, onDockHeight, show]);

  const handleContentHeight = useCallback(
    (height: number) => {
      if (show) onDockHeight?.(height);
    },
    [onDockHeight, show],
  );

  const bottomPad = useMemo(() => {
    if (keyboardHeight > 0) {
      const lift = chips && Platform.OS === 'ios' ? spacing[2] : 0;
      return keyboardHeight + lift + Math.max(chromeBottomInset, tokens.space.micro);
    }
    return Math.max(insets.bottom, tokens.space.inline) + chromeBottomInset;
  }, [chips, chromeBottomInset, insets.bottom, keyboardHeight]);

  if (!show || !session) return null;

  const panel: ReactNode = chips ? (
    <ChipDockPanel
      session={session}
      suggestions={suggestions}
      onSelect={onSelect}
      onInteractionStart={onInteractionStart}
      paddingBottom={bottomPad}
      onContentHeight={handleContentHeight}
    />
  ) : (
    <ListDockPanel
      session={session}
      loading={loading}
      suggestions={suggestions}
      onSelect={onSelect}
      onInteractionStart={onInteractionStart}
      paddingBottom={bottomPad}
      onContentHeight={handleContentHeight}
    />
  );

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
            }}
          >
            {panel}
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
      {chips ? (
        <ChipDockPanel
          session={session}
          suggestions={suggestions}
          onSelect={onSelect}
          onInteractionStart={onInteractionStart}
          paddingBottom={Math.max(chromeBottomInset, tokens.space.micro)}
          onContentHeight={handleContentHeight}
        />
      ) : (
        <ListDockPanel
          session={session}
          loading={loading}
          suggestions={suggestions}
          onSelect={onSelect}
          onInteractionStart={onInteractionStart}
          paddingBottom={Math.max(chromeBottomInset, tokens.space.micro)}
          onContentHeight={handleContentHeight}
        />
      )}
    </KeyboardStickyView>
  );
});
