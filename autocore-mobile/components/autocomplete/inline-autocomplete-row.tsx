import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { AUTOCOMPLETE_ROW_HEIGHT } from '@/lib/autocomplete/constants';
import { formatAutocompleteOption } from '@/lib/autocomplete/format-option';
import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { haptics } from '@/theme';

import { HighlightedText } from './highlighted-text';

type InlineAutocompleteRowProps = {
  option: AutocompleteOption;
  query: string;
  highlighted: boolean;
  isLast?: boolean;
  onPress: () => void;
};

/** Compact QuickType row — title + optional one-line subtitle. */
export const InlineAutocompleteRow = memo(function InlineAutocompleteRow({
  option,
  query,
  highlighted,
  isLast = false,
  onPress,
}: InlineAutocompleteRowProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);
  const { primary, secondary } = formatAutocompleteOption(option);

  const title = option.meta?.title?.trim() || primary;
  const subtitle =
    option.meta?.generation?.trim() ||
    option.meta?.manufacturer?.trim() ||
    (secondary !== primary ? secondary : '') ||
    '';
  const highlightBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <>
      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: highlighted }}
          onPressIn={() => {
            scale.value = withSpring(0.98, { damping: 18, stiffness: 420 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 16, stiffness: 320 });
          }}
          onPress={() => {
            haptics.selection();
            onPress();
          }}
          style={({ pressed }) => ({
            height: AUTOCOMPLETE_ROW_HEIGHT,
            justifyContent: 'center',
            paddingHorizontal: 14,
            backgroundColor: highlighted || pressed ? highlightBg : 'transparent',
          })}
        >
          <View style={styles.copy}>
            <HighlightedText
              text={title}
              query={query}
              ranges={option.meta?.matchRanges}
              numberOfLines={1}
              style={{
                fontSize: 15,
                lineHeight: 20,
                fontWeight: '500',
                letterSpacing: -0.2,
                color: colors.foreground,
              }}
              highlightStyle={{
                color: colors.primary,
                fontWeight: '700',
              }}
            />
            {subtitle ? (
              <Text
                variant="caption"
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  lineHeight: 15,
                  color: colors.mutedForeground,
                  marginTop: 1,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
      {!isLast ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            marginLeft: 14,
            backgroundColor: colors.borderMuted,
          }}
        />
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
});
