import { memo } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks/use-theme';
import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { autocompleteGlass } from '@/theme/autocomplete';
import { withAlpha } from '@/theme/color-utils';
import { spacing } from '@/theme/spacing';
import { tokens } from '@/theme/tokens';

import { AutocompleteChip } from './autocomplete-chip';

type AutocompleteDockProps = {
  suggestions: AutocompleteOption[];
  query: string;
  onSelect: (index: number) => void;
  onInteractionStart?: () => void;
};

function ChipStrip({ suggestions, onSelect }: Omit<AutocompleteDockProps, 'onInteractionStart'>) {
  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {suggestions.map((option, index) => (
        // Keyed by the suggestion itself, never by the query. With the query in
        // the key every keystroke unmounted and remounted the whole strip, so
        // the outgoing chips animated out over the incoming ones and the row
        // rendered doubled. Sources dedupe through `uniqueAutocompleteOptions`,
        // so a lowercased value is unique within a list.
        <AutocompleteChip
          key={option.value.toLowerCase()}
          option={option}
          index={index}
          onPress={() => onSelect(index)}
        />
      ))}
    </ScrollView>
  );
}

/** Frosts overflowing chips at the trailing edge — not a solid colour smear. */
function RightEdgeBlur() {
  const { colors, scheme, isDark } = useTheme();
  const glass = autocompleteGlass(colors, scheme);

  return (
    <View pointerEvents="none" style={styles.fade}>
      <BlurView
        intensity={glass.blurIntensity}
        tint={glass.blurTint}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(colors.background, 0), withAlpha(colors.background, isDark ? 0.55 : 0.4)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * QuickType suggestion dock.
 *
 * iOS: floating glass chips, no bar. Android: solid keyboard-flush strip.
 * Mounted by AutocompleteOverlay so the form body never shifts.
 */
export const AutocompleteDock = memo(function AutocompleteDock({
  suggestions,
  query,
  onSelect,
  onInteractionStart,
}: AutocompleteDockProps) {
  const { colors, scheme } = useTheme();
  const glass = autocompleteGlass(colors, scheme);

  if (Platform.OS === 'ios') {
    return (
      <View onTouchStart={onInteractionStart} style={styles.iosWrap}>
        <ChipStrip suggestions={suggestions} query={query} onSelect={onSelect} />
        <RightEdgeBlur />
      </View>
    );
  }

  return (
    <View
      onTouchStart={onInteractionStart}
      style={{
        backgroundColor: colors.surfaceElevated,
        borderTopWidth: glass.hairline,
        borderTopColor: glass.hairlineColor,
        minHeight: tokens.autocomplete.dockHeight,
        justifyContent: 'center',
        paddingVertical: tokens.space.micro,
      }}
    >
      <ChipStrip suggestions={suggestions} query={query} onSelect={onSelect} />
    </View>
  );
});

const styles = StyleSheet.create({
  iosWrap: {
    backgroundColor: 'transparent',
  },
  strip: {
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    paddingRight: spacing[8],
  },
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: tokens.autocomplete.fadeWidth,
    overflow: 'hidden',
  },
});
