import { useRef } from 'react';
import { Keyboard, TextInput, View } from 'react-native';

import { SearchInput, SegmentedControl, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm, spacing } from '@/theme';

import type { EngineListHeader } from './engines-list.types';
import { eng } from '../layout';

/**
 * The large title, search and filters, in React Native.
 *
 * Two callers. The React Native list draws it as its header row, so it scrolls
 * away with the engines. The screen draws it above the loading state, where
 * there is no list yet. Empty catalogs stay inside the list so search and
 * the lane control never swap to a different chrome.
 *
 * The iOS list draws its own SwiftUI equivalent instead; this stays the
 * reference for what the block contains.
 */
export function EnginesHeaderBlock({ header }: { header: EngineListHeader }) {
  const { colors } = useTheme();
  const searchRef = useRef<TextInput>(null);

  return (
    <View style={{ paddingTop: header.topInset }}>
      <View style={{ paddingHorizontal: rhythm.pad, paddingTop: rhythm.headerTop, gap: 2 }}>
        <Text
          variant="displayTitle"
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={{ color: colors.foreground }}
        >
          {header.title}
        </Text>
        <Text variant="subheadline" color="muted" numberOfLines={1}>
          {header.subtitle}
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: rhythm.pad,
          paddingTop: spacing[3],
          paddingBottom: spacing[2.5],
          gap: eng.stack,
        }}
      >
        <SearchInput
          ref={searchRef}
          value={header.query}
          onChangeText={header.onQueryChange}
          onClear={() => header.onQueryChange('')}
          onSubmitEditing={() => searchRef.current?.blur()}
          placeholder={header.searchPlaceholder}
          accessibilityLabel="Search engines"
        />
        {header.lanes ? (
          <SegmentedControl
            accessibilityLabel="Engine list"
            segments={header.lanes}
            value={header.lane}
            onValueChange={(next) => {
              Keyboard.dismiss();
              header.onLaneChange(next);
            }}
          />
        ) : null}
        {header.qualities ? (
          <SegmentedControl
            accessibilityLabel="Filter by quality"
            segments={header.qualities}
            value={header.quality}
            onValueChange={(next) => {
              Keyboard.dismiss();
              header.onQualityChange(next);
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
